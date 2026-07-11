import 'dotenv/config'; // Must be first to load env variables before other config files import
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';

import connectDB from './config/db.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import ordersRoutes from './routes/orders.js';
import watchlistRoutes from './routes/watchlist.js';
import dashboardRoutes from './routes/dashboard.js';
import walletRoutes from './routes/wallet.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

// Initialize Passport & Firebase Admin configs
import './config/passport.js';
import './config/firebase.js';

// Connect to MongoDB
connectDB();

const app = express();
app.use(passport.initialize());
const PORT = process.env.PORT || 5000;

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration (allow credentials for httpOnly refresh token cookie)
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser (needed for reading refresh token)
app.use(cookieParser());

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to TradeSim API' });
});

// Register Routes
app.use('/', healthRoutes); // exposes /health
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api', ordersRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

import { createServer } from 'http';
import { initSocket } from './services/socketService.js';
import { startLimitOrderPolling } from './services/limitOrderService.js';
import { startCronServices } from './services/cronService.js';

const httpServer = createServer(app);
initSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  startLimitOrderPolling();
  startCronServices();
});
