import express from 'express';
import {
  placeOrder,
  getOrders,
  cancelOrder,
  getPortfolio,
  getWallet,
  getTransactions,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All trading engine endpoints require authentication
router.use(protect);

router.post('/orders', placeOrder);
router.get('/orders', getOrders);
router.delete('/orders/:id', cancelOrder);
router.get('/portfolio', getPortfolio);
router.get('/wallet', getWallet);
router.get('/transactions', getTransactions);

export default router;
