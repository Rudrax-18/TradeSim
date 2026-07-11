import mongoose from 'mongoose';

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tradesim';

  const options = {
    autoIndex: true,
  };

  // Configure mongoose connection event listeners
  mongoose.connection.on('connected', () => {
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected! Attempting to reconnect...');
  });

  try {
    await mongoose.connect(connUri, options);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure in case we can't do initial connection
    // but in some dev flows, we might want to retry. Let's retry after 5s.
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
