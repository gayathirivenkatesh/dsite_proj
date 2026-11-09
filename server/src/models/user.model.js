import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
    isDisabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    refreshTokens: [refreshTokenSchema],
  },
  {
    timestamps: true,
  }
);

// Format user document for JSON responses without exposing sensitive credentials
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  user.id = user._id.toString();
  delete user._id;
  delete user.__v;
  delete user.passwordHash;
  delete user.refreshTokens;
  return user;
};

export const User = mongoose.model('User', userSchema);
