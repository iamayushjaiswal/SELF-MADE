import ActivityLog from '../models/ActivityLog.js';

export async function logActivity(action, details = '', metadata = {}, entityType = 'buyer', entityId = null) {
  return ActivityLog.create({ action, details, metadata, entityType, entityId });
}
