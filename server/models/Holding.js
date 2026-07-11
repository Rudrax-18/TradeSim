import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    averageBuyPrice: {
      type: Number,
      required: true,
      min: [0, 'Average buy price cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

holdingSchema.virtual('shares').get(function () {
  return this.quantity;
}).set(function (v) {
  this.quantity = v;
});

// Create compound unique index on user and symbol
holdingSchema.index({ user: 1, symbol: 1 }, { unique: true });

const Holding = mongoose.model('Holding', holdingSchema);

export default Holding;
