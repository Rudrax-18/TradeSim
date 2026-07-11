import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  googleCallback,
  phoneVerify,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateBody, registerSchema, loginSchema } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authLimiter on registration and login to prevent brute force
router.post('/register', validateBody(registerSchema), authLimiter, register);
router.post('/login', validateBody(loginSchema), authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

const checkGoogleConfig = (req, res, next) => {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret || id === 'DUMMY_CLIENT_ID' || secret === 'DUMMY_CLIENT_SECRET') {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?error=Google login is not configured on this server`);
  }
  next();
};

// Google OAuth Routes
router.get('/google', checkGoogleConfig, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  checkGoogleConfig,
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// Phone OTP Verification Route
router.post('/phone/verify', phoneVerify);

// Protected routes
router.get('/me', protect, getMe);

export default router;
