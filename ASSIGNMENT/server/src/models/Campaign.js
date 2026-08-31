import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    senderName: { type: String, trim: true, default: 'API Export Outreach' },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    targetCountries: [{ type: String }],
    targetCategories: [{ type: String }],
    attachmentPaths: [{ type: String }], // Array for multiple files
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'paused'],
      default: 'draft',
    },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 },
    followUpCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Campaign', campaignSchema);
