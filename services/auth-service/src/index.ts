import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './api/auth.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8000'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Mount auth routes
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const startServer = () => {
  app.listen(config.port, () => {
    console.log(`Auth service running on port ${config.port}`);
  });
};

startServer();