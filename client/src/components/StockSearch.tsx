import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, Loader2 } from 'lucide-react';

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

interface StockSearchProps {
  onSelectSymbol: (symbol: string) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectSymbol }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debouncing hook logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/stocks/search?q=${query}`);
        setResults(response.data);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to search stocks:', err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle outside clicks to close autocomplete overlay
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md z-30">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks by symbol or name (e.g. RELIANCE)..."
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] focus:border-emerald-500 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none transition-all duration-300 shadow-md focus:shadow-emerald-500/5 focus:ring-1 focus:ring-emerald-500/30 font-semibold"
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={18} />
        </div>
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-555 dark:text-emerald-400 animate-spin">
            <Loader2 size={18} />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-[var(--color-bg-input)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl z-[100] overflow-hidden max-h-60 overflow-y-auto transition-all duration-300">
          {results.map((item) => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(item.symbol)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-200/50 dark:hover:bg-slate-900 transition-all duration-200 text-left border-b border-[var(--color-border-card)] last:border-0"
            >
              <div className="flex flex-col">
                <span className="font-bold text-[var(--color-text-primary)] tracking-wide">{item.symbol}</span>
                <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[280px] font-semibold">
                  {item.description}
                </span>
              </div>
              <span className="text-[10px] theme-bg-btn-slate border text-[var(--color-text-secondary)] px-2 py-0.5 rounded-md uppercase font-bold">
                {item.type}
              </span>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && !loading && query.trim() !== '' && (
        <div className="absolute left-0 right-0 mt-2 bg-[var(--color-bg-input)] border border-[var(--color-border-card)] rounded-2xl p-4 text-center text-[var(--color-text-secondary)] text-sm z-[100] shadow-2xl transition-all duration-300">
          No matches found for "{query}"
        </div>
      )}
    </div>
  );
};

export default StockSearch;
