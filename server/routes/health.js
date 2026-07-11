import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  
  // Mongoose connection state description
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStatus = states[dbState] || 'unknown';

  const healthInfo = {
    status: dbState === 1 ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      server: 'UP',
      database: dbStatus,
    },
  };

  if (dbState === 1) {
    return res.status(200).json(healthInfo);
  } else {
    return res.status(503).json(healthInfo);
  }
});

export default router;
