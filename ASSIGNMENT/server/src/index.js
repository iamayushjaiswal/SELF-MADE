import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import buyerRoutes from './routes/buyers.js';
import campaignRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import { isGmailConfigured } from './services/emailService.js';
import cron from 'node-cron';
import { syncGmailResponses } from './services/gmailSyncService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads')); // NEW: Serve uploaded files

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API Export server is running',
    gmailConfigured: isGmailConfigured(),
    hunterConfigured: Boolean(process.env.HUNTER_API_KEY),
    genaiConfigured: Boolean(process.env.GENAI_API_KEY),
  });
});

app.use('/api/buyers', buyerRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/api-export';
  await mongoose.connect(uri);
  console.log('MongoDB connected');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled Gmail sync...');
    const result = await syncGmailResponses();
    console.log('Gmail sync result:', result.message);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
