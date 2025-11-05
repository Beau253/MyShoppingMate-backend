import express from 'express';
import cors from 'cors';
import listRoutes from './api/list.routes';
import { testDbConnection } from './data/db'; // Import db connection

const startServer = async () => {
  await testDbConnection();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/lists', listRoutes);

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`List service running on port ${port}`);
  });
};

startServer();