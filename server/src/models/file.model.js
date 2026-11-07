import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: 255,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File cannot be empty'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'File owner is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast owner-scoped list and sorting
fileSchema.index({ owner: 1, createdAt: -1 });

fileSchema.methods.toJSON = function () {
  const file = this.toObject();
  file.id = file._id.toString();
  delete file._id;
  delete file.__v;
  // storageKey is an internal implementation detail, don't expose it to API consumers
  delete file.storageKey;
  return file;
};

export const File = mongoose.model('File', fileSchema);
