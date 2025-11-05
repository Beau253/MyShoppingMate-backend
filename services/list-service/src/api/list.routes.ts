import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { listController } from './list.controller'; // Import the new controller

const router = Router();

// Define the routes and protect them
router.get('/', protect, listController.getLists);
router.post('/', protect, listController.createList);

// Health check remains public
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

export default router;