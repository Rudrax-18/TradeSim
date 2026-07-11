import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatINR } from '../utils/format';
import { ArrowLeftRight, Loader2, RefreshCw, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Order {
  _id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  limitPrice: number | null;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/api/orders' : `/api/orders?status=${statusFilter}`;
      const response = await api.get(url);
      setOrders(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError('Could not retrieve orders log data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await api.delete(`/api/orders/${orderId}`);
      // Refresh list
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      alert(err.response?.data?.message || 'Failed to cancel the pending order');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={12} />
            <span>PENDING</span>
          </span>
        );
      case 'EXECUTED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/10 text-emerald-550 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 size={12} />
            <span>EXECUTED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold theme-bg-btn-slate text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full border">
            <XCircle size={12} />
            <span>CANCELLED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold bg-rose-500/10 text-rose-550 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
            <AlertCircle size={12} />
            <span>FAILED</span>
          </span>
        );
      default:
        return null;
    }
  };

  const filterTabs = ['ALL', 'PENDING', 'EXECUTED', 'CANCELLED', 'FAILED'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-30">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--color-text-primary)]">
            <ArrowLeftRight className="text-emerald-500 dark:text-emerald-400" />
            <span>Simulated Order Desk Logs</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1 font-medium">
            Review live execution ledger audits, pending limit triggers, and order statuses.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-3 theme-bg-btn-slate border hover:opacity-85 text-slate-500 dark:text-slate-300 rounded-2xl transition-all duration-300 cursor-pointer shadow-md flex items-center justify-center self-start md:self-auto"
          title="Refresh List"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-450 text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center flex-wrap gap-2 mb-8 theme-bg-btn-slate p-1.5 rounded-2xl border max-w-2xl transition-all duration-300">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer border ${
              statusFilter === tab
                ? 'bg-slate-950 dark:bg-slate-900 text-emerald-500 dark:text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/5'
                : 'text-slate-500 dark:text-slate-400 hover:text-[var(--color-text-primary)] border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
        </div>
      ) : orders.length > 0 ? (
        <div className="theme-bg-card border rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-card)] text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-extrabold">
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Execution Mode</th>
                  <th className="px-6 py-4 text-right">Quantity</th>
                  <th className="px-6 py-4 text-right">Target / Execution Price</th>
                  <th className="px-6 py-4 text-right">Total Est / Actual Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Placed</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold divide-y divide-[var(--color-border-card)]">
                {orders.map((order) => {
                  const isBuy = order.type === 'BUY';
                  const date = new Date(order.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  // If PENDING and LIMIT, show limit price. Otherwise show execution price.
                  const displayPrice = order.status === 'PENDING' ? (order.limitPrice || 0) : order.price;
                  const displayTotal = displayPrice * order.quantity;

                  return (
                    <tr key={order._id} className="hover:bg-slate-200/30 dark:hover:bg-slate-800/20 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <Link to={`/stock/${order.symbol}`} className="text-[var(--color-text-primary)] text-base font-extrabold uppercase hover:underline hover:text-emerald-500 transition-colors duration-200">{order.symbol}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {order.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-[var(--color-text-primary)] theme-bg-btn-slate px-2 py-1 rounded-lg border text-xs">
                          {order.orderType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">
                        {order.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--color-text-primary)] font-mono">
                        {formatINR(displayPrice)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-500 dark:text-emerald-400 font-mono">
                        {formatINR(displayTotal)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-secondary)] text-xs font-semibold">
                        {date}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            disabled={cancellingId === order._id}
                            className="bg-rose-500/10 hover:bg-rose-550 text-rose-500 hover:text-white border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                            title="Cancel limit order"
                          >
                            <Trash2 size={12} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="theme-bg-card border p-12 rounded-3xl text-center max-w-lg mx-auto transition-all duration-300 shadow-sm">
          <ArrowLeftRight size={40} className="mx-auto text-slate-500 mb-4" />
          <h3 className="font-bold text-[var(--color-text-primary)] mb-1">No Orders Found</h3>
          <p className="text-sm text-[var(--color-text-secondary)] font-medium">
            No simulated orders found matching status filter "{statusFilter.toLowerCase()}".
          </p>
        </div>
      )}
    </div>
  );
};

export default Orders;
