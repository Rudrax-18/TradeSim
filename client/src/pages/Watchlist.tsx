import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import StockSearch from '../components/StockSearch';
import { Star, AlertCircle, RefreshCw, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatINR } from '../utils/format';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
}

const Watchlist: React.FC = () => {
  const { listen } = useSocket();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for socket real-time price updates for watched items
  listen('price:update', (data: any) => {
    const updatedSymbol = data.symbol;
    setQuotes((prev) =>
      prev.map((quote) =>
        quote.symbol === updatedSymbol
          ? {
              ...quote,
              price: data.price,
              change: data.change,
              percentChange: data.percentChange,
            }
          : quote
      )
    );
  });

  const fetchWatchlistQuotes = async () => {
    setLoading(true);
    try {
      // 1. Fetch watched symbols from dedicated Watchlist model
      const watchlistRes = await api.get('/api/watchlist');
      const symbols: string[] = watchlistRes.data.symbols || [];

      if (symbols.length === 0) {
        setQuotes([]);
        setLoading(false);
        return;
      }

      // 2. Fetch quote objects
      const promises = symbols.map((symbol) =>
        api.get(`/api/stocks/${symbol}/quote`).then((res) => res.data)
      );
      const data = await Promise.all(promises);
      setQuotes(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load watchlist quotes:', err);
      setError('Could not retrieve quotes for watched symbols.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlistQuotes();
  }, []);

  const handleRemove = async (symbol: string) => {
    try {
      await api.delete(`/api/watchlist/${symbol}`);
      setQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
    } catch (err) {
      console.error('Failed to remove symbol:', err);
    }
  };

  const handleAdd = async (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    if (quotes.some((q) => q.symbol === upperSymbol)) return;

    try {
      await api.post(`/api/watchlist/${upperSymbol}`);
      
      // Fetch quote for the new symbol and append it
      const quoteRes = await api.get(`/api/stocks/${upperSymbol}/quote`);
      setQuotes((prev) => [...prev, quoteRes.data]);
    } catch (err) {
      console.error('Failed to add symbol to watchlist:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-30">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--color-text-primary)]">
            <Star className="text-amber-450 fill-amber-450 animate-pulse" />
            <span>My Ticker Watchlist</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium">
            Track your favorite NSE symbols with live price updates and trigger instant orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StockSearch onSelectSymbol={handleAdd} />
          <button
            onClick={fetchWatchlistQuotes}
            className="p-3 theme-bg-btn-slate border hover:opacity-85 text-slate-500 dark:text-slate-300 rounded-2xl transition-all duration-300 cursor-pointer shadow-md"
            title="Refresh List"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400 text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        // Loading skeletons (not spinners)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="theme-bg-card border p-6 rounded-3xl animate-pulse flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-24 bg-slate-800/20 rounded-lg" />
                <div className="h-5 w-16 bg-slate-800/20 rounded-lg" />
              </div>
              <div className="h-8 w-32 bg-slate-800/20 rounded-lg" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-10 bg-slate-800/20 rounded-xl" />
                <div className="h-10 bg-slate-800/20 rounded-xl" />
                <div className="h-10 bg-slate-800/20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : quotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote) => {
            const isPositive = quote.change >= 0;
            return (
              <div
                key={quote.symbol}
                className="theme-bg-card border p-6 rounded-3xl backdrop-blur-md transition-all duration-300 flex flex-col justify-between gap-4 group hover:shadow-xl hover:shadow-emerald-950/5 relative"
              >
                <div>
                  {/* Stock Symbol and Change Badge */}
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <Link to={`/stock/${quote.symbol}`} className="text-lg font-extrabold text-[var(--color-text-primary)] tracking-wide hover:underline hover:text-emerald-500 transition-colors duration-200">{quote.symbol}</Link>
                    <span className={`flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    }`}>
                      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(quote.percentChange).toFixed(2)}%
                    </span>
                  </div>

                  {/* Stock Pricing */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                      {formatINR(quote.price)}
                    </span>
                    <span className={`text-xs font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {isPositive ? '+' : ''}{quote.change.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Stock Analytics Grid */}
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 mt-4 pt-3 border-t border-[var(--color-border-card)] text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
                    <div className="flex justify-between">
                      <span>High:</span>
                      <span className="text-[var(--color-text-primary)] font-extrabold">{formatINR(quote.high)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low:</span>
                      <span className="text-[var(--color-text-primary)] font-extrabold">{formatINR(quote.low)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (Buy, Sell, Delete) */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--color-border-card)]">
                  <button
                    onClick={() => navigate(`/trade?symbol=${quote.symbol}&action=BUY`)}
                    className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-white dark:hover:text-slate-950 border border-emerald-500/20 px-3 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all duration-300 cursor-pointer shadow-md hover:shadow-emerald-500/20 text-center"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => navigate(`/trade?symbol=${quote.symbol}&action=SELL`)}
                    className="py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-700 dark:text-rose-400 hover:text-white dark:hover:text-slate-950 border border-rose-500/20 px-3 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all duration-300 cursor-pointer shadow-md hover:shadow-rose-500/20 text-center"
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => handleRemove(quote.symbol)}
                    className="py-2.5 theme-bg-btn-slate border hover:bg-rose-500/10 hover:text-rose-750 dark:hover:text-rose-400 px-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1"
                    title="Remove Ticker"
                  >
                    <Trash2 size={12} />
                    <span>Drop</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Watchlist Empty State (with Search Prompt & CTA)
        <div className="theme-bg-card border p-16 rounded-3xl text-center max-w-lg mx-auto backdrop-blur shadow-2xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
          <Star size={48} className="mx-auto text-amber-500 mb-5 animate-pulse" />
          <h3 className="text-xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-2">Watchlist is Empty</h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-6 font-medium">
            Search for stocks using the ticker input above (e.g. RELIANCE.NS, TCS.NS) to build your custom live quote monitor.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 theme-bg-btn-slate border rounded-2xl text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
            💡 Tip: Live prices update via secure websockets!
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
