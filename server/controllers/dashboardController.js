import User from '../models/User.js';
import Holding from '../models/Holding.js';
import Transaction from '../models/Transaction.js';
import PortfolioSnapshot from '../models/PortfolioSnapshot.js';
import { getStockQuote } from '../services/stockDataService.js';

/**
 * Get aggregated dashboard summary details
 * Route: GET /api/dashboard/summary
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const holdings = await Holding.find({ user: req.user.id });
    const holdingsList = [];
    let holdingsValue = 0;
    let todayPL = 0;

    for (const holding of holdings) {
      try {
        const qty = holding.quantity || holding.shares || 0;
        const quote = await getStockQuote(holding.symbol);
        const currentVal = qty * quote.price;
        const totalCost = qty * holding.averageBuyPrice;
        const gain = currentVal - totalCost;
        const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;
        
        // P&L change since market open: quantity * (currentPrice - openPrice)
        const openPrice = quote.open || quote.prevClose || holding.averageBuyPrice;
        const todayChange = qty * (quote.price - openPrice);

        holdingsValue += currentVal;
        todayPL += todayChange;

        holdingsList.push({
          symbol: holding.symbol,
          quantity: qty,
          averageBuyPrice: holding.averageBuyPrice,
          currentPrice: quote.price,
          value: parseFloat(currentVal.toFixed(2)),
          gain: parseFloat(gain.toFixed(2)),
          gainPercent: parseFloat(gainPercent.toFixed(2)),
          todayChange: parseFloat(todayChange.toFixed(2)),
        });
      } catch (err) {
        // Fallback if quote fails
        const qty = holding.quantity || holding.shares || 0;
        const totalCost = qty * holding.averageBuyPrice;
        holdingsValue += totalCost;
        holdingsList.push({
          symbol: holding.symbol,
          quantity: qty,
          averageBuyPrice: holding.averageBuyPrice,
          currentPrice: holding.averageBuyPrice,
          value: parseFloat(totalCost.toFixed(2)),
          gain: 0,
          gainPercent: 0,
          todayChange: 0,
        });
      }
    }

    const totalPortfolioValue = parseFloat((user.walletBalance + holdingsValue).toFixed(2));
    
    // Sort to extract top gainers and losers
    const topGainers = holdingsList
      .filter((h) => h.gain > 0)
      .sort((a, b) => b.gainPercent - a.gainPercent)
      .slice(0, 3);

    const topLosers = holdingsList
      .filter((h) => h.gain <= 0)
      .sort((a, b) => a.gainPercent - b.gainPercent) // most negative first
      .slice(0, 3);

    // Fetch 5 most recent transactions
    const recentTransactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch PortfolioSnapshot history
    const snapshots = await PortfolioSnapshot.find({ user: req.user.id })
      .sort({ date: 1 });

    const chartData = snapshots.map((s) => ({
      date: s.date,
      totalValue: s.totalValue,
      cashBalance: s.cashBalance,
      holdingsValue: s.holdingsValue,
    }));

    // If no snapshots exist yet, seed a default starting point representing today's state
    if (chartData.length === 0) {
      const todayString = new Date().toISOString().split('T')[0];
      chartData.push({
        date: todayString,
        totalValue: totalPortfolioValue,
        cashBalance: user.walletBalance,
        holdingsValue: parseFloat(holdingsValue.toFixed(2)),
      });
    }

    // Calculate daily P&L percentage change relative to start of day net worth
    const startOfDayValue = totalPortfolioValue - todayPL;
    const todayPLPercent = startOfDayValue > 0 ? (todayPL / startOfDayValue) * 100 : 0;

    return res.json({
      totalPortfolioValue,
      cashBalance: user.walletBalance,
      holdingsValue: parseFloat(holdingsValue.toFixed(2)),
      todayPL: parseFloat(todayPL.toFixed(2)),
      todayPLPercent: parseFloat(todayPLPercent.toFixed(2)),
      topGainers,
      topLosers,
      recentTransactions,
      chartData,
    });
  } catch (error) {
    next(error);
  }
};
