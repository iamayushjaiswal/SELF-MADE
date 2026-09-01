import express from 'express';
import multer from 'multer';
import Campaign from '../models/Campaign.js';
import Buyer from '../models/Buyer.js';
import EmailLog from '../models/EmailLog.js';
import { sendEmail, isGmailConfigured } from '../services/emailService.js';
import { logActivity } from '../services/activityService.js';
import { personalizeTemplate, bodyToHtml } from '../services/templateService.js';
import { getDefaultTemplate } from '../config/defaultOutreach.js';

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

function eligibleBuyerFilter(extra = {}, { strictValidation = true } = {}) {
  const filter = {
    isDuplicate: false,
    email: { $ne: '' },
    outreachStatus: { $in: ['new', 'queued', 'follow-up'] },
    ...extra,
  };

  if (strictValidation) {
    filter.emailStatus = { $in: ['mx-valid', 'valid', 'unknown', 'risky'] };
  }

  return filter;
}

async function sendToBuyer(buyer, subject, body, campaign = null) {
  const personalizedSubject = personalizeTemplate(subject, buyer);
  const personalizedBody = personalizeTemplate(body, buyer);

  const sent = await sendEmail({
    to: buyer.email,
    subject: personalizedSubject,
    html: bodyToHtml(personalizedBody),
    attachmentPaths: campaign ? campaign.attachmentPaths : [],
    senderName: campaign ? campaign.senderName : 'API Export Outreach',
  });

  await EmailLog.create({
    buyer: buyer._id,
    campaign: campaign ? campaign._id : null,
    subject: personalizedSubject,
    body: personalizedBody,
    status: 'sent',
  });

  buyer.outreachStatus = 'contacted';
  await buyer.save();

  return { buyerId: buyer._id, email: buyer.email, status: 'sent', messageId: sent.messageId };
}

router.get('/default-template', (_req, res) => {
  res.json({ success: true, data: getDefaultTemplate() });
});

