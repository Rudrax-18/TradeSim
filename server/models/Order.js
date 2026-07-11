import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
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
      enum: ['BUY', 'SELL'],
      required: true,
    },
    orderType: {
      type: String,
      enum: ['MARKET', 'LIMIT'],
      required: true,
      default: 'MARKET',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      default: 0, // Execution price (set when EXECUTED)
    },
    limitPrice: {
      type: Number,
      default: null, // Only applicable if orderType is LIMIT
    },
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTED', 'CANCELLED', 'FAILED'],
      required: true,
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
