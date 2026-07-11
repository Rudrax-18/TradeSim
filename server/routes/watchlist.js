import express from 'express';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../controllers/watchlistController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getWatchlist);
router.post('/:symbol', addToWatchlist);
router.delete('/:symbol', removeFromWatchlist);

export default router;
