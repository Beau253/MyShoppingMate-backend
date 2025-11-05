import { Router, Request, Response } from 'express';

const router = Router();

// This will now handle the GET request at the root of the router ('/')
// which corresponds to the full path '/lists'
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'List service is running!' });
});

// The health check is now its own route within this router.
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP' });
});

export default router;