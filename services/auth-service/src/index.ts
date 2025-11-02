import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './api/auth.routes';

const app = express();

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// --- API Routes ---
// Mount the authentication routes under the /auth path.
// This matches the PathPrefix rule in our docker-compose.yml.
app.use('/auth', authRoutes);

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// --- Start the Server ---
app.listen(config.port, () => {
  console.log(`Auth service running on port ${config.port}`);
});