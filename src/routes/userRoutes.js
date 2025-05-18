import express from 'express';
import { validate, validateResponse, userSchemas } from '../utils/validation.js';
import { authorize } from '../middleware/authMiddleware.js';
import { decryptRequestIds } from '../utils/encryption.js';
import UserModel from '../models/User.js';
import { AppError } from '../utils/errors.js';

const router = express.Router();

// Sample user data (replace with database in production)
let users = [];

// Get all users (admin only)
router.get('/',
  authorize('admin'),
  validateResponse(userSchemas.usersListResponse),
  (req, res) => {
    res.json({
      status: 'success',
      data: {
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }))
      }
    });
  }
);

// Get user by ID (admin or own user)
router.get('/:id',
  decryptRequestIds(),
  authorize('admin', 'user'),
  validateResponse(userSchemas.authResponse),
  (req, res, next) => {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return next(new AppError(404, 'User not found'));
    }

    // Users can only access their own data
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return next(new AppError(403, 'Not authorized to access this resource'));
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  }
);

// Create new user (admin only)
router.post('/',
  authorize('admin'),
  validate(userSchemas.register),
  validateResponse(userSchemas.authResponse),
  (req, res, next) => {
    const { name, email, role = 'user' } = req.body;

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      role
    };

    users.push(newUser);
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  }
);

// Update user (admin or own user)
router.put('/:id',
  decryptRequestIds(),
  authorize('admin', 'user'),
  validate(userSchemas.update),
  validateResponse(userSchemas.authResponse),
  (req, res, next) => {
    const { name, email } = req.body;
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
      return next(new AppError(404, 'User not found'));
    }

    // Users can only update their own data
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return next(new AppError(403, 'Not authorized to access this resource'));
    }

    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      email: email || users[userIndex].email
    };

    res.json({
      status: 'success',
      data: {
        user: {
          id: users[userIndex].id,
          name: users[userIndex].name,
          email: users[userIndex].email,
          role: users[userIndex].role
        }
      }
    });
  }
);

// Delete user (admin only)
router.delete('/:id',
  decryptRequestIds(),
  authorize('admin'),
  (req, res, next) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
      return next(new AppError(404, 'User not found'));
    }

    users.splice(userIndex, 1);
    res.status(204).send();
  }
);

export default router; 