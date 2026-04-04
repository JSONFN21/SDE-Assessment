import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

// Express request type extension to unclude userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Verify JWT token and protect routes
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove the prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};