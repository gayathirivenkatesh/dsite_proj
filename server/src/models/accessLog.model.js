import mongoose from 'mongoose';

export const OUTCOMES = [
  'success',
  'wrong_password',
  'expired',
  'exhausted',
  'revoked',
  'not_found',
  'rate_limited',
];

const accessLogSchema = new mongoose.Schema(
  {
    outcome: {
      type: String,
      required: [true, 'Outcome is required'],
      enum: OUTCOMES,
      index: true,
    },
    ip: {
      type: String,
      required: [true, 'IP address is required'],
    },
    userAgent: {
      type: String,
      default: null,
    },
    linkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShareLink',
      default: null,
      index: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for owner and resource queries
accessLogSchema.index({ fileId: 1, createdAt: -1 });
accessLogSchema.index({ linkId: 1, createdAt: -1 });
accessLogSchema.index({ owner: 1, createdAt: -1 });
accessLogSchema.index({ outcome: 1, createdAt: -1 });

accessLogSchema.methods.toJSON = function () {
  const log = this.toObject();
  log.id = log._id.toString();
  delete log._id;
  delete log.__v;
  return log;
};

export const AccessLog = mongoose.model('AccessLog', accessLogSchema);
