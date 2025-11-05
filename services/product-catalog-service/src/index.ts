import express from 'express';
import cors from 'cors';

const startServer = async () => {
  // We will add the DB connection here later
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Placeholder for routes
  app.get('/products/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Product Catalog service running on port ${port}`);
  });
};

startServer();