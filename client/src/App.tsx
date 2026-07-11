import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Trade from './pages/Trade';
import Watchlist from './pages/Watchlist';
import Transactions from './pages/Transactions';
import Orders from './pages/Orders';
import StockDetails from './pages/StockDetails';

// A simple layout wrapper that includes the navbar and global socket notification overlays
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { listen } = useSocket();
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string }>>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Register global socket alerts (safely cleans up on unmount)
  listen('order:executed', (data: any) => {
    const isLimit = data.orderType === 'LIMIT';
    const actionLabel = data.type === 'BUY' ? 'Bought' : 'Sold';
    addToast(
      'success',
      isLimit ? 'Limit Order Filled 📈' : 'Market Order Executed 🚀',
      `${actionLabel} ${data.quantity} shares of ${data.symbol} at ₹${data.price.toFixed(2)}`
    );
  });

  listen('order:failed', (data: any) => {
    addToast(
      'error',
      'Order Execution Failed ❌',
      `Failed to execute ${data.type} order for ${data.symbol}: ${data.message}`
    );
  });

  return (
    <div className="min-h-screen theme-bg-app theme-text-primary flex flex-col relative transition-colors duration-300">
      <Navbar />
      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Global Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex flex-col gap-1 transition-all duration-300 animate-in slide-in-from-bottom-4 duration-300 ${
              t.type === 'success'
                ? 'bg-slate-900 border-emerald-500/30 text-slate-100'
                : t.type === 'error'
                ? 'bg-slate-900 border-rose-500/30 text-slate-100'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-extrabold uppercase tracking-wide ${
                t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {t.title}
              </span>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">{t.message}</p>
          </div>
        ))}
      </div>

      <footer className="py-6 border-t border-[var(--color-border-card)] text-center text-xs text-slate-500 dark:text-slate-600 transition-colors duration-300">
        &copy; {new Date().getFullYear()} TradeSim Paper Trading Platform. Built securely.
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Portfolio />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trade"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Trade />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/watchlist"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Watchlist />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Transactions />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Orders />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/:symbol"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <StockDetails />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Default Redirection */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
