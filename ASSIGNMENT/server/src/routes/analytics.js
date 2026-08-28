import express from 'express';
import EmailLog from '../models/EmailLog.js';
import Buyer from '../models/Buyer.js';
import Campaign from '../models/Campaign.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

router.get('/dashboard', async (_req, res) => {
  try {
    const [
      totalBuyers,
      validatedBuyers,
      contactedBuyers,
      respondedBuyers,
      duplicates,
      totalCampaigns,
      totalEmailsSent,
      recentActivity,
    ] = await Promise.all([
      Buyer.countDocuments(),
      Buyer.countDocuments({ emailStatus: { $in: ['mx-valid', 'valid'] } }),
      Buyer.countDocuments({ outreachStatus: 'contacted' }),
      Buyer.countDocuments({ outreachStatus: 'responded' }),
      Buyer.countDocuments({ isDuplicate: true }),
      Campaign.countDocuments(),
      EmailLog.countDocuments({ status: 'sent' }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const outreachFunnel = await Buyer.aggregate([
      { $group: { _id: '$outreachStatus', count: { $sum: 1 } } },
    ]);

    const emailsByDay = await EmailLog.aggregate([
      { $match: { status: 'sent' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]);

    const topCountries = await Buyer.aggregate([
      { $match: { country: { $ne: '' } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalBuyers,
          validatedBuyers,
          contactedBuyers,
          respondedBuyers,
          duplicates,
          totalCampaigns,
          totalEmailsSent,
          validationRate: totalBuyers ? Math.round((validatedBuyers / totalBuyers) * 100) : 0,
          responseRate: contactedBuyers ? Math.round((respondedBuyers / contactedBuyers) * 100) : 0,
        },
        outreachFunnel,
        emailsByDay,
        topCountries,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/weekly', async (_req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newBuyers, emailsSent, responses, validations, activities] = await Promise.all([
      Buyer.countDocuments({ createdAt: { $gte: weekAgo } }),
      EmailLog.countDocuments({ status: 'sent', sentAt: { $gte: weekAgo } }),
      EmailLog.countDocuments({ status: 'responded', respondedAt: { $gte: weekAgo } }),
      ActivityLog.countDocuments({ action: 'validation_run', createdAt: { $gte: weekAgo } }),
      ActivityLog.find({ createdAt: { $gte: weekAgo } }).sort({ createdAt: -1 }).limit(20),
    ]);

    const campaignProgress = await Campaign.find().select('name status sentCount responseCount failedCount updatedAt');

    res.json({
      success: true,
      data: {
        period: { from: weekAgo, to: new Date() },
        metrics: { newBuyers, emailsSent, responses, validations },
        campaignProgress,
        activities,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/emails', async (_req, res) => {
  try {
    const logs = await EmailLog.find()
      .populate('buyer', 'companyName contactName email country')
      .populate('campaign', 'name')
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/emails/:id/response', async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Email log not found' });

    log.status = 'responded';
    log.responseNotes = req.body.notes || '';
    log.respondedAt = new Date();
    await log.save();

    await Buyer.findByIdAndUpdate(log.buyer, { outreachStatus: 'responded' });

    if (log.campaign) {
      await Campaign.findByIdAndUpdate(log.campaign, { $inc: { responseCount: 1 } });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/activity', async (_req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
