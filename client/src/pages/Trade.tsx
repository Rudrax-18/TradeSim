import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import StockSearch from '../components/StockSearch';
import { formatINR } from '../utils/format';
import { ArrowLeftRight, Wallet, AlertTriangle, Check, Loader2, Info } from 'lucide-react';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

const Trade: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { listen, emit } = useSocket();
  const [searchParams] = useSearchParams();
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [shares, setShares] = useState<number>(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingQuote, setFetchingQuote] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let active = true;

    const loadQuote = async () => {
      setFetchingQuote(true);
      try {
        const response = await api.get(`/api/stocks/${symbol}/quote`);
        if (active) {
          setQuote(response.data);
          setLimitPrice(response.data.price.toFixed(2));
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch stock quote:', err);
        if (active) {
          setError('Could not retrieve current market quote.');
        }
      } finally {
        if (active) {
          setFetchingQuote(false);
        }
      }
    };

    setQuote(null);
    setLimitPrice('');
    loadQuote();

    return () => {
      active = false;
    };
  }, [symbol]);

  // Sync symbol and action from search query parameters (e.g. /trade?symbol=TCS.NS&action=BUY)
  useEffect(() => {
    const qSymbol = searchParams.get('symbol');
    const qAction = searchParams.get('action');
    if (qSymbol) {
      setSymbol(qSymbol.toUpperCase());
    }
    if (qAction && ['BUY', 'SELL'].includes(qAction.toUpperCase())) {
      setAction(qAction.toUpperCase() as 'BUY' | 'SELL');
    }
  }, [searchParams]);

  // Set up socket watch for selected symbol
  useEffect(() => {
    if (symbol) {
      emit('watch:symbol', { symbol });
    }
    return () => {
      emit('unwatch:symbol');
    };
  }, [symbol]);

  // Listen for socket real-time price updates
  listen('price:update', (data: any) => {
    if (data.symbol === symbol) {
      setQuote((prev) => {
        if (prev) {
          return {
            ...prev,
            price: data.price,
            change: data.change,
            percentChange: data.percentChange,
          };
        }
        return prev;
      });
    }
  });

  // Listen for wallet balance changes
  listen('wallet:updated', (data: any) => {
    if (user) {
      updateUser({
        ...user,
        walletBalance: data.walletBalance,
      });
    }
  });

  const handleSelectSymbol = (selectedSymbol: string) => {
    setSymbol(selectedSymbol.toUpperCase());
    setSuccess(null);
    setError(null);
    setLimitPrice(''); // Reset limit price to auto-fill with new quote price
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!quote) return;
    if (shares <= 0) {
      setError('Number of shares must be greater than zero.');
      return;
    }

    if (orderType === 'LIMIT') {
      const priceLimit = parseFloat(limitPrice);
      if (isNaN(priceLimit) || priceLimit <= 0) {
        setError('Please enter a valid positive limit price.');
        return;
      }
    }

    const priceToUse = orderType === 'LIMIT' ? parseFloat(limitPrice) : quote.price;
    const estTotal = priceToUse * shares;

    if (action === 'BUY' && user && estTotal > user.walletBalance) {
      setError('Insufficient buying power to execute this simulated purchase.');
      return;
    }

    // Trigger confirmation modal
    setShowConfirm(true);
  };

  const executeTrade = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const payload = {
        symbol,
        type: action,
        shares,
        orderType,
        limitPrice: orderType === 'LIMIT' ? parseFloat(limitPrice) : undefined,
      };

      const response = await api.post('/api/orders', payload);

      setSuccess(response.data.message);
      setShares(1);

      // Update the user profile context state immediately so navbar updates balance
      if (user) {
        updateUser({
          ...user,
          walletBalance: response.data.walletBalance,
        });
      }
    } catch (err: any) {
      console.error('Trade execution failed:', err);
      setError(err.response?.data?.message || 'Failed to execute simulated trade');
    } finally {
      setLoading(false);
    }
  };

  const priceToUse = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) || 0 : (quote ? quote.price : 0);
  const estTotalCost = priceToUse * shares;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--color-text-primary)]">
          <ArrowLeftRight className="text-emerald-500 dark:text-emerald-400" />
          <span>Simulated Trade Desk</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium">
          Execute mock buy and sell orders against real-time price feeds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Ticket form (2 Cols) */}
        <div className="lg:col-span-2 theme-bg-card border p-8 rounded-3xl backdrop-blur-sm relative z-30 transition-all duration-300 shadow-sm">
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">Select Symbol:</span>
            <StockSearch onSelectSymbol={handleSelectSymbol} />
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-450 text-sm">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-550 text-sm">
              <Check size={20} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-6">
            {/* Buy / Sell Tabs */}
            <div className="flex theme-bg-btn-slate p-1.5 rounded-2xl border max-w-xs transition-all duration-300">
              <button
                type="button"
                onClick={() => setAction('BUY')}
                className={`flex-1 py-2 text-center rounded-xl text-sm font-bold uppercase transition-all duration-300 cursor-pointer ${
                  action === 'BUY'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                className={`flex-1 py-2 text-center rounded-xl text-sm font-bold uppercase transition-all duration-300 cursor-pointer ${
                  action === 'SELL'
                    ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/10'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Order Type Tabs */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest pl-1">
                Order Type
              </label>
              <div className="flex theme-bg-btn-slate p-1.5 rounded-2xl border max-w-xs transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer border ${
                    orderType === 'MARKET'
                      ? 'bg-slate-955 dark:bg-slate-900 text-emerald-500 dark:text-emerald-400 border-emerald-500/10 shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border-transparent'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer border ${
                    orderType === 'LIMIT'
                      ? 'bg-slate-955 dark:bg-slate-900 text-emerald-500 dark:text-emerald-400 border-emerald-500/10 shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border-transparent'
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest pl-1">
                  Symbol
                </label>
                <div className="theme-bg-btn-slate border rounded-xl px-4 py-3.5 text-lg font-bold text-[var(--color-text-primary)] uppercase flex items-center justify-between transition-all duration-300">
                  <span>{symbol}</span>
                  {fetchingQuote && <Loader2 size={16} className="animate-spin text-emerald-500" />}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest pl-1">
                  Number of Shares
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-border-input)] focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-bold text-[var(--color-text-primary)] outline-none transition-all duration-300"
                  required
                />
              </div>

              {orderType === 'LIMIT' && (
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest pl-1 flex items-center gap-1.5">
                    <span>Limit Trigger Price (₹)</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] normal-case font-semibold flex items-center gap-1">
                      <Info size={10} />
                      Current quote is {quote ? formatINR(quote.price) : 'loading...'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={fetchingQuote ? '' : limitPrice}
                    disabled={fetchingQuote}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={fetchingQuote ? "Fetching trigger price..." : "Enter limit price trigger..."}
                    className="bg-[var(--color-bg-input)] border border-[var(--color-border-input)] focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-bold text-[var(--color-text-primary)] outline-none transition-all duration-300 disabled:opacity-50"
                    required
                  />
                </div>
              )}
            </div>

            {/* Total Cost Calculation panel */}
            {quote ? (
              <div className="theme-bg-btn-slate border rounded-2xl p-5 space-y-3 transition-all duration-300">
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)] font-bold">
                  <span>Estimated Price:</span>
                  <span className="text-[var(--color-text-primary)]">
                    {orderType === 'LIMIT' ? `₹${parseFloat(limitPrice || '0').toFixed(2)} (Limit)` : formatINR(quote.price)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)] font-bold">
                  <span>Quantity:</span>
                  <span className="text-[var(--color-text-primary)]">x {shares}</span>
                </div>
                <hr className="border-[var(--color-border-card)]" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {orderType === 'LIMIT' ? 'Estimated Total:' : 'Cost Basis Subtotal:'}
                  </span>
                  <span className="font-black text-emerald-555 dark:text-emerald-400">{formatINR(estTotalCost)}</span>
                </div>
              </div>
            ) : (
              <div className="theme-bg-btn-slate border rounded-2xl p-5 flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)] font-bold transition-all duration-300">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span>Loading latest quote feeds...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !quote}
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all duration-300 disabled:opacity-50 text-slate-950 cursor-pointer ${
                action === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/10'
                  : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/10'
              }`}
            >
              {loading ? 'Executing Trade...' : `Place Simulated ${action} Order`}
            </button>
          </form>
        </div>

        {/* Right Side: Quick info details */}
        <div className="space-y-6">
          {/* Simulated wallet cash */}
          <div className="theme-bg-card border p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 p-2.5 rounded-xl">
                <Wallet size={20} />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)]">Account Funds</h3>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider block mb-1">
              Simulated Buying Power
            </span>
            <span className="text-2xl font-black text-emerald-555 dark:text-emerald-400 block">
              {formatINR(user?.walletBalance || 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-nav)] border border-[var(--color-border-card)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Confirm Simulated Order
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-semibold">
                Please verify the details below to execute this mock paper trade.
              </p>
            </div>

            <div className="theme-bg-btn-slate rounded-2xl p-4 border text-sm space-y-3.5 transition-all duration-300">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)] font-semibold">Symbol:</span>
                <span className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)] font-semibold">Action:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase ${
                  action === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                }`}>
                  {action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)] font-semibold">Mode:</span>
                <span className="text-[var(--color-text-primary)] font-bold uppercase">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)] font-semibold">Quantity:</span>
                <span className="text-[var(--color-text-primary)] font-mono font-bold">{shares} shares</span>
              </div>
              {orderType === 'LIMIT' && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)] font-semibold">Trigger Price:</span>
                  <span className="text-[var(--color-text-primary)] font-mono font-bold">{formatINR(parseFloat(limitPrice))}</span>
                </div>
              )}
              <hr className="border-[var(--color-border-card)]" />
              <div className="flex justify-between text-base">
                <span className="text-[var(--color-text-primary)] font-bold">Total Estimated:</span>
                <span className="text-emerald-555 dark:text-emerald-400 font-black font-mono">{formatINR(estTotalCost)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 theme-bg-btn-slate border hover:opacity-85 text-[var(--color-text-primary)] rounded-xl text-sm font-bold uppercase transition-all duration-300 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={executeTrade}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0b0f19] rounded-xl text-sm font-extrabold uppercase transition-all duration-300 shadow-md shadow-emerald-500/5 cursor-pointer"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trade;
