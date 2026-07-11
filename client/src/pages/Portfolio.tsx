import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PieChart as PieIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { formatINR } from '../utils/format';

interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  value: number;
  gain: number;
  gainPercent: number;
}

const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const { listen } = useSocket();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance || 1000000);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(user?.walletBalance || 1000000);
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, walletRes] = await Promise.all([
        api.get('/api/portfolio'),
        api.get('/api/wallet'),
      ]);
      setHoldings(portfolioRes.data);
      setWalletBalance(walletRes.data.walletBalance);
      setTotalPortfolioValue(walletRes.data.totalPortfolioValue || walletRes.data.walletBalance);
    } catch (err) {
      console.error('Failed to fetch portfolio data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Listen for socket wallet and trade execution events
  listen('wallet:updated', (data: any) => {
    setWalletBalance(data.walletBalance);
    setTotalPortfolioValue(data.totalPortfolioValue);
    fetchPortfolioData(); // Trigger fresh holdings update
  });

  // Listen for socket real-time price updates for holdings
  listen('price:update', (data: any) => {
    const updatedSymbol = data.symbol;
    setHoldings((prevHoldings) =>
      prevHoldings.map((holding) => {
        const cleanHoldingSym = holding.symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
        const cleanUpdatedSym = updatedSymbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
        if (cleanHoldingSym === cleanUpdatedSym) {
          const newPrice = data.price;
          const newValue = holding.quantity * newPrice;
          const newGain = newValue - (holding.quantity * holding.averageBuyPrice);
          const newGainPercent = holding.averageBuyPrice > 0 ? (newGain / (holding.quantity * holding.averageBuyPrice)) * 100 : 0;
          return {
            ...holding,
            currentPrice: newPrice,
            value: parseFloat(newValue.toFixed(2)),
            gain: parseFloat(newGain.toFixed(2)),
            gainPercent: parseFloat(newGainPercent.toFixed(2)),
          };
        }
        return holding;
      })
    );
  });

  const totalHoldingValue = holdings.reduce((acc, curr) => acc + curr.value, 0);
  const totalCost = holdings.reduce((acc, curr) => acc + (curr.quantity * curr.averageBuyPrice), 0);
  const totalGain = totalHoldingValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const isGainPositive = totalGain >= 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--color-text-primary)]">
          <Briefcase className="text-emerald-500 dark:text-emerald-400" />
          <span>My Investment Portfolio</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium">
          Monitor your simulated holdings, average costs, and returns.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Assets Card */}
        <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm">
          <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest block mb-1">
            Total Account Value (Net Worth)
          </span>
          <h2 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            {formatINR(totalPortfolioValue)}
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)] mt-2 block font-medium">
            Holdings value (₹{formatINR(totalHoldingValue)}) + Cash balance
          </span>
        </div>

        {/* Total Returns Card */}
        <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm">
          <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest block mb-1">
            Total Returns
          </span>
          <h2 className={`text-3xl font-black ${isGainPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} tracking-tight`}>
            {isGainPositive ? '+' : ''}
            {formatINR(totalGain)}
          </h2>
          <span className={`text-xs font-bold ${isGainPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} mt-1 block`}>
            {isGainPositive ? '+' : ''}
            {totalGainPercent.toFixed(2)}% (All time)
          </span>
        </div>

        {/* Buying Power Card */}
        <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm">
          <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest block mb-1">
            Simulated Available Cash
          </span>
          <h2 className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            {formatINR(walletBalance)}
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)] mt-2 block font-medium">
            Buying power available for simulated trades
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="theme-bg-card border rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div className="px-6 py-5 border-b border-[var(--color-border-card)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <PieIcon size={18} className="text-emerald-750 dark:text-emerald-400" />
            <span>Open Positions</span>
          </h3>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-750 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
            {holdings.length} assets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border-card)] text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-extrabold">
                <th className="px-6 py-4">Symbol</th>
                <th className="px-6 py-4 text-right">Quantity</th>
                <th className="px-6 py-4 text-right">Avg Cost</th>
                <th className="px-6 py-4 text-right">Market Price</th>
                <th className="px-6 py-4 text-right">Current Value</th>
                <th className="px-6 py-4 text-right">Total Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-[var(--color-border-card)]">
              {holdings.map((holding) => {
                const isGain = holding.gain >= 0;
                return (
                  <tr key={holding.symbol} className="hover:bg-slate-200/30 dark:hover:bg-slate-800/20 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link to={`/stock/${holding.symbol}`} className="text-[var(--color-text-primary)] text-base font-extrabold hover:underline hover:text-emerald-500 transition-colors duration-200">{holding.symbol}</Link>
                        <span className="text-[10px] text-[var(--color-text-secondary)] font-bold">COMMON STOCK</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">{holding.quantity}</td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-secondary)] font-mono">{formatINR(holding.averageBuyPrice)}</td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">{formatINR(holding.currentPrice)}</td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">{formatINR(holding.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={isGain ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                          {isGain ? '+' : ''}
                          {formatINR(holding.gain)}
                        </span>
                        <span className={`text-xs ${isGain ? 'text-emerald-750 dark:text-emerald-400/80' : 'text-rose-750 dark:text-rose-400/80'}`}>
                          {isGain ? '+' : ''}
                          {holding.gainPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
