import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'bounced', 'responded', 'follow-up'],
      default: 'sent',
    },
    responseNotes: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('EmailLog', emailLogSchema);
