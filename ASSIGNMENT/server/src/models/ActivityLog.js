import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    entityType: { type: String, default: 'buyer' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('ActivityLog', activityLogSchema);
