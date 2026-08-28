import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import Buyer from './src/models/Buyer.js';

async function run() {
  await mongoose.connect('mongodb+srv://ayushjai28_db_user:wUIU7xeIVRGjPjKT@cluster0.h7danq6.mongodb.net/hireflow');
  const campaign = await Campaign.findOne().sort({ createdAt: -1 }).lean();
  console.log('Campaign:', JSON.stringify(campaign, null, 2));

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
  
  console.log('Filter:', filter);
  console.log('Eligible buyers for this campaign:', await Buyer.countDocuments(filter));

  process.exit(0);
}
run();
