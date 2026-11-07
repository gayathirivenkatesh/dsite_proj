import mongoose from 'mongoose';

const failedAttemptSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const shareLinkSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: [true, 'Target file reference is required'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Link owner is required'],
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    maxDownloads: {
      type: Number,
      default: null,
      min: [1, 'Maximum downloads must be at least 1 if specified'],
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    failedAttempts: [failedAttemptSchema],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for querying and listing
shareLinkSchema.index({ owner: 1, createdAt: -1 });
shareLinkSchema.index({ file: 1, createdAt: -1 });

// Helper to determine link status
shareLinkSchema.methods.getStatus = function () {
  if (this.isRevoked) {
    return 'REVOKED';
  }
  if (this.expiresAt && this.expiresAt <= new Date()) {
    return 'EXPIRED';
  }
  if (this.maxDownloads !== null && this.downloadCount >= this.maxDownloads) {
    return 'EXHAUSTED';
  }
  return 'ACTIVE';
};

shareLinkSchema.methods.toJSON = function () {
  const link = this.toObject();
  link.id = link._id.toString();
  delete link._id;
  delete link.__v;
  delete link.tokenHash;
  delete link.passwordHash;
  delete link.failedAttempts;
  link.isPasswordProtected = Boolean(this.passwordHash);
  link.status = this.getStatus();
  return link;
};

export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
