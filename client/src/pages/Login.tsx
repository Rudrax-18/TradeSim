import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as firebaseAuth } from '../services/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import api from '../services/api';
import { TrendingUp, Mail, Lock, Loader2, AlertCircle, Phone, KeyRound } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Phone Auth State
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Sync token from Google OAuth redirect parameter
  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
    }
    if (token) {
      setLoading(true);
      loginWithToken(token)
        .then(() => navigate('/dashboard'))
        .catch((err) => {
          console.error(err);
          setError('Failed to complete Google OAuth login.');
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Login failed. Please verify credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError(null);
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const setupRecaptcha = (buttonId: string) => {
    if (!firebaseAuth) {
      setError('Firebase phone authentication is not configured in env parameters.');
      return null;
    }
    try {
      const verifier = new RecaptchaVerifier(firebaseAuth, buttonId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
      });
      return verifier;
    } catch (err: any) {
      console.error('Recaptcha init failed:', err);
      setError('Security verification initialization failed.');
      return null;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.replace(/^0+/, '');
      if (formattedPhone.startsWith('91') && formattedPhone.length > 10) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    setLoading(true);
    try {
      const verifier = setupRecaptcha('send-otp-btn');
      if (!verifier) {
        setLoading(false);
        return;
      }

      const confirmation = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setError(null);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP code.');
      return;
    }

    setVerificationLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const response = await api.post('/api/auth/phone/verify', { idToken });
      const { accessToken } = response.data;

      await loginWithToken(accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.message || err.message || 'OTP verification failed.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-8 rounded-3xl shadow-xl z-10 transition-all duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 rounded-2xl text-[#0b0f19] shadow-md shadow-emerald-500/10 mb-4">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium text-center">
            Sign in to access your TradeSim portal
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-450 text-sm">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Authentication Switch Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6 transition-all duration-300">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('EMAIL');
              setError(null);
            }}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
              authMethod === 'EMAIL'
                ? 'bg-slate-900 text-emerald-500 border border-emerald-500/10 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('PHONE');
              setError(null);
            }}
            disabled={!firebaseAuth}
            className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer disabled:opacity-40 ${
              authMethod === 'PHONE'
                ? 'bg-slate-900 text-emerald-500 border border-emerald-500/10 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mobile Login
          </button>
        </div>

        {/* Forms Container */}
        {authMethod === 'EMAIL' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail size={18} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={18} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210 (Indian number)"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300"
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Phone size={18} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  id="send-otp-btn"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Verification OTP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-300 font-mono tracking-widest text-center"
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <KeyRound size={18} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all duration-300 cursor-pointer text-center text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verificationLoading}
                    className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 disabled:opacity-50"
                  >
                    {verificationLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      'Verify & Login'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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
          onClick={handleGoogleLogin}
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
        <p className="mt-8 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-emerald-400 hover:text-emerald-300 font-bold transition-all duration-200"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
