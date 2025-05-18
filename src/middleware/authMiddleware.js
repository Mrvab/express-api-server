import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'No token provided'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token expired'));
    }
    next(error);
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'Not authorized to access this resource'));
    }

    next();
  };
};

// Skip authentication for specific paths
const skipAuth = (path) => {
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/health'
  ];
  return publicPaths.includes(path);
};

export { verifyToken, authorize, skipAuth }; 