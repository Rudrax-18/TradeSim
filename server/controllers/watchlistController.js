import Watchlist from '../models/Watchlist.js';

/**
 * Get user's watchlist
 * Route: GET /api/watchlist
 */
export const getWatchlist = async (req, res, next) => {
  try {
    let watchlist = await Watchlist.findOne({ user: req.user.id });
    if (!watchlist) {
      // Create a default watchlist with top NSE stocks across sectors
      const defaultSymbols = [
        'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
        'SBIN.NS', 'TATAMOTORS.NS', 'ITC.NS', 'HINDUNILVR.NS', 'SUNPHARMA.NS',
        'BHARTIARTL.NS', 'LT.NS'
      ];
      watchlist = new Watchlist({
        user: req.user.id,
        symbols: defaultSymbols,
      });
      await watchlist.save();
    }
    return res.json({ symbols: watchlist.symbols });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a symbol to user's watchlist
 * Route: POST /api/watchlist/:symbol
 */
export const addToWatchlist = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    let watchlist = await Watchlist.findOne({ user: req.user.id });
    if (!watchlist) {
      watchlist = new Watchlist({
        user: req.user.id,
        symbols: [symbol],
      });
    } else {
      if (!watchlist.symbols.includes(symbol)) {
        watchlist.symbols.push(symbol);
      }
    }
    
    await watchlist.save();
    return res.status(201).json({ message: 'Symbol added to watchlist', symbols: watchlist.symbols });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a symbol from user's watchlist
 * Route: DELETE /api/watchlist/:symbol
 */
export const removeFromWatchlist = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    let watchlist = await Watchlist.findOne({ user: req.user.id });
    if (!watchlist) {
      return res.status(404).json({ message: 'Watchlist not found' });
    }
    
    watchlist.symbols = watchlist.symbols.filter((s) => s !== symbol);
    await watchlist.save();
    
    return res.json({ message: 'Symbol removed from watchlist', symbols: watchlist.symbols });
  } catch (error) {
    next(error);
  }
};
