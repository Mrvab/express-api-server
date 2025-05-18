import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validate, validateResponse, userSchemas } from '../utils/validation.js';
import UserModel from '../models/User.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const router = express.Router();

// Sample user store (replace with database in production)
let users = [];

// Register new user
router.post('/register',
  validate(userSchemas.register),
  validateResponse(userSchemas.authResponse),
  async (req, res, next) => {
    try {
      const { name, email, password, role = 'user' } = req.body;

      // Check if user already exists
      if (users.find(u => u.email === email)) {
        return next(new AppError(400, 'User already exists'));
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
        role
      };

      users.push(newUser);

      // Create token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
});

// Login user
router.post('/login',
  validate(userSchemas.login),
  validateResponse(userSchemas.authResponse),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = users.find(u => u.email === email);
      if (!user) {
        return next(new AppError(401, 'Invalid credentials'));
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next(new AppError(401, 'Invalid credentials'));
      }

      // Create token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
});

// Logout user (client should delete token)
router.post('/logout', (req, res) => {
  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export default router; 