router.get('/', async (_req, res) => {
  try {
    // Auto-fix any campaigns stuck in 'sending' state
    await Campaign.updateMany({ status: 'sending' }, { status: 'paused' });
    
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const campaignData = { ...req.body };
    if (req.files && req.files.length > 0) {
      campaignData.attachmentPaths = req.files.map(f => f.path);
    }
    
    // Parse JSON arrays since FormData sends them as strings
    if (typeof campaignData.targetCountries === 'string') {
      try {
        campaignData.targetCountries = JSON.parse(campaignData.targetCountries);
      } catch (e) {
        campaignData.targetCountries = campaignData.targetCountries.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (typeof campaignData.targetCategories === 'string') {
      try {
        campaignData.targetCategories = JSON.parse(campaignData.targetCategories);
      } catch (e) {
        campaignData.targetCategories = campaignData.targetCategories.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const campaign = await Campaign.create(campaignData);
    await logActivity('campaign_created', campaign.name, {}, 'campaign', campaign._id);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    if (!isGmailConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not configured. Add GOOGLE_* OAuth vars or GMAIL credentials in server/.env',
      });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const filter = {
      isDuplicate: false,
      email: { $ne: '' },
      emailStatus: { $in: ['mx-valid', 'valid', 'unknown'] },
      outreachStatus: { $in: ['new', 'queued', 'follow-up'] },
    };

    if (campaign.targetCountries?.length) {
      filter.country = { $in: campaign.targetCountries.map(c => new RegExp(`^${c}$`, 'i')) };
    }
    if (campaign.targetCategories?.length) {
      filter.category = { $in: campaign.targetCategories.map(c => new RegExp(`^${c}$`, 'i')) };
    }

    const buyerIds = req.body.buyerIds;
    const buyers = buyerIds?.length
      ? await Buyer.find({ _id: { $in: buyerIds }, ...filter })
      : await Buyer.find(filter).limit(req.body.limit || 5);

    if (!buyers.length) {
      return res.status(400).json({ success: false, message: 'No eligible buyers to contact' });
    }

    campaign.status = 'sending';
    await campaign.save();

    const results = [];

    for (const buyer of buyers) {
      try {
        const result = await sendToBuyer(buyer, campaign.subject, campaign.body, campaign);
        campaign.sentCount += 1;
        results.push(result);
      } catch (err) {
        campaign.failedCount += 1;
        await EmailLog.create({
          buyer: buyer._id,
          campaign: campaign._id,
          subject: campaign.subject,
          body: campaign.body,
          status: 'failed',
          responseNotes: err.message,
        });
        results.push({ buyerId: buyer._id, email: buyer.email, status: 'failed', error: err.message });
      }
    }

    campaign.status = 'sent';
    await campaign.save();
    await logActivity('campaign_sent', `${campaign.name}: ${results.filter((r) => r.status === 'sent').length} sent`, {}, 'campaign', campaign._id);

    res.json({
      success: true,
      data: { campaign, results },
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auto-send', async (req, res) => {
  try {
    if (!isGmailConfigured()) {
      return res.status(400).json({ success: false, message: 'Gmail not configured' });
    }

    const defaults = getDefaultTemplate();
    const subject = req.body.subject || defaults.subject;
    const body = req.body.body || defaults.body;
    const limit = req.body.limit || 10;
    const buyerIds = req.body.buyerIds;

    const buyers = buyerIds?.length
      ? await Buyer.find({
          _id: { $in: buyerIds },
          isDuplicate: false,
          email: { $ne: '' },
          outreachStatus: { $in: ['new', 'queued', 'follow-up'] },
        })
      : await Buyer.find(eligibleBuyerFilter()).limit(limit);

    if (!buyers.length) {
      return res.status(400).json({ success: false, message: 'No new buyers to email' });
    }

    const results = [];
    for (const buyer of buyers) {
      try {
        results.push(await sendToBuyer(buyer, subject, body));
      } catch (err) {
        results.push({ buyerId: buyer._id, email: buyer.email, status: 'failed', error: err.message });
      }
    }

    await logActivity('auto_outreach', `Auto-sent ${results.filter((r) => r.status === 'sent').length} emails`);

    res.json({
      success: true,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/send-single', async (req, res) => {
  try {
    if (!isGmailConfigured()) {
      return res.status(400).json({ success: false, message: 'Gmail not configured' });
    }

    const defaults = getDefaultTemplate();
    const { buyerId, subject = defaults.subject, body = defaults.body } = req.body;
    const buyer = await Buyer.findById(buyerId);
    if (!buyer?.email) return res.status(404).json({ success: false, message: 'Buyer with email not found' });

    const result = await sendToBuyer(buyer, subject, body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/export/sheets', async (req, res) => {
  try {
    const logs = await EmailLog.find({ campaign: req.params.id }).populate('buyer');
    const buyers = logs.map(log => log.buyer).filter(Boolean);

    const header = ['DATE', 'NAME OF THE COMPANY', 'EMAIL ADDRESS', 'WEBSITE LINK', 'RESPONSES', 'INTERN\'S FEEDBACK', 'FOLLOW UP', 'TYPE'];
    const rows = logs.filter(log => log.buyer).map(log => {
      const b = log.buyer;
      
      let dateStr = '';
      if (log.createdAt) {
        const d = new Date(log.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        dateStr = `${day}/${month}/${year}`;
      }
      
      let website = b.website || '';
      if (website) {
        website = website.startsWith('http') ? website : `https://${website}`;
      }
      
      let response = '';
      if (b.outreachStatus) {
        response = b.outreachStatus.charAt(0).toUpperCase() + b.outreachStatus.slice(1);
      }

      return [
        dateStr,
        b.companyName || '',
        b.email || '',
        website,
        response,
        '', 
        '',
        b.category || '',
      ].join('\t');
    });

    const tsvContent = [header.join('\t'), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/tab-separated-values');
    res.send(tsvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const campaignData = { ...req.body };
    if (req.files && req.files.length > 0) {
      campaignData.attachmentPaths = req.files.map(f => f.path);
    }
    
    // Parse JSON arrays since FormData sends them as strings
    if (typeof campaignData.targetCountries === 'string') {
      try {
        campaignData.targetCountries = JSON.parse(campaignData.targetCountries);
      } catch (e) {
        campaignData.targetCountries = campaignData.targetCountries.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (typeof campaignData.targetCategories === 'string') {
      try {
        campaignData.targetCategories = JSON.parse(campaignData.targetCategories);
      } catch (e) {
        campaignData.targetCategories = campaignData.targetCategories.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const campaign = await Campaign.findByIdAndUpdate(req.params.id, campaignData, { new: true });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
