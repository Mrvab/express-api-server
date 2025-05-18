import Joi from 'joi';
import { AppError } from './errors.js';
import { logger } from './logger.js';

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').default('user')
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  update: Joi.object({
    name: Joi.string().min(2),
    email: Joi.string().email(),
    password: Joi.string().min(6)
  }),
  authResponse: Joi.object({
    status: Joi.string().required(),
    data: Joi.object({
      user: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        role: Joi.string().valid('user', 'admin').required()
      }).required(),
      token: Joi.string().required()
    }).required()
  }),
  usersListResponse: Joi.object({
    status: Joi.string().required(),
    data: Joi.object({
      users: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        role: Joi.string().valid('user', 'admin').required()
      })).required()
    }).required()
  })
};

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(400, 'Validation error', errors));
    }
    next();
  };
};

// Response validation middleware
export const validateResponse = (schema) => {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
      const { error } = schema.validate(data, { abortEarly: false });
      if (error) {
        const errors = error.details.map(detail => detail.message);
        logger.error('Response validation error:', errors);
        return originalJson.call(this, {
          status: 'error',
          message: 'Response validation failed',
          errors
        });
      }
      return originalJson.call(this, data);
    };
    next();
  };
}; 