import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import StockChart from '../components/StockChart';
import { formatINR } from '../utils/format';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertCircle,
  Loader2
} from 'lucide-react';

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

interface StockFundamentals {
  marketCap: number | null;
  trailingPE: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  trailingEps: number | null;
  faceValue: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  beta: number | null;
}

const formatMarketCap = (marketCap: number | null) => {
  if (marketCap === null || marketCap === undefined) return '';
  if (marketCap >= 1e12) return `₹${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `₹${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e7) return `₹${(marketCap / 1e7).toFixed(2)}Cr`;
  if (marketCap >= 1e5) return `₹${(marketCap / 1e5).toFixed(2)}L`;
  return `₹${marketCap.toLocaleString()}`;
};

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

const StockDetails: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { listen, emit } = useSocket();

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<StockFundamentals | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cleanSymbol = symbol ? symbol.toUpperCase() : '';

  const fetchDetails = async () => {
    if (!cleanSymbol) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch current stock quote, portfolio details, and fundamentals in parallel
      const [quoteRes, portfolioRes, fundamentalsRes] = await Promise.all([
        api.get(`/api/stocks/${cleanSymbol}/quote`),
        api.get('/api/portfolio'),
        api.get(`/api/stocks/${cleanSymbol}/fundamentals`)
      ]);

      setQuote(quoteRes.data);
      setFundamentals(fundamentalsRes.data);

      // Find user holding for this stock if any
      const matchingHolding = portfolioRes.data.find(
        (h: Holding) => h.symbol.toUpperCase() === cleanSymbol
      );
      setHolding(matchingHolding || null);
    } catch (err: any) {
      console.error('Failed to load stock details:', err);
      setError('Could not retrieve stock metrics or details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [cleanSymbol]);

  // Set up socket watch for real-time updates
  useEffect(() => {
    if (cleanSymbol) {
      emit('watch:symbol', { symbol: cleanSymbol });
    }
    return () => {
      emit('unwatch:symbol');
    };
  }, [cleanSymbol]);

  // Listen to socket price updates
  listen('price:update', (data: any) => {
    if (data.symbol === cleanSymbol) {
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          price: data.price,
          change: data.change ?? prev.change,
          percentChange: data.percentChange ?? prev.percentChange,
        };
      });

      // Update position calculations dynamically if user holds this stock
      setHolding((prevHolding) => {
        if (!prevHolding) return prevHolding;
        const newPrice = data.price;
        const newValue = prevHolding.quantity * newPrice;
        const newGain = newValue - (prevHolding.quantity * prevHolding.averageBuyPrice);
        const newGainPercent = prevHolding.averageBuyPrice > 0 
          ? (newGain / (prevHolding.quantity * prevHolding.averageBuyPrice)) * 100 
          : 0;

        return {
          ...prevHolding,
          currentPrice: newPrice,
          value: parseFloat(newValue.toFixed(2)),
          gain: parseFloat(newGain.toFixed(2)),
          gainPercent: parseFloat(newGainPercent.toFixed(2)),
        };
      });
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
        <span className="text-sm font-bold text-[var(--color-text-secondary)]">Loading stock intelligence...</span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-rose-400">
        <AlertCircle size={40} className="mx-auto mb-4" />
        <h3 className="font-extrabold mb-2 text-lg">Error Loading Stock Details</h3>
        <p className="text-sm mb-6">{error || 'Asset not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-rose-500 text-white rounded-xl font-bold cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[var(--color-text-primary)] font-bold text-xs uppercase tracking-wider mb-4 cursor-pointer transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
          
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight uppercase flex items-center gap-2">
                <span>{quote.symbol}</span>
              </h1>
              <p className="text-[var(--color-text-secondary)] text-xs font-semibold uppercase tracking-wider mt-1">
                Common Equity • NSE India
              </p>
            </div>
            
            <span className={`flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-black ${
              isPositive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
            }`}>
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(quote.percentChange).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Live quote metrics summary */}
        <div className="text-left md:text-right flex flex-col justify-end">
          <span className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            {formatINR(quote.price)}
          </span>
          <span className={`text-sm font-bold mt-0.5 ${isPositive ? 'text-emerald-700 dark:text-emerald-450' : 'text-rose-700 dark:text-rose-455'}`}>
            {isPositive ? '+' : ''}{quote.change.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Historical Area Chart */}
        <div className="lg:col-span-2">
          <StockChart symbol={cleanSymbol} currentPrice={quote.price} />
        </div>

        {/* Right Col: Stats, Position, CTAs */}
        <div className="space-y-6">
          {/* User Holdings Position (Conditional) */}
          {holding && (
            <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                  <Briefcase size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-[var(--color-text-primary)]">Your Position</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>Shares Held</span>
                  <span className="text-[var(--color-text-primary)] font-black text-sm mt-0.5 font-mono">{holding.quantity}</span>
                </div>
                <div className="flex flex-col">
                  <span>Average Cost</span>
                  <span className="text-[var(--color-text-primary)] font-black text-sm mt-0.5 font-mono">{formatINR(holding.averageBuyPrice)}</span>
                </div>
                <div className="flex flex-col">
                  <span>Current Value</span>
                  <span className="text-[var(--color-text-primary)] font-black text-sm mt-0.5 font-mono">{formatINR(holding.value)}</span>
                </div>
                <div className="flex flex-col">
                  <span>Unrealized Return</span>
                  <span className={`text-sm font-black mt-0.5 font-mono ${holding.gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-450'}`}>
                    {holding.gain >= 0 ? '+' : ''}{formatINR(holding.gain)}
                    <span className="text-[10px] ml-1">({holding.gain >= 0 ? '+' : ''}{holding.gainPercent.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Day Metrics Stats */}
          <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm">
            <h3 className="font-extrabold text-sm text-[var(--color-text-primary)] mb-4">Market Stats</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">
              <div className="flex flex-col">
                <span>Open</span>
                <span className="text-[var(--color-text-primary)] font-extrabold text-xs mt-0.5">{formatINR(quote.open)}</span>
              </div>
              <div className="flex flex-col">
                <span>Prev Close</span>
                <span className="text-[var(--color-text-primary)] font-extrabold text-xs mt-0.5">{formatINR(quote.prevClose)}</span>
              </div>
              <div className="flex flex-col">
                <span>High</span>
                <span className="text-emerald-700 dark:text-emerald-450 font-extrabold text-xs mt-0.5">{formatINR(quote.high)}</span>
              </div>
              <div className="flex flex-col">
                <span>Low</span>
                <span className="text-rose-700 dark:text-rose-455 font-extrabold text-xs mt-0.5">{formatINR(quote.low)}</span>
              </div>
              <div className="flex flex-col col-span-2 pt-2 border-t border-[var(--color-border-card)]">
                <span>Volume</span>
                <span className="text-[var(--color-text-primary)] font-extrabold text-xs mt-0.5">{quote.volume.toLocaleString()} shares</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Order Box */}
          <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-[var(--color-text-primary)] mb-1">Place Simulated Order</h3>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/trade?symbol=${cleanSymbol}&action=BUY`)}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-emerald-500/10 text-center"
              >
                Buy {cleanSymbol}
              </button>
              <button
                onClick={() => navigate(`/trade?symbol=${cleanSymbol}&action=SELL`)}
                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-rose-500/10 text-center"
              >
                Sell {cleanSymbol}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Company Essentials Section */}
      {fundamentals && (
        <div className="mt-12 theme-bg-card border p-8 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-indigo-500" />
          <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-6">Company Essentials</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fundamentals.marketCap !== null && fundamentals.marketCap !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Market Capitalisation</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{formatMarketCap(fundamentals.marketCap)}</span>
              </div>
            )}
            {fundamentals.trailingPE !== null && fundamentals.trailingPE !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">P/E Ratio (Trailing)</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{fundamentals.trailingPE.toFixed(2)}</span>
              </div>
            )}
            {fundamentals.priceToBook !== null && fundamentals.priceToBook !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">P/B Ratio (Price-to-Book)</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{fundamentals.priceToBook.toFixed(2)}</span>
              </div>
            )}
            {fundamentals.dividendYield !== null && fundamentals.dividendYield !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Dividend Yield</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{(fundamentals.dividendYield * 100).toFixed(2)}%</span>
              </div>
            )}
            {fundamentals.trailingEps !== null && fundamentals.trailingEps !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">EPS (TTM)</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{formatINR(fundamentals.trailingEps)}</span>
              </div>
            )}
            {fundamentals.faceValue !== null && fundamentals.faceValue !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Face Value</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">₹{fundamentals.faceValue.toFixed(2)}</span>
              </div>
            )}
            {fundamentals.fiftyTwoWeekHigh !== null && fundamentals.fiftyTwoWeekHigh !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">52-Week High</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1.5">{formatINR(fundamentals.fiftyTwoWeekHigh)}</span>
              </div>
            )}
            {fundamentals.fiftyTwoWeekLow !== null && fundamentals.fiftyTwoWeekLow !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">52-Week Low</span>
                <span className="text-base font-black text-rose-700 dark:text-rose-400 mt-1.5">{formatINR(fundamentals.fiftyTwoWeekLow)}</span>
              </div>
            )}
            {fundamentals.beta !== null && fundamentals.beta !== undefined && (
              <div className="theme-bg-btn-slate border p-4.5 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider">Beta</span>
                <span className="text-base font-black text-[var(--color-text-primary)] mt-1.5">{fundamentals.beta.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
