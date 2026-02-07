# Advisory AI - Backend

## 📋 Project Name
**Advisory AI Backend** - An intelligent AI-powered financial advisory assistant

---

## 🎯 Chosen Problem

Financial advisors face significant challenges in managing client relationships efficiently:

1. **Meeting Inefficiency**: Advisors often forget to ask critical questions during client meetings, leading to incomplete information gathering and follow-up calls.

2. **Market News Overload**: Keeping track of market news and understanding how it impacts each client's unique portfolio and financial goals is time-consuming and error-prone.

3. **Action Item Management**: Post-meeting action items often get lost or forgotten, leading to poor client service and missed opportunities.

4. **Personalized Communication**: Sending timely, personalized updates to clients about market developments that affect their specific holdings requires significant manual effort.

---

## 💡 Solution Overview

Advisory AI is a comprehensive backend solution that leverages AI to transform financial advisory services:

### Core Features

1. **AI Meeting Assistant with Real-Time Transcription**
   - Integrates with Recall.ai to join video meetings (Zoom, Google Meet, etc.)
   - Provides real-time meeting transcription via Server-Sent Events (SSE)
   - Uses GPT-4 to analyze transcripts and check if important questions have been covered
   - Generates automatic meeting summaries and extracts action items

2. **Smart Question Checklist**
   - Tracks predefined questions during meetings
   - Provides real-time suggestions for uncovered topics
   - Ensures advisors gather all necessary information

3. **Personalized Market Intelligence**
   - Analyzes market news against each client's portfolio holdings and financial goals
   - Uses GPT-4 to generate personalized impact assessments
   - Automatically suggests actionable recommendations

4. **Automated Email Notifications**
   - Sends beautifully formatted HTML emails to clients about relevant market developments
   - Includes personalized impact analysis and recommended actions
   - Sends action item reminders with deadlines

5. **Action Item Management**
   - Extracts action items from meeting transcripts using AI
   - Tracks completion status with deadlines
   - Persists data for follow-up and accountability

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js 5** | Web framework for REST API |
| **OpenAI GPT-4 Turbo** | AI-powered analysis, summaries, and suggestions |
| **Recall.ai** | Meeting bot integration and real-time transcription |
| **Nodemailer** | Email delivery service (Gmail SMTP) |
| **Server-Sent Events (SSE)** | Real-time streaming of transcript updates |
| **Axios** | HTTP client for external API calls |
| **dotenv** | Environment variable management |
| **CORS** | Cross-origin resource sharing |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Recall.ai Configuration
RECALL_API_KEY=your_recall_api_key_here
RECALL_REGION=us-west-2
RECALL_WEBHOOK_SECRET=your_webhook_secret_here

# Webhook Configuration (for ngrok or production URL)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io

# Gmail SMTP Configuration
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### Environment Variable Details

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `OPENAI_API_KEY` | Your OpenAI API key for GPT-4 access | Yes |
| `RECALL_API_KEY` | API key from Recall.ai for meeting bot | Yes |
| `RECALL_REGION` | Recall.ai region (default: us-west-2) | No |
| `RECALL_WEBHOOK_SECRET` | Secret for verifying Recall.ai webhooks | No |
| `WEBHOOK_BASE_URL` | Public URL for webhook callbacks (use ngrok for local dev) | Yes |
| `GMAIL_USER` | Gmail address for sending emails | Yes |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not regular password) | Yes |

> **Note**: For Gmail, you need to enable 2FA and create an [App Password](https://support.google.com/accounts/answer/185833).

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **ngrok** (for local webhook testing)
- OpenAI API account
- Recall.ai API account
- Gmail account with App Password enabled

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/advisory_ai_be.git
   cd advisory_ai_be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up ngrok (for local development)**
   ```bash
   # Install ngrok if not already installed
   brew install ngrok  # macOS
   
   # Start ngrok tunnel
   ngrok http 3000
   ```
   
   Copy the ngrok HTTPS URL and set it as `WEBHOOK_BASE_URL` in your `.env` file.

---

## 🏃 Step-by-Step Guide to Run the Project Locally

### Step 1: Start ngrok tunnel
```bash
ngrok http 3000
```
Note the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

### Step 2: Update environment variables
Update your `.env` file with the ngrok URL:
```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### Step 3: Start the server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Step 4: Verify the server is running
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T..."
}
```

---

## 📚 API Endpoints

### Bot Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bot/invite` | Invite bot to join a meeting |
| GET | `/api/bot/:botId/status` | Get bot status |
| GET | `/api/bot/:botId/events` | SSE stream for real-time transcripts |
| GET | `/api/bot/:botId/transcript` | Get full transcript |
| POST | `/api/bot/:botId/check-questions` | Check question coverage |
| POST | `/api/bot/:botId/end-meeting` | End meeting and generate summary |

### Advisory Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/advisory/clients` | Get all clients |
| GET | `/api/advisory/clients/:id` | Get client by ID |
| GET | `/api/advisory/news` | Get all news items |
| POST | `/api/advisory/suggestions` | Generate AI suggestions for clients |
| POST | `/api/advisory/impact/:newsId` | Analyze news impact on clients |
| POST | `/api/advisory/send-impact-email` | Send impact email to client |

### Action Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/advisory/clients/:clientId/actions` | Get client's action items |
| PATCH | `/api/advisory/actions/:meetingId/items/:itemId` | Toggle action item status |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Get predefined questions |
| GET | `/api/questions/templates` | Get question templates |

### Webhooks (for Recall.ai)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook/transcript` | Receive real-time transcript data |
| POST | `/webhook/status-change` | Receive bot status changes |

---

## 📁 Project Structure

```
advisory_ai_be/
├── src/
│   ├── index.js              # Application entry point
│   ├── config/
│   │   ├── clients.json      # Mock client data
│   │   ├── news.json         # Mock news data
│   │   ├── questions.json    # Predefined meeting questions
│   │   ├── question-templates.json
│   │   └── action-items.json # Persisted action items
│   ├── routes/
│   │   ├── bot.routes.js     # Bot/meeting endpoints
│   │   ├── advisory.routes.js # Advisory service endpoints
│   │   ├── questions.routes.js
│   │   └── webhook.routes.js # Recall.ai webhook handlers
│   └── services/
│       ├── openai.service.js    # OpenAI/GPT-4 integration
│       ├── recall.service.js    # Recall.ai API integration
│       ├── email.service.js     # Email sending service
│       ├── sse.service.js       # Server-Sent Events management
│       └── actionItems.service.js # Action items persistence
├── package.json
├── .env
└── README.md
```

---

## 🧪 Testing the API

### Invite a bot to a meeting
```bash
curl -X POST http://localhost:3000/api/bot/invite \
  -H "Content-Type: application/json" \
  -d '{
    "meetingUrl": "https://meet.google.com/abc-defg-hij",
    "botName": "Advisory AI",
    "clientId": "client-001"
  }'
```

### Generate advisory suggestions
```bash
curl -X POST http://localhost:3000/api/advisory/suggestions \
  -H "Content-Type: application/json" \
  -d '{"clientId": "client-001"}'
```

### Get all clients
```bash
curl http://localhost:3000/api/advisory/clients
```

---

## 📄 License

ISC

---

## 👥 Authors

Advisory AI Team

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT-4 API
- [Recall.ai](https://recall.ai) for meeting bot infrastructure
- [Express.js](https://expressjs.com) for the web framework
