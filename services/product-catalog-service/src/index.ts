import express from 'express';
import cors from 'cors';
import { connectDB } from './data/db';
import productRoutes from './api/product.routes';
import { config } from './config';

const startServer = async () => {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mount the routes under the /products base path
  app.use('/products', productRoutes);

  app.listen(config.port, () => {
    console.log(`Product Catalog service running on port ${config.port}`);
  });
};

startServer();