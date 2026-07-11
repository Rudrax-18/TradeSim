import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR } from '../utils/format';

interface HistoryPoint {
  time: number;
  timeLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  currentPrice: number;
}

type RangeType = '1D' | '1W' | '1M' | '1Y';

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [range, setRange] = useState<RangeType>('1M');
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/api/stocks/${symbol}/history?range=${range}`);
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to load chart history:', err);
        setError('Could not retrieve chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [symbol, range]);

  // Determine if the price trend is positive over the selected window
  const isTrendPositive = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const strokeColor = isTrendPositive ? '#10b981' : '#f43f5e'; // emerald vs rose
  const fillColor = isTrendPositive ? 'url(#colorEmerald)' : 'url(#colorRose)';

  const rangeButtons: { label: string; value: RangeType }[] = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '1Y', value: '1Y' },
  ];

  // Custom tooltips matching our glassmorphism aesthetics
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as HistoryPoint;
      return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
            {dataPoint.timeLabel}
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-6 text-sm">
              <span className="text-slate-400">Price:</span>
              <span className="font-bold text-white">{formatINR(dataPoint.close)}</span>
            </div>
            {range !== '1D' && (
              <>
                <div className="flex items-center justify-between gap-6 text-xs text-slate-500">
                  <span>Open/High:</span>
                  <span>
                    ₹{dataPoint.open.toFixed(2)} / ₹{dataPoint.high.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 text-xs text-slate-500">
                  <span>Low/Vol:</span>
                  <span>
                    ₹{dataPoint.low.toFixed(2)} / {dataPoint.volume.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Find min and max values to keep chart bounded nicely
  const prices = data.map((d) => d.close);
  const minPrice = prices.length ? Math.min(...prices) * 0.995 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.005 : 100;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isTrendPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {isTrendPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">{symbol} Price History</h3>
            <p className="text-xs text-slate-400 font-medium">Real-time mock/api charting feed</p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800/60 self-start sm:self-auto">
          {rangeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRange(btn.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                range === btn.value
                  ? 'bg-emerald-500 text-[#0b0f19] shadow-md shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-72 w-full flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-[#0b0f19]/30 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="text-emerald-400 animate-spin" size={32} />
          </div>
        )}

        {error && (
          <div className="text-slate-500 text-sm font-semibold">{error}</div>
        )}

        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                {/* Visual gradients */}
                <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="timeLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={fillColor}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default StockChart;
