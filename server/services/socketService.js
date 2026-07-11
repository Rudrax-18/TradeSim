import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Watchlist from '../models/Watchlist.js';
import { getStockQuote, getBulkStockQuotes } from './stockDataService.js';

let io = null;
const activeWatches = {}; // socket.id -> symbol
const lastPrices = {}; // symbol -> price
let pollingIntervalId = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // JWT middleware authentication for Socket.io connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.user = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    // Join room keyed to their unique user ID
    socket.join(socket.user.toString());
    console.log(`[Socket] User ${socket.user} connected on socket ${socket.id}`);

    // Pre-populate socket watchlist cache from Watchlist model
    try {
      const watchlistDoc = await Watchlist.findOne({ user: socket.user });
      socket.watchlist = watchlistDoc ? watchlistDoc.symbols : [];
    } catch (err) {
      socket.watchlist = [];
    }

    // Client registers active symbol view (Dashboard/Trade pages)
    socket.on('watch:symbol', async (data) => {
      if (data && data.symbol) {
        const symbolUpper = data.symbol.toUpperCase();
        activeWatches[socket.id] = symbolUpper;
        
        // Push instant update to new watcher
        try {
          const quote = await getStockQuote(symbolUpper);
          socket.emit('price:update', {
            symbol: symbolUpper,
            price: quote.price,
            change: quote.change,
            percentChange: quote.percentChange,
          });
        } catch (err) {
          // Ignore
        }
      }
    });

    socket.on('unwatch:symbol', () => {
      delete activeWatches[socket.id];
    });

    socket.on('disconnect', () => {
      delete activeWatches[socket.id];
      console.log(`[Socket] User ${socket.user} disconnected`);
    });
  });

  // Start polling price loop
  startPricePolling();

  return io;
};

export const getIo = () => io;

// Emit events directly to user room
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId.toString()).emit(event, data);
  }
};

// Check and emit price update for a single symbol immediately
const checkPriceForSymbol = async (symbol) => {
  try {
    const quote = await getStockQuote(symbol);
    const currentPrice = quote.price;
    const lastPrice = lastPrices[symbol];

    if (lastPrice === undefined || lastPrice !== currentPrice) {
      lastPrices[symbol] = currentPrice;
      const payload = {
        symbol,
        price: quote.price,
        change: quote.change,
        percentChange: quote.percentChange,
      };

      // Broadcast update to all sockets watching or tracking this symbol
      if (io) {
        for (const [id, socket] of io.sockets.sockets.entries()) {
          const userWatch = socket.watchlist || [];
          const activeWatch = activeWatches[socket.id];
          if (userWatch.includes(symbol) || activeWatch === symbol) {
            socket.emit('price:update', payload);
          }
        }
      }
    }
  } catch (err) {
    // Ignore quote fetch errors
  }
};

// Poll price updates for all active connected watchlists/views
export const pollActivePrices = async () => {
  if (!io) return;

  const connectedSockets = Array.from(io.sockets.sockets.values());
  if (connectedSockets.length === 0) return;

  try {
    // Refresh watchlist caches for connected sockets using Watchlist model
    const connectedUserIds = connectedSockets.map(s => s.user);
    const watchlists = await Watchlist.find({ user: { $in: connectedUserIds } });
    const watchlistsMap = new Map();
    
    // Seed defaults
    connectedUserIds.forEach(uid => watchlistsMap.set(uid.toString(), []));
    watchlists.forEach(w => watchlistsMap.set(w.user.toString(), w.symbols || []));

    // Update socket cache
    connectedSockets.forEach(socket => {
      socket.watchlist = watchlistsMap.get(socket.user.toString()) || [];
    });

    // Gather union of watched symbols
    const userWatchlistSymbols = Array.from(watchlistsMap.values()).flat();
    const activeViewSymbols = Object.values(activeWatches);
    const uniqueSymbols = Array.from(new Set([...userWatchlistSymbols, ...activeViewSymbols]));

    if (uniqueSymbols.length === 0) return;

    // Bulk fetch quotes for all active symbols
    const quotes = await getBulkStockQuotes(uniqueSymbols);
    for (const quote of quotes) {
      if (quote) {
        const symbol = quote.symbol;
        const currentPrice = quote.price;
        const lastPrice = lastPrices[symbol];

        if (lastPrice === undefined || lastPrice !== currentPrice) {
          lastPrices[symbol] = currentPrice;
          const payload = {
            symbol,
            price: quote.price,
            change: quote.change,
            percentChange: quote.percentChange,
          };

          // Broadcast update to all sockets watching or tracking this symbol
          for (const socket of connectedSockets) {
            const userWatch = socket.watchlist || [];
            const activeWatch = activeWatches[socket.id];
            if (userWatch.includes(symbol) || activeWatch === symbol) {
              socket.emit('price:update', payload);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Socket Price Poller] Failed to poll active prices:', err.message);
  }
};

const startPricePolling = () => {
  if (pollingIntervalId) return;
  console.log('[Socket Price Service] Starting real-time price poller (12s interval)...');
  pollingIntervalId = setInterval(pollActivePrices, 12000);
};

export const stopPricePolling = () => {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
    console.log('[Socket Price Service] Polling stopped.');
  }
};
