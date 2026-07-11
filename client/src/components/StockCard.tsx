import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
}

interface StockCardProps {
  quote: StockQuote;
  onClick?: () => void;
  selected?: boolean;
}

const StockCard: React.FC<StockCardProps> = ({ quote, onClick, selected }) => {
  const isPositive = quote.change >= 0;

  return (
    <div
      onClick={onClick}
      className={`group relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer ${
        selected
          ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/5'
          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 shadow-sm'
      } ${onClick ? 'active:scale-95' : ''}`}
    >
      {/* Background glow effects for dynamic visual appeal */}
      <div
        className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500 pointer-events-none ${
          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="font-extrabold text-lg text-white tracking-wide">{quote.symbol}</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            INR Quote
          </span>
        </div>
        <div
          className={`p-2 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-slate-100 tracking-tight">
          {formatINR(quote.price)}
        </span>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}
            {quote.change.toFixed(2)}
          </span>
          <span
            className={`text-xs font-semibold ${
              isPositive ? 'text-emerald-500/80' : 'text-rose-500/80'
            }`}
          >
            {isPositive ? '+' : ''}
            {quote.percentChange.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
