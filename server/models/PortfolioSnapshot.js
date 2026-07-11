import mongoose from 'mongoose';

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    cashBalance: {
      type: Number,
      required: true,
    },
    holdingsValue: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Enforce unique snapshot per user per day to avoid duplication
portfolioSnapshotSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
