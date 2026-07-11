import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Holding from '../models/Holding.js';
import Transaction from '../models/Transaction.js';
import { getStockQuote } from './stockDataService.js';
import { emitToUser } from './socketService.js';
import { getUserWalletDetails } from '../controllers/orderController.js';

export const checkLimitOrders = async () => {
  try {
    const pendingOrders = await Order.find({ status: 'PENDING', orderType: 'LIMIT' });
    if (pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      try {
        const quote = await getStockQuote(order.symbol);
        const currentPrice = quote.price;

        let shouldExecute = false;
        if (order.type === 'BUY' && currentPrice <= order.limitPrice) {
          shouldExecute = true;
        } else if (order.type === 'SELL' && currentPrice >= order.limitPrice) {
          shouldExecute = true;
        }

        if (shouldExecute) {
          await executeLimitOrder(order, currentPrice);
        }
      } catch (err) {
        console.error(`Error processing limit order ${order._id} for ${order.symbol}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error fetching pending limit orders:', err.message);
  }
};

const executeLimitOrder = async (order, executionPrice) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const total = executionPrice * order.quantity;

  try {
    const user = await User.findById(order.user).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    if (order.type === 'BUY') {
      if (user.walletBalance < total) {
        throw new Error('Insufficient wallet balance to execute simulated buy limit order');
      }

      // Deduct balance
      user.walletBalance -= total;
      await user.save({ session });

      // Update holding
      let holding = await Holding.findOne({ user: user._id, symbol: order.symbol }).session(session);
      if (!holding) {
        holding = new Holding({
          user: user._id,
          symbol: order.symbol,
          quantity: order.quantity,
          averageBuyPrice: executionPrice,
        });
      } else {
        const existingQuantity = holding.quantity;
        const existingCost = existingQuantity * holding.averageBuyPrice;
        const newCost = total;
        const totalShares = existingQuantity + order.quantity;
        holding.averageBuyPrice = parseFloat(((existingCost + newCost) / totalShares).toFixed(2));
        holding.quantity = totalShares;
      }
      await holding.save({ session });

    } else if (order.type === 'SELL') {
      let holding = await Holding.findOne({ user: user._id, symbol: order.symbol }).session(session);
      if (!holding || holding.quantity < order.quantity) {
        throw new Error('Insufficient shares to execute simulated sell limit order');
      }

      // Add balance
      user.walletBalance += total;
      await user.save({ session });

      // Deduct holding
      holding.quantity -= order.quantity;
      if (holding.quantity === 0) {
        await Holding.deleteOne({ _id: holding._id }).session(session);
      } else {
        await holding.save({ session });
      }
    }

    // Create immutable Transaction log
    await Transaction.create(
      [
        {
          user: user._id,
          symbol: order.symbol,
          type: order.type,
          quantity: order.quantity,
          price: executionPrice,
          total,
        },
      ],
      { session }
    );

    // Update order status
    order.status = 'EXECUTED';
    order.price = executionPrice;
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    console.log(`[Limit Order Service] Successfully executed ${order.type} limit order ${order._id} for ${order.symbol} at ₹${executionPrice}`);

    // Emit live Socket.io updates on execution success
    getUserWalletDetails(order.user).then((walletDetails) => {
      if (walletDetails) {
        emitToUser(order.user, 'wallet:updated', walletDetails);
      }
    });

    emitToUser(order.user, 'order:executed', {
      id: order._id,
      symbol: order.symbol,
      type: order.type,
      orderType: 'LIMIT',
      quantity: order.quantity,
      price: executionPrice,
      total,
      status: 'EXECUTED',
      message: `Pending limit ${order.type.toLowerCase()} order filled successfully at ₹${executionPrice}`,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error(`[Limit Order Service] Execution failed for order ${order._id}, marking as FAILED:`, err.message);
    order.status = 'FAILED';
    await order.save();

    // Emit live order failed event
    emitToUser(order.user, 'order:failed', {
      symbol: order.symbol,
      type: order.type,
      orderType: 'LIMIT',
      quantity: order.quantity,
      message: err.message,
    });
  }
};

let pollingIntervalId = null;

export const startLimitOrderPolling = () => {
  if (pollingIntervalId) return;
  console.log('[Limit Order Service] Initializing limit order background execution polling (30s interval)...');
  
  // Run immediately on start, then every 30s
  checkLimitOrders();
  pollingIntervalId = setInterval(checkLimitOrders, 30000);
};

export const stopLimitOrderPolling = () => {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
    console.log('[Limit Order Service] Polling stopped.');
  }
};
