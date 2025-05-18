import Joi from 'joi';
import logger from '../utils/logger.js';

export const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true // Remove unknown props
    };

    // Combine all request parts that need validation
    const dataToValidate = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    const { error, value } = schema.validate(dataToValidate, validationOptions);
    
    if (error) {
      const errors = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation error:', { path: req.path, errors });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace request properties with validated ones
    req.body = value.body;
    req.query = value.query;
    req.params = value.params;
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  id: Joi.object({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),

  pagination: Joi.object({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('asc', 'desc').default('desc'),
      sortBy: Joi.string()
    })
  }),

  user: {
    create: Joi.object({
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().required(),
        role: Joi.string().valid('user', 'admin').default('user')
      })
    }),

    update: Joi.object({
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        email: Joi.string().email(),
        password: Joi.string().min(8),
        name: Joi.string(),
        role: Joi.string().valid('user', 'admin')
      }).min(1)
    }),

    login: Joi.object({
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      })
    })
  }
}; 