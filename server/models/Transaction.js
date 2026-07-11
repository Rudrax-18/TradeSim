import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['BUY', 'SELL', 'DEPOSIT'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Must trade at least 1 share'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Execution price cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Schema only tracks execution log
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

transactionSchema.virtual('shares').get(function () {
  return this.quantity;
}).set(function (v) {
  this.quantity = v;
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
