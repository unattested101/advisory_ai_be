const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Build a polished HTML email for a news impact advisory.
 */
function buildImpactEmailHtml({
  clientName,
  newsArticle,
  impact,
  actionItem,
  relatedHoldings,
  relatedGoal,
}) {
  const categoryColors = {
    equities: { bg: "#e0f2fe", text: "#0369a1", label: "Equities" },
    property: { bg: "#ede9fe", text: "#6d28d9", label: "Property" },
    bonds: { bg: "#fef3c7", text: "#92400e", label: "Bonds" },
    interest_rates: { bg: "#d1fae5", text: "#065f46", label: "Interest Rates" },
  };

  const cat = categoryColors[newsArticle.category] || {
    bg: "#f3f4f6",
    text: "#374151",
    label: newsArticle.category,
  };

  const holdingsHtml =
    relatedHoldings && relatedHoldings.length > 0
      ? `<p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">
        <strong style="color:#4b5563;">Related Holdings:</strong> ${relatedHoldings.join(", ")}
      </p>`
      : "";

  const goalHtml = relatedGoal
    ? `<p style="margin:0;font-size:13px;color:#6b7280;">
        <strong style="color:#4b5563;">Related Goal:</strong> ${relatedGoal}
      </p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background-color:#1f2937;padding:24px 32px;border-radius:12px 12px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Advisory AI</h1>
                <p style="margin:4px 0 0 0;font-size:13px;color:#9ca3af;">Personalised Market Intelligence</p>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;background-color:${cat.bg};color:${cat.text};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${cat.label}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:0;">

          <!-- Greeting -->
          <div style="padding:28px 32px 0 32px;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${clientName}</strong>,</p>
            <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              We have identified a market development that is relevant to your financial position. Please review the details below.
            </p>
          </div>

          <!-- News Article Card -->
          <div style="margin:24px 32px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
            <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${cat.text};">${cat.label}</p>
            <h2 style="margin:0 0 10px 0;font-size:17px;font-weight:700;color:#111827;line-height:1.4;">${newsArticle.headline}</h2>
            <p style="margin:0 0 12px 0;font-size:14px;color:#4b5563;line-height:1.6;">${newsArticle.summary}</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">${newsArticle.source} &bull; ${newsArticle.date}</p>
          </div>

          <!-- Impact Section -->
          <div style="margin:0 32px 24px 32px;">
            <h3 style="margin:0 0 12px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">How This Affects You</h3>
            <div style="background-color:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;">
              <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">${impact}</p>
            </div>
          </div>

          <!-- Related Details -->
          ${
            holdingsHtml || goalHtml
              ? `
          <div style="margin:0 32px 24px 32px;padding:14px 16px;background-color:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
            ${holdingsHtml}
            ${goalHtml}
          </div>
          `
              : ""
          }

          <!-- Book a Meeting Banner -->
          <div style="margin:0 32px 28px 32px;background-color:#1f2937;border-radius:10px;padding:28px 24px;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:18px;font-weight:700;color:#ffffff;">This Needs Your Attention</p>
            <p style="margin:0 0 20px 0;font-size:14px;color:#d1d5db;line-height:1.5;">
              Based on this market development, we recommend discussing your portfolio with your advisor as soon as possible.
            </p>
            <a href="mailto:work.annarana@gmail.com?subject=Book%20Advisory%20Meeting%20-%20${encodeURIComponent(newsArticle.headline)}&body=Hi%2C%0A%0AI%20received%20your%20advisory%20update%20and%20would%20like%20to%20book%20a%20meeting%20to%20discuss%20the%20impact%20on%20my%20portfolio.%0A%0ARegards%2C%0A${encodeURIComponent(clientName)}"
               style="display:inline-block;background-color:#ffffff;color:#1f2937;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:-0.2px;">
              Book a Meeting Now
            </a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;line-height:1.5;">
            This communication is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results. Always consult with your financial advisor before making investment decisions.
          </p>
          <p style="margin:0;font-size:11px;color:#d1d5db;">
            &copy; ${new Date().getFullYear()} Advisory AI &bull; Powered by AI-driven market analysis
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send a news impact email to a client.
 * For now, all emails are sent to the hardcoded test address.
 */
async function sendImpactEmail(
  recipientEmail,
  clientName,
  newsArticle,
  impactData,
) {
  const { impact, actionItem, relatedHoldings, relatedGoal } = impactData;

  const html = buildImpactEmailHtml({
    clientName,
    newsArticle,
    impact,
    actionItem,
    relatedHoldings: relatedHoldings || [],
    relatedGoal: relatedGoal || null,
  });

  // Truncate headline for subject line
  const shortHeadline =
    newsArticle.headline.length > 60
      ? newsArticle.headline.slice(0, 57) + "..."
      : newsArticle.headline;

  const mailOptions = {
    from: `"Advisory AI" <${process.env.GMAIL_USER}>`,
    to: "annarana2002@gmail.com", // Hardcoded override for now
    subject: `Advisory Update: ${shortHeadline}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Email sent to ${recipientEmail} (routed to test): ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email: " + error.message);
  }
}

