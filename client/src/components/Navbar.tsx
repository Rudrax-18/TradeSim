import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { Wallet, LayoutDashboard, Briefcase, RefreshCw, Star, LogOut, Sun, Moon, ClipboardList, History, Plus } from 'lucide-react';
import { formatINR } from '../utils/format';
import AddFundsModal from './AddFundsModal';
import logo from '../assets/logo.svg';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { to: '/portfolio', label: 'Portfolio', icon: <Briefcase size={16} /> },
    { to: '/trade', label: 'Trade', icon: <RefreshCw size={16} /> },
    { to: '/watchlist', label: 'Watchlist', icon: <Star size={16} /> },
    { to: '/orders', label: 'Orders', icon: <ClipboardList size={16} /> },
    { to: '/transactions', label: 'Ledger', icon: <History size={16} /> },
  ];

  if (!user) return null;

  // Extract initials
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <nav className="sticky top-0 z-50 theme-bg-nav border-b px-4 md:px-6 py-2.5 md:py-3.5 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4">
        {/* Brand Logo & Mobile controls row */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/dashboard')}>
            <img src={logo} alt="TradeSim Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain shrink-0" />
            <span className="text-lg md:text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              Trade<span className="text-emerald-500 dark:text-emerald-400 font-black">Sim</span>
            </span>
          </div>

          {/* Quick controls only on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/10 px-2 py-1 rounded-lg">
              <Wallet size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {formatINR(user.walletBalance)}
              </span>
              <button
                onClick={() => setIsAddFundsOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-[#0b0f19] p-0.5 rounded cursor-pointer transition-colors duration-150 inline-flex items-center justify-center"
                title="Add Simulated Cash"
              >
                <Plus size={8} strokeWidth={4} />
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 theme-bg-btn-slate border hover:opacity-85 rounded-lg transition-all duration-300 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
            >
              {theme === 'dark' ? <Sun size={12} className="text-yellow-500" /> : <Moon size={12} className="text-indigo-500" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-lg transition-all duration-300 cursor-pointer"
              title="Logout"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        {/* Navigation Links (Scrollable horizontally on mobile to prevent wrapping) */}
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[var(--color-text-primary)] hover:bg-slate-200/55 dark:hover:bg-slate-800/50 border-transparent'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* User Status Section (Desktop only) */}
        <div className="hidden md:flex items-center justify-between md:justify-end gap-4 pt-3.5 md:pt-0">
          {/* Live Status indicator */}
          <div className="flex items-center gap-2 theme-bg-btn-slate border px-3 py-1.5 rounded-xl shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow shadow-emerald-500/50' : 'bg-rose-500 shadow shadow-rose-500/50'}`} />
            <span className="text-[8px] text-[var(--color-text-secondary)] uppercase tracking-wider font-extrabold">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Virtual Wallet Balance */}
          <div className="flex items-center gap-3.5 theme-bg-btn-slate border px-3.5 py-1.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-[var(--color-text-secondary)] uppercase tracking-widest font-bold">Simulated Cash</span>
                <span className="text-xs font-black text-emerald-555 dark:text-emerald-400">
                  {formatINR(user.walletBalance)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsAddFundsOpen(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border border-emerald-500/20"
              title="Add Simulated Cash"
            >
              + Add
            </button>
          </div>

          {/* User Profile / Theme Switcher / Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 theme-bg-btn-slate border hover:opacity-85 rounded-xl transition-all duration-300 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-indigo-500" />}
            </button>

            {/* Profile Initials Circle & Details */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-xs shadow-inner">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">{user.name}</span>
                <span className="text-[9px] text-[var(--color-text-secondary)] leading-tight font-medium">
                  {user.email || user.phoneNumber}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer"
            >
              <LogOut size={12} />
              <span>Logout</span>
            </button>
        </div>
      </div>
    </div>
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        currentBalance={user.walletBalance}
      />
    </nav>
  );
};

export default Navbar;
