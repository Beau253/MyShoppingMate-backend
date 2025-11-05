import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Placeholder for routes
app.get('/lists', (req, res) => {
    res.status(200).json({ message: 'List service is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

const port = process.env.PORT || 3001; // Use a different internal port
app.listen(port, () => {
  console.log(`List service running on port ${port}`);
});