/**
 * Build a polished HTML email for an action item follow-up.
 */
function buildActionItemEmailHtml({
  clientName,
  actionItemText,
  advisorMessage,
}) {
  // Convert newlines in the advisor message to <br> tags for HTML
  const messageHtml = advisorMessage.replace(/\n/g, "<br>");

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background-color:#1f2937;padding:24px 32px;border-radius:12px 12px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Advisory AI</h1>
                <p style="margin:4px 0 0 0;font-size:13px;color:#9ca3af;">Action Item Follow-Up</p>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;background-color:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Action Required</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background-color:#ffffff;padding:0;">

          <!-- Greeting -->
          <div style="padding:28px 32px 0 32px;">
            <p style="margin:0;font-size:15px;color:#374151;">Dear <strong>${clientName}</strong>,</p>
            <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              Your advisor has a follow-up regarding an action item from your recent meeting. Please review the details below.
            </p>
          </div>

          <!-- Action Item Card -->
          <div style="margin:24px 32px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #22c55e;border-radius:10px;padding:20px;">
            <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#15803d;">Action Item</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#14532d;line-height:1.5;">${actionItemText}</p>
          </div>

          <!-- Advisor Message -->
          <div style="margin:0 32px 24px 32px;">
            <h3 style="margin:0 0 12px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Message from Your Advisor</h3>
            <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${messageHtml}</p>
            </div>
          </div>

          <!-- Book a Meeting Banner -->
          <div style="margin:0 32px 28px 32px;background-color:#1f2937;border-radius:10px;padding:28px 24px;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:18px;font-weight:700;color:#ffffff;">Need to Discuss This?</p>
            <p style="margin:0 0 20px 0;font-size:14px;color:#d1d5db;line-height:1.5;">
              If you have questions or would like to discuss this action item further, book a meeting with your advisor.
            </p>
            <a href="mailto:work.annarana@gmail.com?subject=Re%3A%20Action%20Item%20-%20${encodeURIComponent(actionItemText.slice(0, 60))}&body=Hi%2C%0A%0AI%20would%20like%20to%20discuss%20this%20action%20item%20further.%0A%0ARegards%2C%0A${encodeURIComponent(clientName)}"
               style="display:inline-block;background-color:#ffffff;color:#1f2937;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:-0.2px;">
              Reply to Advisor
            </a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;line-height:1.5;">
            This communication is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results. Always consult with your financial advisor before making investment decisions.
          </p>
          <p style="margin:0;font-size:11px;color:#d1d5db;">
            &copy; ${new Date().getFullYear()} Advisory AI &bull; Powered by AI-driven market analysis
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an action item follow-up email to a client.
 */
async function sendActionItemEmail(
  recipientEmail,
  clientName,
  actionItemText,
  advisorMessage,
) {
  const html = buildActionItemEmailHtml({
    clientName,
    actionItemText,
    advisorMessage,
  });

  const shortAction =
    actionItemText.length > 50
      ? actionItemText.slice(0, 47) + "..."
      : actionItemText;

  const mailOptions = {
    from: `"Advisory AI" <${process.env.GMAIL_USER}>`,
    to: "annarana2002@gmail.com", // Hardcoded override for now
    subject: `Action Item Follow-Up: ${shortAction}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Action item email sent to ${recipientEmail} (routed to test): ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Action item email send error:", error);
    throw new Error("Failed to send email: " + error.message);
  }
}

module.exports = {
  sendImpactEmail,
  sendActionItemEmail,
};
