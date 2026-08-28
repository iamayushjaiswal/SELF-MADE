import mongoose from 'mongoose';

const buyerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'manual' },
    market: { type: String, trim: true, default: '' },
    emailStatus: {
      type: String,
      enum: ['unknown', 'valid', 'invalid', 'risky', 'mx-valid'],
      default: 'unknown',
    },
    validationNotes: { type: String, default: '' },
    aiClassification: { type: String, default: '' },
    outreachStatus: {
      type: String,
      enum: ['new', 'queued', 'contacted', 'responded', 'follow-up', 'closed'],
      default: 'new',
    },
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '' },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
  },
  { timestamps: true }
);

buyerSchema.index({ email: 1 });
buyerSchema.index({ companyName: 1, country: 1 });

export default mongoose.model('Buyer', buyerSchema);
