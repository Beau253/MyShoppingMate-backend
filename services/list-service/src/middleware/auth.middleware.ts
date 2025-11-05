import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// This is a temporary solution for the JWT_SECRET. In production, this MUST come from a secure config.
const JWT_SECRET = process.env.JWT_SECRET || 'averysecretkeythatshouldbefromdotenv';

// Extend the Express Request type to include our custom 'user' property.
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGci...")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

      // Attach the decoded user payload to the request object
      req.user = decoded;

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};