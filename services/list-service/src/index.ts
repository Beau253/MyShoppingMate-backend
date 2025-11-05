import express from 'express';
import cors from 'cors';
import listRoutes from './api/list.routes'; // Import the new router

const app = express();

app.use(cors());
app.use(express.json());

// --- API Routes ---
// Mount the list routes under the /lists path.
// Now, a request to /lists/health will be correctly handled.
app.use('/lists', listRoutes);

// --- NOTE: The individual health check here is no longer needed ---
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'UP' });
// });

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`List service running on port ${port}`);
});