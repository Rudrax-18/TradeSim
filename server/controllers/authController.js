import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper: Migrate legacy watchlists containing US tickers to Indian stocks
const migrateWatchlist = async (user) => {
  const OLD_TICKERS = ['AAPL', 'MSFT', 'GOOG', 'TSLA'];
  const hasOldTickers = user.watchlist.some(s => OLD_TICKERS.includes(s));
  if (hasOldTickers) {
    user.watchlist = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'];
    await user.save();
  }
};

// Helper: Generate tokens
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
};

// Helper: Set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: true, // required for sameSite: 'none'
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

/**
 * Register User
 * Route: POST /api/auth/register
 */
export const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password, // Pre-save hook hashes this
    });

    if (user) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Set cookie
      setRefreshTokenCookie(res, refreshToken);

      return res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance,
          watchlist: user.watchlist,
        },
        accessToken,
        refreshToken,
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 * Route: POST /api/auth/login
 */
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user (explicitly selecting password)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set cookie
    setRefreshTokenCookie(res, refreshToken);

    await migrateWatchlist(user);

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance,
        watchlist: user.watchlist,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token
 * Route: POST /api/auth/refresh
 */
export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new tokens (rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update cookie
    setRefreshTokenCookie(res, newRefreshToken);

    await migrateWatchlist(user);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance,
        watchlist: user.watchlist,
      },
    });
  } catch (error) {
    console.error('Refresh Token Verification Error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

/**
 * Logout User
 * Route: POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

import admin from 'firebase-admin';

/**
 * Get current user
 * Route: GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      await migrateWatchlist(user);
      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          walletBalance: user.walletBalance,
          watchlist: user.watchlist,
        }
      });
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Google OAuth callback redirect
 * Route: GET /api/auth/google/callback
 */
export const googleCallback = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=Google auth failed`);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken);
    await migrateWatchlist(user);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Firebase Phone ID Token
 * Route: POST /api/auth/phone/verify
 */
export const phoneVerify = async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID Token is required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Invalid token: no phone number found' });
    }

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({
        name: `User ${phoneNumber.slice(-4)}`,
        phoneNumber,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken);
    await migrateWatchlist(user);

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletBalance: user.walletBalance,
        watchlist: user.watchlist,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Phone token verification error:', error.message);
    return res.status(401).json({ message: 'Failed to verify phone OTP session' });
  }
};
