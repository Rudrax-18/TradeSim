import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import { formatINR } from '../utils/format';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface HoldingPL {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  value: number;
  gain: number;
  gainPercent: number;
  todayChange: number;
}

interface Transaction {
  _id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
}

interface ChartPoint {
  date: string;
  totalValue: number;
  cashBalance: number;
  holdingsValue: number;
}

interface DashboardSummary {
  totalPortfolioValue: number;
  cashBalance: number;
  holdingsValue: number;
  todayPL: number;
  todayPLPercent: number;
  topGainers: HoldingPL[];
  topLosers: HoldingPL[];
  recentTransactions: Transaction[];
  chartData: ChartPoint[];
}

const Dashboard: React.FC = () => {
  const { listen, emit } = useSocket();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for interactive asset details panel
  const [selectedSymbol] = useState('RELIANCE.NS');
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Fetch unified dashboard metrics
  const fetchSummary = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    try {
      const res = await api.get('/api/dashboard/summary');
      setSummary(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError('Could not load portfolio summary details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Fetch selected stock details on change
  useEffect(() => {
    let active = true;
    const fetchQuote = async () => {
      setFetchingQuote(true);
      setQuoteError(null);
      try {
        const res = await api.get(`/api/stocks/${selectedSymbol}/quote`);
        if (active) {
          setSelectedQuote(res.data);
        }
      } catch (err) {
        console.error('Failed to load selected quote:', err);
        if (active) {
          setQuoteError('Failed to load asset details.');
        }
      } finally {
        if (active) {
          setFetchingQuote(false);
        }
      }
    };
    fetchQuote();
    return () => {
      active = false;
    };
  }, [selectedSymbol]);

  // Set up socket watch for selected symbol
  useEffect(() => {
    if (selectedSymbol) {
      emit('watch:symbol', { symbol: selectedSymbol });
    }
    return () => {
      emit('unwatch:symbol');
    };
  }, [selectedSymbol]);

  // Socket triggers to auto-update when orders are filled
  listen('wallet:updated', () => {
    fetchSummary(false); // Silent reload to capture new snapshots/ledgers
  });

  // Handle price feeds to dynamically update gainer/loser prices & selected asset details if connected
  listen('price:update', (data: any) => {
    const { symbol, price, change, percentChange } = data;

    if (symbol === selectedSymbol) {
      setSelectedQuote((prev: any) => {
        if (prev) {
          return {
            ...prev,
            price,
            change: change ?? prev.change,
            percentChange: percentChange ?? prev.percentChange,
          };
        }
        return prev;
      });
    }

    if (!summary) return;
    setSummary((prev) => {
      if (!prev) return null;

      const updateHoldings = (list: HoldingPL[]) =>
        list.map((h) => {
          if (h.symbol === symbol) {
            const newValue = h.quantity * price;
            const newGain = newValue - h.quantity * h.averageBuyPrice;
            const newGainPercent = (newGain / (h.quantity * h.averageBuyPrice)) * 100;
            return {
              ...h,
              currentPrice: price,
              value: parseFloat(newValue.toFixed(2)),
              gain: parseFloat(newGain.toFixed(2)),
              gainPercent: parseFloat(newGainPercent.toFixed(2)),
            };
          }
          return h;
        });

      return {
        ...prev,
        topGainers: updateHoldings(prev.topGainers),
        topLosers: updateHoldings(prev.topLosers),
      };
    });
  });

  const handleSelectSymbol = (symbol: string) => {
    navigate(`/stock/${symbol.toUpperCase()}`);
  };

  // Check if user is a brand new user with no trades and empty portfolio
  const isEmptyState =
    summary &&
    summary.holdingsValue === 0 &&
    summary.recentTransactions.length === 0;

  if (loading) {
    // Skeletons loader block
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-20 theme-bg-card border rounded-3xl" />
        
        {/* Cards Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 theme-bg-card border rounded-3xl" />
          <div className="h-28 theme-bg-card border rounded-3xl" />
          <div className="h-28 theme-bg-card border rounded-3xl" />
        </div>

        {/* Main Section Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 theme-bg-card border rounded-3xl" />
          <div className="h-96 theme-bg-card border rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-rose-400">
        <AlertCircle size={40} className="mx-auto mb-4" />
        <h3 className="font-extrabold mb-2 text-lg">Error Loading Dashboard</h3>
        <p className="text-sm mb-4">{error || 'Server error occurred'}</p>
        <button
          onClick={() => fetchSummary()}
          className="px-6 py-2 bg-rose-500 text-white rounded-xl font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 theme-bg-card border p-6 rounded-3xl backdrop-blur-md relative z-30 transition-all duration-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={16} className="text-emerald-500 dark:text-emerald-400" />
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider">
              TradeSim Live Terminal
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Market Intelligence
          </h2>
          <p className="text-[var(--color-text-secondary)] text-xs mt-0.5 font-medium">
            Simulated portfolio valuations and real-time ledger metrics.
          </p>
        </div>

        {/* Global Stock Finder */}
        <div className="flex items-center gap-3">
          <StockSearch onSelectSymbol={handleSelectSymbol} />
          <button
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            className="p-3 theme-bg-btn-slate border hover:opacity-85 text-slate-500 dark:text-slate-300 rounded-2xl transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Net Worth Card */}
        <div className="theme-bg-card border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-28 transition-all duration-300 shadow-sm hover:opacity-95">
          <div className="flex justify-between items-center text-[var(--color-text-secondary)] font-bold text-[10px] uppercase tracking-widest">
            <span>Net Worth (INR)</span>
            <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight mt-1">
            {formatINR(summary.totalPortfolioValue)}
          </span>
        </div>

        {/* Cash Balance Card */}
        <div className="theme-bg-card border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-28 transition-all duration-300 shadow-sm hover:opacity-95">
          <div className="flex justify-between items-center text-[var(--color-text-secondary)] font-bold text-[10px] uppercase tracking-widest">
            <span>Available Wallet Cash</span>
            <Wallet size={14} className="text-slate-400" />
          </div>
          <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight mt-1">
            {formatINR(summary.cashBalance)}
          </span>
        </div>

        {/* Today's P&L Card */}
        <div className="theme-bg-card border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-28 transition-all duration-300 shadow-sm hover:opacity-95">
          <div className="flex justify-between items-center text-[var(--color-text-secondary)] font-bold text-[10px] uppercase tracking-widest">
            <span>Today's Profit & Loss</span>
            {summary.todayPL >= 0 ? (
              <TrendingUp size={14} className="text-emerald-700 dark:text-emerald-400" />
            ) : (
              <TrendingDown size={14} className="text-rose-700 dark:text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-extrabold tracking-tight ${
              summary.todayPL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {summary.todayPL >= 0 ? '+' : ''}
              {formatINR(summary.todayPL)}
            </span>
            <span className={`text-xs font-bold ${
              summary.todayPL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              ({summary.todayPL >= 0 ? '+' : ''}{summary.todayPLPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Asset Details & Live Interactive Chart Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Column (2/3 width) */}
        <div className="lg:col-span-2">
          <StockChart symbol={selectedSymbol} currentPrice={selectedQuote?.price || 0} />
        </div>

        {/* Info Column (1/3 width) */}
        <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between min-h-[300px] transition-all duration-300 shadow-sm relative overflow-hidden">
          {fetchingQuote ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] py-12 gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
              <span className="text-xs font-bold">Loading asset metrics...</span>
            </div>
          ) : quoteError || !selectedQuote ? (
            <div className="flex flex-col items-center justify-center h-full text-rose-400 p-6 text-center gap-3">
              <AlertCircle size={24} />
              <span className="text-xs font-bold">{quoteError || 'No asset selected'}</span>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-[var(--color-text-primary)] tracking-wide uppercase">
                      {selectedQuote.symbol}
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-bold mt-0.5">
                      INR Market Asset
                    </p>
                  </div>
                  <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                    selectedQuote.change >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450' : 'bg-rose-500/10 text-rose-700 dark:text-rose-450'
                  }`}>
                    {selectedQuote.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(selectedQuote.percentChange).toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
                    {formatINR(selectedQuote.price)}
                  </span>
                  <span className={`text-xs font-bold ${selectedQuote.change >= 0 ? 'text-emerald-700 dark:text-emerald-450' : 'text-rose-700 dark:text-rose-450'}`}>
                    {selectedQuote.change >= 0 ? '+' : ''}{selectedQuote.change.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-4 border-t border-[var(--color-border-card)] text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                  <div className="flex flex-col">
                    <span>Open</span>
                    <span className="text-[var(--color-text-primary)] font-extrabold text-xs mt-0.5">{formatINR(selectedQuote.open)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Prev Close</span>
                    <span className="text-[var(--color-text-primary)] font-extrabold text-xs mt-0.5">{formatINR(selectedQuote.prevClose)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>High</span>
                    <span className="text-emerald-700 dark:text-emerald-450 font-extrabold text-xs mt-0.5">{formatINR(selectedQuote.high)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Low</span>
                    <span className="text-rose-700 dark:text-rose-450 font-extrabold text-xs mt-0.5">{formatINR(selectedQuote.low)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-6 pt-4 border-t border-[var(--color-border-card)]">
                <button
                  onClick={() => navigate(`/trade?symbol=${selectedSymbol}&action=BUY`)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  Buy Asset
                </button>
                <button
                  onClick={() => navigate(`/trade?symbol=${selectedSymbol}&action=SELL`)}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-rose-500/10"
                >
                  Sell Asset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEmptyState ? (
        // Premium Empty State Design for Fresh Accounts
        <div className="theme-bg-card border p-16 rounded-3xl text-center max-w-xl mx-auto backdrop-blur-md relative overflow-hidden mt-12 shadow-2xl transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
          <div className="w-16 h-16 theme-bg-btn-slate border rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <BookOpen size={28} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-3">
            Welcome to TradeSim!
          </h3>
          <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed max-w-md mx-auto mb-8 font-medium">
            You currently hold no stocks and haven't placed any trades. Search for a major NSE stock (like <span className="text-emerald-500 dark:text-emerald-400 font-bold">RELIANCE.NS</span> or <span className="text-emerald-500 dark:text-emerald-400 font-bold">TCS.NS</span>) above, configure a Market/Limit order, and launch your paper trading career.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/watchlist')}
              className="py-3 px-6 theme-bg-btn-slate border hover:opacity-85 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all duration-300 cursor-pointer shadow-md"
            >
              Configure Watchlist
            </button>
            <button
              onClick={() => navigate('/trade?symbol=RELIANCE.NS&action=BUY')}
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all duration-300 cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
            >
              Simulate RELIANCE Trade
            </button>
          </div>
        </div>
      ) : (
        // Main Dashboard Data Layout
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recharts Portfolio Chart */}
          <div className="lg:col-span-2 theme-bg-card border p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between min-h-[350px] transition-all duration-300 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] tracking-wide">Net Worth History</h3>
              <p className="text-[var(--color-text-secondary)] text-[10px] font-bold uppercase tracking-wider mt-0.5">
                Snapshot value history tracked daily at market close (IST)
              </p>
            </div>
            
            <div className="flex-1 w-full h-[260px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-text-secondary)" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-nav)',
                      borderColor: 'var(--color-border-card)',
                      borderRadius: '16px',
                      color: 'var(--color-text-primary)',
                    }}
                    formatter={(val: any) => [formatINR(val), 'Net Worth']}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#areaColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side panel for Gainers/Losers widgets and recent ledgers */}
          <div className="flex flex-col gap-6">
            
            {/* Holdings Gainers / Losers Widget */}
            <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-md transition-all duration-300 shadow-sm">
              <h3 className="text-md font-bold text-[var(--color-text-primary)] tracking-wide mb-4">Holdings Performers</h3>
              
              <div className="flex flex-col gap-4">
                {/* Gainers */}
                <div>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider mb-2 block">
                    Top Gainers
                  </span>
                  {summary.topGainers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {summary.topGainers.map((g) => (
                        <div key={g.symbol} className="flex justify-between items-center p-2.5 theme-bg-btn-slate border rounded-2xl hover:opacity-90 transition-all duration-200">
                          <div>
                            <Link to={`/stock/${g.symbol}`} className="text-xs font-extrabold text-[var(--color-text-primary)] hover:underline hover:text-emerald-500 transition-colors duration-150">{g.symbol}</Link>
                            <div className="text-[10px] text-[var(--color-text-secondary)]">Qty: {g.quantity}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{formatINR(g.currentPrice)}</span>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">+{g.gainPercent.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-secondary)] block">No positive performers.</span>
                  )}
                </div>

                {/* Losers */}
                <div>
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider mb-2 block">
                    Top Losers
                  </span>
                  {summary.topLosers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {summary.topLosers.map((l) => (
                        <div key={l.symbol} className="flex justify-between items-center p-2.5 theme-bg-btn-slate border rounded-2xl hover:opacity-90 transition-all duration-200">
                          <div>
                            <Link to={`/stock/${l.symbol}`} className="text-xs font-extrabold text-[var(--color-text-primary)] hover:underline hover:text-emerald-500 transition-colors duration-150">{l.symbol}</Link>
                            <div className="text-[10px] text-[var(--color-text-secondary)]">Qty: {l.quantity}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{formatINR(l.currentPrice)}</span>
                            <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">{l.gainPercent.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-secondary)] block">No negative performers.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity (last 5 transactions) */}
            <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-md transition-all duration-300 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-[var(--color-text-primary)] tracking-wide">Recent Activity</h3>
                <Clock size={16} className="text-slate-500" />
              </div>

              {summary.recentTransactions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {summary.recentTransactions.map((tx) => {
                    const isBuy = tx.type === 'BUY';
                    return (
                      <div key={tx._id} className="flex items-center justify-between py-2 border-b border-[var(--color-border-card)] last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <Link to={`/stock/${tx.symbol}`} className="text-xs font-extrabold text-[var(--color-text-primary)] hover:underline hover:text-emerald-500 transition-colors duration-150">{tx.symbol}</Link>
                            <div className="text-[9px] text-[var(--color-text-secondary)] uppercase tracking-widest font-bold">
                              {isBuy ? 'Simulated Buy' : 'Simulated Sell'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-[var(--color-text-primary)]">{formatINR(tx.total)}</span>
                          <div className="text-[9px] text-[var(--color-text-secondary)] font-bold">
                            {tx.quantity} shares @ {formatINR(tx.price)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs text-[var(--color-text-secondary)] block py-4 text-center">No trades logged yet.</span>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;
