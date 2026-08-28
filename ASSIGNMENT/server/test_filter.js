import mongoose from 'mongoose';
import Buyer from './src/models/Buyer.js';

async function run() {
  await mongoose.connect('mongodb+srv://ayushjai28_db_user:wUIU7xeIVRGjPjKT@cluster0.h7danq6.mongodb.net/hireflow');
  const filter = {
    isDuplicate: false,
    email: { $ne: '' },
    emailStatus: { $in: ['mx-valid', 'valid', 'unknown'] },
    outreachStatus: { $in: ['new', 'queued', 'follow-up'] },
  };
  console.log('Eligible buyers matching core filter:', await Buyer.countDocuments(filter));
  const allBuyers = await Buyer.find({}, 'companyName category country outreachStatus email emailStatus isDuplicate').lean();
  console.log('All buyers breakdown:', JSON.stringify(allBuyers, null, 2));
  process.exit(0);
}
run();
