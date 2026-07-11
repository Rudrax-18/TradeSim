import mongoose from 'mongoose';
import User from '../models/User.js';
import Holding from '../models/Holding.js';
import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import { getStockQuote } from '../services/stockDataService.js';
import { emitToUser } from '../services/socketService.js';

// Helper: Calculate and fetch wallet balance + total portfolio net worth
export const getUserWalletDetails = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const holdings = await Holding.find({ user: userId });
    let totalHoldingValue = 0;

    for (const holding of holdings) {
      try {
        const quote = await getStockQuote(holding.symbol);
        totalHoldingValue += holding.quantity * quote.price;
      } catch (err) {
        totalHoldingValue += holding.quantity * holding.averageBuyPrice;
      }
    }

    return {
      walletBalance: user.walletBalance,
      totalPortfolioValue: parseFloat((user.walletBalance + totalHoldingValue).toFixed(2)),
    };
  } catch (err) {
    console.error('Error fetching user wallet details:', err.message);
    return null;
  }
};

/**
 * Execute or Place a stock order (Market or Limit)
 * Route: POST /api/orders
 */
export const placeOrder = async (req, res, next) => {
  const { symbol, type, shares, quantity, orderType = 'MARKET', limitPrice } = req.body;

  // Accept quantity or shares parameters
  const qty = parseInt(quantity || shares);

  if (!symbol || !type || !qty) {
    return res.status(400).json({ message: 'Missing required parameters: symbol, type, quantity' });
  }

  if (qty <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than zero' });
  }

  if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid order type. Must be BUY or SELL' });
  }

  if (!['MARKET', 'LIMIT'].includes(orderType.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid execution type. Must be MARKET or LIMIT' });
  }

  const upperSymbol = symbol.toUpperCase();
  const execType = orderType.toUpperCase();

  // If LIMIT, validate limitPrice
  if (execType === 'LIMIT') {
    if (!limitPrice || parseFloat(limitPrice) <= 0) {
      return res.status(400).json({ message: 'A positive limitPrice is required for LIMIT orders' });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    if (execType === 'MARKET') {
      // 1. Fetch current live market price
      const quote = await getStockQuote(upperSymbol);
      const price = quote.price;
      const total = price * qty;

      if (type === 'BUY') {
        if (user.walletBalance < total) {
          throw new Error('Insufficient wallet balance to execute simulated purchase');
        }

        // Deduct balance
        user.walletBalance -= total;
        await user.save({ session });

        // Update holding
        let holding = await Holding.findOne({ user: user._id, symbol: upperSymbol }).session(session);
        if (!holding) {
          holding = new Holding({
            user: user._id,
            symbol: upperSymbol,
            quantity: qty,
            averageBuyPrice: price,
          });
        } else {
          const existingQuantity = holding.quantity;
          const existingCost = existingQuantity * holding.averageBuyPrice;
          const newCost = total;
          const totalShares = existingQuantity + qty;
          holding.averageBuyPrice = parseFloat(((existingCost + newCost) / totalShares).toFixed(2));
          holding.quantity = totalShares;
        }
        await holding.save({ session });

      } else if (type === 'SELL') {
        const holding = await Holding.findOne({ user: user._id, symbol: upperSymbol }).session(session);
        if (!holding || holding.quantity < qty) {
          throw new Error('Insufficient shares to execute simulated sale');
        }

        // Add balance
        user.walletBalance += total;
        await user.save({ session });

        // Deduct holding
        holding.quantity -= qty;
        if (holding.quantity === 0) {
          await Holding.deleteOne({ _id: holding._id }).session(session);
        } else {
          await holding.save({ session });
        }
      }

      // Create transaction log
      const transaction = await Transaction.create(
        [
          {
            user: user._id,
            symbol: upperSymbol,
            type,
            quantity: qty,
            price,
            total,
          },
        ],
        { session }
      );

      // Create Order document (status EXECUTED)
      const order = await Order.create(
        [
          {
            user: user._id,
            symbol: upperSymbol,
            type,
            orderType: execType,
            quantity: qty,
            price,
            status: 'EXECUTED',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Emit live updates to connected users via Socket.io
      getUserWalletDetails(user._id).then((walletDetails) => {
        if (walletDetails) {
          emitToUser(user._id, 'wallet:updated', walletDetails);
        }
      });

      emitToUser(user._id, 'order:executed', {
        id: order[0]._id,
        symbol: upperSymbol,
        type: order[0].type,
        orderType: 'MARKET',
        quantity: order[0].quantity,
        price: order[0].price,
        total: order[0].price * order[0].quantity,
        status: 'EXECUTED',
        message: `Simulated market ${type.toLowerCase()} order executed successfully`,
      });

      return res.status(201).json({
        message: `Simulated market ${type.toLowerCase()} order executed successfully`,
        walletBalance: user.walletBalance,
        order: order[0],
      });

    } else if (execType === 'LIMIT') {
      const priceLimit = parseFloat(limitPrice);
      const totalEstimated = priceLimit * qty;

      if (type === 'BUY') {
        if (user.walletBalance < totalEstimated) {
          throw new Error('Insufficient wallet balance to place simulated buy limit order');
        }
      } else if (type === 'SELL') {
        // Validate sufficient holdings (including reservation of pending limit sells)
        const holding = await Holding.findOne({ user: user._id, symbol: upperSymbol }).session(session);
        if (!holding) {
          throw new Error('You do not hold any shares of this symbol to sell');
        }

        // Check if shares are already reserved in other pending sell limit orders
        const pendingSells = await Order.find({
          user: user._id,
          symbol: upperSymbol,
          type: 'SELL',
          status: 'PENDING',
        }).session(session);

        const reservedQty = pendingSells.reduce((sum, o) => sum + o.quantity, 0);
        if (holding.quantity - reservedQty < qty) {
          throw new Error(`Insufficient available shares. You hold ${holding.quantity} shares, but ${reservedQty} are reserved in pending limit orders.`);
        }
      }

      // Create Order document (status PENDING)
      const order = await Order.create(
        [
          {
            user: user._id,
            symbol: upperSymbol,
            type,
            orderType: execType,
            quantity: qty,
            limitPrice: priceLimit,
            status: 'PENDING',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Emit live wallet updates
      getUserWalletDetails(user._id).then((walletDetails) => {
        if (walletDetails) {
          emitToUser(user._id, 'wallet:updated', walletDetails);
        }
      });

      return res.status(201).json({
        message: `Simulated limit ${type.toLowerCase()} order placed successfully`,
        walletBalance: user.walletBalance,
        order: order[0],
      });
    }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Order Error] Transaction aborted:', error.message);

    // Emit live order:failed update
    emitToUser(req.user.id, 'order:failed', {
      symbol: upperSymbol,
      type,
      orderType: execType,
      quantity: qty,
      message: error.message,
    });

    return res.status(400).json({ message: error.message });
  }
};

/**
 * Get user's order history with filters
 * Route: GET /api/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const { status, symbol, startDate, endDate } = req.query;

    const query = { user: req.user.id };

    if (status) {
      query.status = status.toUpperCase();
    }
    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending limit order
 * Route: DELETE /api/orders/:id
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only PENDING orders can be cancelled' });
    }

    order.status = 'CANCELLED';
    await order.save();

    // Emit live updates to sync balance/views
    getUserWalletDetails(req.user.id).then((walletDetails) => {
      if (walletDetails) {
        emitToUser(req.user.id, 'wallet:updated', walletDetails);
      }
    });

    return res.json({ message: 'Pending limit order cancelled successfully', order });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's open portfolio holdings combined with live quotes
 * Route: GET /api/portfolio
 */
export const getPortfolio = async (req, res, next) => {
  try {
    const holdings = await Holding.find({ user: req.user.id });

    const promises = holdings.map(async (holding) => {
      try {
        const quote = await getStockQuote(holding.symbol);
        const currentValue = holding.quantity * quote.price;
        const totalCost = holding.quantity * holding.averageBuyPrice;
        const gain = currentValue - totalCost;
        const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

        return {
          id: holding._id,
          symbol: holding.symbol,
          quantity: holding.quantity,
          shares: holding.quantity, // Legacy compatibility
          averageBuyPrice: holding.averageBuyPrice,
          currentPrice: quote.price,
          value: parseFloat(currentValue.toFixed(2)),
          gain: parseFloat(gain.toFixed(2)),
          gainPercent: parseFloat(gainPercent.toFixed(2)),
        };
      } catch (err) {
        console.error(`[Portfolio Controller] Error fetching live quote for ${holding.symbol}:`, err.message);
        const totalCost = holding.quantity * holding.averageBuyPrice;
        return {
          id: holding._id,
          symbol: holding.symbol,
          quantity: holding.quantity,
          shares: holding.quantity, // Legacy compatibility
          averageBuyPrice: holding.averageBuyPrice,
          currentPrice: holding.averageBuyPrice,
          value: parseFloat(totalCost.toFixed(2)),
          gain: 0,
          gainPercent: 0,
        };
      }
    });

    const portfolio = await Promise.all(promises);
    return res.json(portfolio);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's cash balance + total portfolio value
 * Route: GET /api/wallet
 */
export const getWallet = async (req, res, next) => {
  try {
    const details = await getUserWalletDetails(req.user.id);
    if (!details) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(details);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's past simulated transactions
 * Route: GET /api/transactions
 */
export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json(transactions);
  } catch (error) {
    next(error);
  }
};
