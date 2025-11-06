import { Router } from 'express';
import { priceController } from './price.controller';

const router = Router();

// Route for getting the latest price(s)
router.get('/latest', priceController.getLatestPrices);

// Route for reporting a new price
router.post('/report', priceController.reportPrice);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

export default router;