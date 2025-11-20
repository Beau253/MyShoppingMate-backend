import express from 'express';
import cors from 'cors';
import { connectDB } from './data/db';
import priceRoutes from './api/price.routes';
import storeRoutes from './api/store.routes';
import { config } from './config';

const startServer = async () => {
  // Call the function
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/prices', priceRoutes);
  app.use('/stores', storeRoutes);

  app.get('/health', (req: any, res: any) => {
    res.status(200).send('OK');
  });

  app.listen(config.port, () => {
    console.log(`Price Data service running on port ${config.port}`);
  });
};

startServer();