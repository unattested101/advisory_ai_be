const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'config', 'action-items.json');

/**
 * Read all action-item records from disk
 */
function readAll() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Write all action-item records to disk
 */
function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const ACTION_ITEM_DEADLINE_HOURS = 48;

/**
 * Save action items for a completed meeting
 * @param {string} clientId
 * @param {string} botId
 * @param {Array<{text: string, assignee?: string}>} items
 */
function saveMeetingActions(clientId, botId, items) {
  const all = readAll();
  const now = new Date();

  const meeting = {
    id: `meeting-${crypto.randomUUID()}`,
    clientId,
    botId,
    meetingDate: now.toISOString(),
    actionItems: items.map(item => {
      const dueDate = new Date(now.getTime() + ACTION_ITEM_DEADLINE_HOURS * 60 * 60 * 1000);
      return {
        id: `item-${crypto.randomUUID()}`,
        text: item.text,
        assignee: item.assignee || null,
        done: false,
        dueDate: dueDate.toISOString()
      };
    })
  };

  all.push(meeting);
  writeAll(all);
  console.log(`Saved ${items.length} action items for client ${clientId} (meeting ${meeting.id})`);
  return meeting;
}

/**
 * Get all meetings + action items for a specific client
 * @param {string} clientId
 */
function getClientActions(clientId) {
  const all = readAll();
  return all.filter(m => m.clientId === clientId);
}

/**
 * Toggle the done status of a single action item
 * @param {string} meetingId
 * @param {string} itemId
 * @returns {object|null} The updated item, or null if not found
 */
function toggleActionItem(meetingId, itemId) {
  const all = readAll();
  const meeting = all.find(m => m.id === meetingId);
  if (!meeting) return null;

  const item = meeting.actionItems.find(i => i.id === itemId);
  if (!item) return null;

  item.done = !item.done;
  writeAll(all);
  return item;
}

/**
 * Get all pending (not done) action items across every client,
 * enriched with clientId, clientName, meetingId, and meetingDate.
 * Sorted by dueDate ascending (most urgent first).
 * @param {Array<{id: string, name: string}>} clientsList - client lookup
 */
function getUpcomingActions(clientsList) {
  const all = readAll();
  const clientMap = {};
  for (const c of clientsList) {
    clientMap[c.id] = c.name;
  }

  const items = [];
  for (const meeting of all) {
    for (const item of meeting.actionItems) {
      if (!item.done) {
        items.push({
          ...item,
          clientId: meeting.clientId,
          clientName: clientMap[meeting.clientId] || 'Unknown',
          meetingId: meeting.id,
          meetingDate: meeting.meetingDate
        });
      }
    }
  }

  // Sort by dueDate ascending (nearest deadline first)
  items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return items;
}

module.exports = {
  saveMeetingActions,
  getClientActions,
  toggleActionItem,
  getUpcomingActions
};
