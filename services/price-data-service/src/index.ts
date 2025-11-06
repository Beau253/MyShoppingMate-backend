import express from 'express';
import cors from 'cors';
import { connectDB as testDbConnection } from './data/db'; // Rename for consistency
import priceRoutes from './api/price.routes';
import { config } from './config';

const startServer = async () => {
  await testDbConnection();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/prices', priceRoutes);

  app.listen(config.port, () => {
    console.log(`Price Data service running on port ${config.port}`);
  });
};

startServer();