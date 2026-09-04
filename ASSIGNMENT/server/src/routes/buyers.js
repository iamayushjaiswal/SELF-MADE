import express from 'express';
import Buyer from '../models/Buyer.js';
import { Parser } from 'json2csv';
import { validateEmail } from '../services/validationService.js';
import { discoverBuyers, discoverFromSnov, classifyWithAI } from '../services/discoveryService.js';
import { logActivity } from '../services/activityService.js';
import { parseBuyerCsv, CSV_TEMPLATE } from '../services/csvImportService.js';
import { getDefaultTemplate } from '../config/defaultOutreach.js';
import { personalizeTemplate, bodyToHtml } from '../services/templateService.js';
import { sendEmail, isGmailConfigured } from '../services/emailService.js';
import EmailLog from '../models/EmailLog.js';
import { syncGmailResponses } from '../services/gmailSyncService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { country, category, status, search, source } = req.query;
    const filter = {};

    if (country) filter.country = new RegExp(country, 'i');
    if (category) filter.category = new RegExp(category, 'i');
    if (status) filter.outreachStatus = status;
    if (source) filter.source = source;
    if (search) {
      filter.$or = [
        { companyName: new RegExp(search, 'i') },
        { contactName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const buyers = await Buyer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: buyers, total: buyers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const [total, validated, contacted, responded, duplicates] = await Promise.all([
      Buyer.countDocuments(),
      Buyer.countDocuments({ emailStatus: { $in: ['valid', 'mx-valid'] } }),
      Buyer.countDocuments({ outreachStatus: 'contacted' }),
      Buyer.countDocuments({ outreachStatus: 'responded' }),
      Buyer.countDocuments({ isDuplicate: true }),
    ]);

    const byCountry = await Buyer.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const byCategory = await Buyer.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      success: true,
      data: { total, validated, contacted, responded, duplicates, byCountry, byCategory },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const existing = req.body.email
      ? await Buyer.findOne({ email: req.body.email.toLowerCase() })
      : null;

    if (existing) {
      await logActivity('duplicate_prevented', `Blocked duplicate email: ${req.body.email}`, {}, 'buyer');
      return res.status(409).json({ success: false, message: 'Buyer with this email already exists', duplicateOf: existing._id });
    }

    const aiClassification = await classifyWithAI(
      `${req.body.companyName} ${req.body.category} ${req.body.country}`,
      process.env.GENAI_API_KEY
    );

    const buyer = await Buyer.create({ ...req.body, aiClassification });
    await logActivity('buyer_created', `Added ${buyer.companyName}`, {}, 'buyer', buyer._id);
    res.status(201).json({ success: true, data: buyer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/discover', async (req, res) => {
  try {
    const { category, country, city, limit, market, domain, autoEmail = false } = req.body;
    let discovered = [];
    
    let cancelled = false;
    req.on('aborted', () => {
      cancelled = true;
    });

    if (domain && process.env.SNOV_CLIENT_ID && process.env.SNOV_CLIENT_SECRET) {
      const snovResults = await discoverFromSnov(domain, process.env.SNOV_CLIENT_ID, process.env.SNOV_CLIENT_SECRET);
      if (snovResults?.length) discovered = snovResults;
    }

    if (!discovered.length) {
      discovered = await discoverBuyers({ category, country, city, limit: Number(limit) || 10, market }, () => cancelled);
    }

    const saved = [];
    let skipped = 0;

    for (const item of discovered) {
      if (cancelled) break;
      if (item.email) {
        const exists = await Buyer.findOne({ email: item.email.toLowerCase() });
        if (exists) {
          skipped++;
          continue;
        }
      }

      const validation = item.email ? await validateEmail(item.email) : { status: 'unknown', notes: '' };
      const buyer = await Buyer.create({
        ...item,
        emailStatus: validation.status,
        validationNotes: validation.notes,
      });
      saved.push(buyer);
    }

    await logActivity('buyers_discovered', `Discovered ${saved.length} buyers (${skipped} skipped)`, {
      category,
      country,
      city,
      saved: saved.length,
      skipped,
    });

    let emailResult = null;
    if (autoEmail && saved.length && isGmailConfigured()) {
      const defaults = getDefaultTemplate();
      const results = [];

      for (const buyer of saved) {
        if (cancelled) break;
        try {
          const personalizedSubject = personalizeTemplate(defaults.subject, buyer);
          const personalizedBody = personalizeTemplate(defaults.body, buyer);
          const sent = await sendEmail({
            to: buyer.email,
            subject: personalizedSubject,
            html: bodyToHtml(personalizedBody),
          });
          await EmailLog.create({
            buyer: buyer._id,
            subject: personalizedSubject,
            body: personalizedBody,
            status: 'sent',
          });
          buyer.outreachStatus = 'contacted';
          await buyer.save();
          results.push({ buyerId: buyer._id, email: buyer.email, status: 'sent', messageId: sent.messageId });
        } catch (err) {
          results.push({ buyerId: buyer._id, email: buyer.email, status: 'failed', error: err.message });
        }
      }

      emailResult = {
        sent: results.filter((r) => r.status === 'sent').length,
        failed: results.filter((r) => r.status === 'failed').length,
        results,
      };
      await logActivity('auto_outreach', `Discover auto-email: ${emailResult.sent} sent`);
    }

    res.json({
      success: true,
      data: saved,
      saved: saved.length,
      skipped,
      emailResult,
      message: saved.length
        ? `Discovered ${saved.length} buyer(s)${emailResult ? ` · emailed ${emailResult.sent}` : ''}`
        : `No new buyers found (${skipped} duplicate(s) skipped). Try adjusting your search criteria.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = ids?.length ? { _id: { $in: ids } } : { email: { $ne: '' } };
    const buyers = await Buyer.find(filter);

    const results = [];
    for (const buyer of buyers) {
      const validation = await validateEmail(buyer.email);
      buyer.emailStatus = validation.status;
      buyer.validationNotes = validation.notes;
      await buyer.save();
      results.push({ id: buyer._id, email: buyer.email, ...validation });
    }

    await logActivity('validation_run', `Validated ${results.length} contacts`);
    res.json({ success: true, data: results, validated: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/check-duplicates', async (_req, res) => {
  try {
    const buyers = await Buyer.find().sort({ createdAt: 1 });
    const seen = new Map();
    let marked = 0;

    for (const buyer of buyers) {
      const key = buyer.email
        ? buyer.email.toLowerCase()
        : `${buyer.companyName?.toLowerCase()}|${buyer.country?.toLowerCase()}`;

      if (seen.has(key)) {
        buyer.isDuplicate = true;
        buyer.duplicateOf = seen.get(key);
        await buyer.save();
        marked++;
      } else {
        buyer.isDuplicate = false;
        buyer.duplicateOf = null;
        await buyer.save();
        seen.set(key, buyer._id);
      }
    }

    await logActivity('duplicate_check', `Marked ${marked} duplicates`);
    res.json({ success: true, marked, total: buyers.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/import/template', (_req, res) => {
  res.header('Content-Type', 'text/csv');
  res.attachment('buyer-import-template.csv');
  res.send(CSV_TEMPLATE);
});

router.post('/import', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ success: false, message: 'CSV content required' });

    const { rows, errors, totalParsed } = parseBuyerCsv(csv);
    const imported = [];
    let skipped = 0;

    for (const row of rows) {
      if (row.email) {
        const exists = await Buyer.findOne({ email: row.email });
        if (exists) {
          skipped++;
          continue;
        }
      }

      const buyer = await Buyer.create({
        ...row,
        source: 'csv-import',
      });
      imported.push(buyer);
    }

    await logActivity('csv_import', `Imported ${imported.length} buyers (${skipped} skipped)`);
    res.json({
      success: true,
      imported: imported.length,
      skipped,
      totalParsed,
      warnings: errors,
      data: imported,
      message: imported.length
        ? `Imported ${imported.length} lead(s)`
        : `No new leads imported (${skipped} duplicate(s) skipped)`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/export/csv', async (_req, res) => {
  try {
    const buyers = await Buyer.find({ isDuplicate: false }).sort({ createdAt: -1 });
    const parser = new Parser({
      fields: ['companyName', 'contactName', 'email', 'phone', 'website', 'country', 'category', 'source', 'emailStatus', 'outreachStatus', 'aiClassification'],
    });
    const csv = parser.parse(buyers.map((b) => b.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('buyer-leads.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/export/sheets', async (req, res) => {
  try {
    const { country, category, status, search, source } = req.query;
    const filter = { isDuplicate: false }; // Only export non-duplicates

    if (country) filter.country = new RegExp(country, 'i');
    if (category) filter.category = new RegExp(category, 'i');
    if (status) filter.outreachStatus = status;
    if (source) filter.source = source;
    if (search) {
      filter.$or = [
        { companyName: new RegExp(search, 'i') },
        { contactName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const buyers = await Buyer.find(filter).sort({ createdAt: -1 });

    const header = ['DATE', 'NAME OF THE COMPANY', 'EMAIL ADDRESS', 'WEBSITE LINK', 'RESPONSES', 'INTERN\'S FEEDBACK', 'FOLLOW UP', 'TYPE'];
    const rows = buyers.map(b => {
      let dateStr = '';
      if (b.createdAt) {
        const d = new Date(b.createdAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        dateStr = `${day}/${month}/${year}`;
      }
      
      let website = b.website || '';
      if (website) {
        const cleanUrl = website.startsWith('http') ? website : `https://${website}`;
        website = `[${cleanUrl}](${cleanUrl})`;
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

    const tsv = [header.join('\t'), ...rows].join('\n');

    res.header('Content-Type', 'text/tab-separated-values');
    res.send(tsv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sync-replies', async (req, res) => {
  try {
    const result = await syncGmailResponses();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const buyer = await Buyer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
    res.json({ success: true, data: buyer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Buyer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
