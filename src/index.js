import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from './config/index.js';
import logger from './utils/logger.js';
import db from './utils/database.js';
import User from './models/User.js';
import { rateLimiter, corsOptions, helmetConfig, securityHeaders, securityErrorHandler } from './middleware/security.js';
import { verifyToken, refreshToken, checkRole, generateToken } from './middleware/auth.js';
import { validate, schemas } from './middleware/validation.js';
import cors from 'cors';
import { transformResponse, decryptRequestIds } from './utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(rateLimiter);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { stream: logger.stream }));

// Add after basic middleware setup
app.use(transformResponse());
app.use(decryptRequestIds());

// API versioning
const apiRouter = express.Router();
app.use(`/api/${config.apiVersion}`, apiRouter);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
apiRouter.post('/auth/register', validate(schemas.user.create), async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    // Create new user
    const user = new User({ email, password, name, role });
    const savedUser = await user.save();
    
    // Generate token
    const token = generateToken(savedUser);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          role: savedUser.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/auth/login', validate(schemas.user.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes
apiRouter.use(verifyToken);

// User routes
apiRouter.get('/users', checkRole(['admin']), async (req, res, next) => {
  try {
    const users = await User.list(req.query);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/users/:id', validate(schemas.id), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/users/:id', validate(schemas.user.update), async (req, res, next) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user
    const updatedUser = new User({ ...user, ...req.body });
    const savedUser = await updatedUser.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: savedUser
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/users/:id', validate(schemas.id), checkRole(['admin']), async (req, res, next) => {
  try {
    const result = await User.delete(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: config.env === 'production' ? 'Internal server error' : err.message
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database tables
    await User.initializeTables();
    
    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
    
    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      server.close(async () => {
        try {
          await db.closeAll();
          logger.info('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 