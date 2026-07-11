import {
  getStockQuote,
  getStockHistory,
  searchStocks,
  getTrendingStocks as fetchTrendingStocks,
  getStockFundamentals,
} from '../services/stockDataService.js';

/**
 * Search stocks
 * Route: GET /api/stocks/search
 */
export const search = async (req, res, next) => {
  const query = req.query.q;
  
  try {
    if (!query) {
      return res.status(400).json({ message: 'Search query parameter "q" is required' });
    }
    const results = await searchStocks(query);
    return res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock quote
 * Route: GET /api/stocks/:symbol/quote
 */
export const getQuote = async (req, res, next) => {
  const { symbol } = req.params;

  try {
    const quote = await getStockQuote(symbol);
    return res.json(quote);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock historical data
 * Route: GET /api/stocks/:symbol/history
 */
export const getHistory = async (req, res, next) => {
  const { symbol } = req.params;
  const range = req.query.range || '1M'; // 1D, 1W, 1M, 1Y (default 1M)

  try {
    const history = await getStockHistory(symbol, range);
    return res.json(history);
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending stocks
 * Route: GET /api/stocks/trending
 */
export const getTrending = async (req, res, next) => {
  try {
    const trending = await fetchTrendingStocks();
    return res.json(trending);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock fundamental metrics
 * Route: GET /api/stocks/:symbol/fundamentals
 */
export const getFundamentals = async (req, res, next) => {
  const { symbol } = req.params;

  try {
    const fundamentals = await getStockFundamentals(symbol);
    return res.json(fundamentals);
  } catch (error) {
    next(error);
  }
};
