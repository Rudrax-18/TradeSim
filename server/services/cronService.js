import cron from 'node-cron';
import User from '../models/User.js';
import Holding from '../models/Holding.js';
import PortfolioSnapshot from '../models/PortfolioSnapshot.js';
import { getStockQuote } from './stockDataService.js';

// Perform snapshot calculations for all users
export const capturePortfolioSnapshots = async () => {
  console.log('[Cron Job] Executing daily portfolio snapshots capturing...');
  try {
    const users = await User.find();
    const todayStr = new Date().toISOString().split('T')[0];

    for (const user of users) {
      try {
        const holdings = await Holding.find({ user: user._id });
        let holdingsValue = 0;

        for (const holding of holdings) {
          try {
            const quote = await getStockQuote(holding.symbol);
            holdingsValue += holding.quantity * quote.price;
          } catch (err) {
            // Fallback to average buy price if quote fetch fails
            holdingsValue += holding.quantity * holding.averageBuyPrice;
          }
        }

        const totalValue = parseFloat((user.walletBalance + holdingsValue).toFixed(2));

        // Create or update the snapshot for today
        await PortfolioSnapshot.findOneAndUpdate(
          { user: user._id, date: todayStr },
          {
            totalValue,
            cashBalance: user.walletBalance,
            holdingsValue: parseFloat(holdingsValue.toFixed(2)),
          },
          { upsert: true, new: true }
        );
      } catch (userErr) {
        console.error(`[Cron Job] Failed to capture snapshot for user ${user._id}:`, userErr.message);
      }
    }
    console.log('[Cron Job] Daily portfolio snapshots completed successfully.');
  } catch (err) {
    console.error('[Cron Job] Global snapshot capture error:', err.message);
  }
};

let dailyCronTask = null;

export const startCronServices = () => {
  if (dailyCronTask) return;

  console.log('[Cron Service] Starting scheduler services...');
  
  // Schedule to run at 4:00 PM (16:00) IST daily, after NSE market close
  // Cron pattern: minute hour day-of-month month day-of-week
  dailyCronTask = cron.schedule(
    '0 16 * * *',
    async () => {
      await capturePortfolioSnapshots();
    },
    {
      scheduled: true,
      timezone: 'Asia/Kolkata', // Specify IST timezone
    }
  );
};

export const stopCronServices = () => {
  if (dailyCronTask) {
    dailyCronTask.stop();
    dailyCronTask = null;
    console.log('[Cron Service] Scheduler stopped.');
  }
};
