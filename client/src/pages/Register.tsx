import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, User, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one letter and one number.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setValidationErrors({});

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        // Validation errors from Zod backend
        setValidationErrors(err.response.data.errors);
      } else {
        setServerError(
          err.response?.data?.message || 'Registration failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-3xl shadow-xl z-10 my-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 rounded-2xl text-[#0b0f19] shadow-md shadow-emerald-500/10 mb-4 animate-pulse">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Create Account
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Start paper trading with simulated cash
          </p>
        </div>

        {/* Global Error message */}
        {serverError && (
          <div className="mb-4 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400 text-sm">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className={`w-full bg-slate-950 border ${
                  validationErrors.name ? 'border-rose-500' : 'border-slate-800'
                } focus:border-emerald-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300`}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={16} />
              </div>
            </div>
            {validationErrors.name && (
              <span className="text-[11px] text-rose-400 pl-1">{validationErrors.name}</span>
            )}
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className={`w-full bg-slate-950 border ${
                  validationErrors.email ? 'border-rose-500' : 'border-slate-800'
                } focus:border-emerald-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300`}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail size={16} />
              </div>
            </div>
            {validationErrors.email && (
              <span className="text-[11px] text-rose-400 pl-1">{validationErrors.email}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters (letter + number)"
                className={`w-full bg-slate-950 border ${
                  validationErrors.password ? 'border-rose-500' : 'border-slate-800'
                } focus:border-emerald-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300`}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={16} />
              </div>
            </div>
            {validationErrors.password && (
              <span className="text-[11px] text-rose-400 pl-1">{validationErrors.password}</span>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className={`w-full bg-slate-950 border ${
                  validationErrors.confirmPassword ? 'border-rose-500' : 'border-slate-800'
                } focus:border-emerald-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300`}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={16} />
              </div>
            </div>
            {validationErrors.confirmPassword && (
              <span className="text-[11px] text-rose-400 pl-1">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-bold">Or continue with</span>
          </div>
        </div>

        {/* Continue with Google button */}
        <button
          onClick={() => {
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            window.location.href = `${backendUrl}/api/auth/google`;
          }}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-100 font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-300 cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.355-2.845-6.355-6.355s2.845-6.355 6.355-6.355c1.61 0 3.08.59 4.22 1.57l3.05-3.05C19.105 1.915 15.93 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c5.78 0 10.19-4.065 10.19-9.82 0-.61-.06-1.2-.17-1.785H12.24Z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Redirect Footer */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-bold transition-all duration-200"
          >
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
