import { Router } from 'express';
import { authController } from './auth.controller'; // Import the real controller

const router = Router();

// Define the routes and link them to the controller functions
router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;