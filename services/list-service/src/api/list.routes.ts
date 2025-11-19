import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { listController } from './list.controller';

const router = Router();

// Define the routes and protect them
router.get('/', protect, listController.getLists);
router.post('/', protect, listController.createList);

// List Items
router.get('/:listId/items', protect, listController.getListItems);
router.post('/:listId/items', protect, listController.addListItem);
router.put('/:listId/items/:itemId', protect, listController.updateListItem);

// Health check remains public
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

export default router;