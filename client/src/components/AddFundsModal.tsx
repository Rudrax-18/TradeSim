import React, { useState } from 'react';
import { X, Wallet, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { formatINR } from '../utils/format';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

const AddFundsModal: React.FC<AddFundsModalProps> = ({ isOpen, onClose, currentBalance }) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets = [10000, 50000, 100000, 500000];

  const handleAddFunds = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }

    if (numericAmount < 1000) {
      setError('Minimum deposit amount is ₹1,000.');
      return;
    }

    if (numericAmount > 5000000) {
      setError('Maximum single deposit amount is ₹50,00,000.');
      return;
    }

    if (currentBalance + numericAmount > 10000000) {
      setError('Limit exceeded. Maximum wallet balance limit is ₹1,00,00,000.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/wallet/add-funds', { amount: numericAmount });
      setSuccess(`Simulated funds ${formatINR(numericAmount)} successfully added to your wallet.`);
      setAmount('');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to add funds:', err);
      setError(err.response?.data?.message || 'Failed to complete deposit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="theme-bg-card border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-border-card)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
              <Wallet size={18} />
            </div>
            <h3 className="font-extrabold text-base text-[var(--color-text-primary)]">Top Up Wallet</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-slate-500 transition-colors duration-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAddFunds} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl text-rose-500 dark:text-rose-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-600 dark:text-emerald-450 text-xs font-semibold">
              <Check size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="text-center py-2">
            <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider block">Current Cash</span>
            <span className="text-2xl font-black text-[var(--color-text-primary)] leading-tight mt-1 block font-mono">
              {formatINR(currentBalance)}
            </span>
          </div>

          {/* Quick Presets Grid */}
          <div className="space-y-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider block">Quick Presets</span>
            <div className="grid grid-cols-2 gap-2.5">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(val.toString());
                    setError(null);
                  }}
                  className="py-2.5 theme-bg-btn-slate border border-[var(--color-border-card)] hover:border-emerald-500/35 text-xs font-black rounded-xl text-[var(--color-text-primary)] hover:text-emerald-500 transition-colors duration-255 cursor-pointer text-center"
                >
                  +{formatINR(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="space-y-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider block">Custom Deposit Amount (₹)</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold text-sm">₹</span>
              <input
                type="number"
                placeholder="Enter deposit value (e.g. 50,000)"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                className="w-full pl-8 pr-4 py-3 theme-bg-btn-slate border rounded-xl font-bold font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                min="1000"
                max="5000000"
              />
            </div>
            <span className="text-[8px] text-[var(--color-text-secondary)] font-medium leading-none block">
              Simulated Deposit range: Min ₹1,00,000 • Max ₹50,00,000 per request.
            </span>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider text-xs rounded-2xl transition-all duration-300 shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Depositing...</span>
              </>
            ) : (
              <span>Confirm Top Up</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddFundsModal;
