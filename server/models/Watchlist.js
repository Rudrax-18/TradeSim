import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    symbols: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Watchlist', watchlistSchema);
