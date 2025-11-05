import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth.middleware'; // Import the middleware

// Extend the Express Request type for our controller
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();

// This route is now PROTECTED. The 'protect' middleware will run first.
// If the token is valid, the controller function will execute.
router.get('/', protect, (req: AuthRequest, res: Response) => {
    // Because the middleware ran, we can now safely access req.user
    const userId = req.user?.userId;
    res.status(200).json({ 
        message: `Successfully fetched lists for user ${userId}` 
    });
});

// The health check route remains PUBLIC.
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP' });
});

export default router;