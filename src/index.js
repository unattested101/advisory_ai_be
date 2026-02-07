require('dotenv').config();

const express = require('express');
const cors = require('cors');

const botRoutes = require('./routes/bot.routes');
const webhookRoutes = require('./routes/webhook.routes');
const questionsRoutes = require('./routes/questions.routes');
const advisoryRoutes = require('./routes/advisory.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Disable strict routing to handle trailing slashes
app.set('strict routing', false);

// Middleware
app.use(cors());
app.use(express.json());

// Handle ngrok browser warning - respond to any ngrok verification requests
app.use((req, res, next) => {
  // Log incoming requests for debugging
  if (req.path.includes('/webhook')) {
    console.log(`Webhook request: ${req.method} ${req.originalUrl} from ${req.ip}`);
  }
  next();
});

// Routes
app.use('/api/bot', botRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/webhook', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
