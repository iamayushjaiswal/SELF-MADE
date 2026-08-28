import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';

async function run() {
  await mongoose.connect('mongodb+srv://ayushjai28_db_user:wUIU7xeIVRGjPjKT@cluster0.h7danq6.mongodb.net/hireflow');
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 }).limit(1).lean();
  console.log(JSON.stringify(campaigns, null, 2));
  process.exit(0);
}
run();
