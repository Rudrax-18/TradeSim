import express from 'express';
import {
  search,
  getQuote,
  getHistory,
  getTrending,
  getFundamentals,
} from '../controllers/stockController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all stock routes so only logged-in users can query market data
router.use(protect);

router.get('/search', search);
router.get('/trending', getTrending);
router.get('/:symbol/quote', getQuote);
router.get('/:symbol/history', getHistory);
router.get('/:symbol/fundamentals', getFundamentals);

export default router;
