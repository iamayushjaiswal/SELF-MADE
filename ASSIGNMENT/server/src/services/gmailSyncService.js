import { google } from 'googleapis';
import Buyer from '../models/Buyer.js';
import { logActivity } from './activityService.js';

function extractEmailAddress(fromHeader) {
  if (!fromHeader) return null;
  // Matches <email@domain.com> or email@domain.com
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  return fromHeader.toLowerCase().trim();
}

export async function syncGmailResponses() {
  if (
    !process.env.GOOGLE_USER ||
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return { success: false, message: 'OAuth credentials not fully configured in .env' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Look for recent messages in inbox (last 3 days to be safe)
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox newer_than:3d',
      maxResults: 100,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      return { success: true, count: 0, message: 'No recent messages found in inbox.' };
    }

    let updatedCount = 0;
    const processedEmails = new Set();

    for (const msg of messages) {
      const msgDetails = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From'],
      });

      const headers = msgDetails.data.payload.headers;
      const fromHeader = headers.find((h) => h.name === 'From');
      
      if (!fromHeader) continue;
      
      const senderEmail = extractEmailAddress(fromHeader.value);
      if (!senderEmail || processedEmails.has(senderEmail)) continue;
      
      processedEmails.add(senderEmail);

      // Check if this sender is one of our buyers
      const buyer = await Buyer.findOne({ email: senderEmail });
      if (buyer && (buyer.outreachStatus === 'contacted' || buyer.outreachStatus === 'follow-up')) {
        buyer.outreachStatus = 'responded';
        await buyer.save();
        updatedCount++;
        await logActivity('buyer_responded', `Automatically tracked reply from ${senderEmail}`, {}, 'buyer', buyer._id);
      }
    }

    return { 
      success: true, 
      count: updatedCount, 
      message: `Checked ${messages.length} recent threads. Found ${updatedCount} new replies.` 
    };

  } catch (err) {
    console.error('Gmail Sync Error:', err.message);
    if (err.message.includes('has not been used in project')) {
      return { 
        success: false, 
        message: 'Gmail API is not enabled in your Google Cloud Project. Please click the link in your console error to enable it.' 
      };
    }
    return { success: false, message: `Failed to sync: ${err.message}` };
  }
}
