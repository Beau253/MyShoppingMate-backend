import { Router } from 'express';
import { productController } from './product.controller';

const router = Router();

// Route for searching products (e.g., /products/search?q=milk)
router.get('/search', productController.searchProducts);

// Route for adding a new product
router.post('/', productController.addProduct);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

export default router;