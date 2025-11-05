import express from 'express';
import cors from 'cors';

const startServer = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/prices/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`Price Data service running on port ${port}`);
  });
};

startServer();