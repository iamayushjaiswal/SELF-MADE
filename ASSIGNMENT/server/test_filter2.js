import mongoose from 'mongoose';
import Buyer from './src/models/Buyer.js';

async function run() {
  await mongoose.connect('mongodb+srv://ayushjai28_db_user:wUIU7xeIVRGjPjKT@cluster0.h7danq6.mongodb.net/hireflow');
  
  const allBuyers = await Buyer.find({ category: /candle/i }, 'companyName category country outreachStatus email emailStatus isDuplicate').lean();
  console.log('Candle buyers:', JSON.stringify(allBuyers, null, 2));
  process.exit(0);
}
run();
