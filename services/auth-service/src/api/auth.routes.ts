import { Router } from 'express';
import { authController } from './auth.controller'; // Import the real controller

const router = Router();

// Define the routes and link them to the controller functions
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;