import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { emitToUser } from '../services/socketService.js';
import { getUserWalletDetails } from '../controllers/orderController.js';

const router = express.Router();

router.use(protect);

/**
 * Top up user's simulated wallet balance
 * Route: POST /api/wallet/add-funds
 */
router.post('/add-funds', async (req, res, next) => {
  const { amount } = req.body;
  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Please provide a valid deposit amount.' });
  }

  // Guardrails
  if (numericAmount < 1000) {
    return res.status(400).json({ message: 'Minimum deposit amount is ₹1,000.' });
  }
  if (numericAmount > 5000000) {
    return res.status(400).json({ message: 'Maximum single deposit amount is ₹50,00,000.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Limit check: Maximum wallet balance limit of ₹1,00,00,000 (1 Crore)
    if (user.walletBalance + numericAmount > 10000000) {
      return res.status(400).json({
        message: `Top-up rejected. Maximum wallet limit is ₹1,00,00,000. Your current balance is ₹${user.walletBalance.toLocaleString('en-IN')}.`
      });
    }

    // Update balance
    user.walletBalance = parseFloat((user.walletBalance + numericAmount).toFixed(2));
    await user.save();

    // Create DEPOSIT Transaction
    await Transaction.create({
      user: user._id,
      symbol: 'CASH',
      type: 'DEPOSIT',
      quantity: 1,
      price: numericAmount,
      total: numericAmount
    });

    // Fetch details and emit socket event to update navbar and portfolio live
    getUserWalletDetails(user._id).then((walletDetails) => {
      if (walletDetails) {
        emitToUser(user._id, 'wallet:updated', walletDetails);
      }
    });

    return res.status(200).json({
      message: `Simulated funds ₹${numericAmount.toLocaleString('en-IN')} added successfully`,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    next(error);
  }
});

export default router;
