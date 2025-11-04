import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './api/auth.routes';
import { testDbConnection } from './data/db'; // Import the db connection function

// A function to start the application
const startServer = async () => {
  // --- Test Database Connection ---
  await testDbConnection();

  const app = express();

  // --- Middleware ---
  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.use('/auth', authRoutes);

  // --- Health Check Endpoint ---
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  // --- Start the Server ---
  app.listen(config.port, () => {
    console.log(`Auth service running on port ${config.port}`);
  });
};

startServer();