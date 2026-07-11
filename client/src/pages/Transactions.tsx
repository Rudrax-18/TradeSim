import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import api from '../services/api';
import { formatINR } from '../utils/format';

interface Transaction {
  _id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  createdAt: string;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/api/transactions');
        setTransactions(response.data);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

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
          <ArrowLeftRight className="text-emerald-500 dark:text-emerald-400" />
          <span>Simulated Order Log</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium">
          Historical ledger of all executed simulated purchases and sales.
        </p>
      </div>

      {/* Transaction Log Table */}
      <div className="theme-bg-card border rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div className="px-6 py-5 border-b border-[var(--color-border-card)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--color-text-primary)]">Execution History</h3>
          <span className="text-[10px] theme-bg-btn-slate border text-[var(--color-text-secondary)] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
            {transactions.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border-card)] text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-extrabold">
                <th className="px-6 py-4">Execution Date</th>
                <th className="px-6 py-4">Ticker</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 text-right">Shares</th>
                <th className="px-6 py-4 text-right">Price Per Share</th>
                <th className="px-6 py-4 text-right">Total Outlay</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-[var(--color-border-card)]">
              {transactions.map((tx) => {
                const isBuy = tx.type === 'BUY';
                const formattedDate = new Date(tx.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={tx._id} className="hover:bg-slate-200/30 dark:hover:bg-slate-800/20 transition-colors duration-150">
                    <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono text-xs font-semibold">{formattedDate}</td>
                    <td className="px-6 py-4">
                      <Link to={`/stock/${tx.symbol}`} className="text-[var(--color-text-primary)] font-extrabold text-base tracking-wide hover:underline hover:text-emerald-500 transition-colors duration-200">{tx.symbol}</Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                        isBuy 
                          ? 'bg-emerald-500/10 text-emerald-550 dark:text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-550 dark:text-rose-400'
                      }`}>
                        {isBuy ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">{tx.shares}</td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-secondary)] font-mono">{formatINR(tx.price)}</td>
                    <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono font-bold">{formatINR(tx.total)}</td>
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

export default Transactions;
