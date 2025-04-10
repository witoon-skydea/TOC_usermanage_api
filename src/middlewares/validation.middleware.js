const Joi = require('joi');
const { APIError } = require('../utils/error.handler');

// Middleware to validate request body against a Joi schema
const validateRequest = (schema) => {
  return (req, res, next) => {
    const options = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true // Remove unknown props
    };
    
    const { error, value } = schema.validate(req.body, options);
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return next(new APIError('Validation error', 400, errors));
    }
    
    // Replace request body with validated data
    req.body = value;
    next();
  };
};

// Schema for user registration
const userRegisterSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .alphanum()
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.empty': 'Username cannot be empty',
      'string.min': 'Username must be at least {#limit} characters long',
      'string.max': 'Username must be at most {#limit} characters long',
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email cannot be empty',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'))
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password cannot be empty',
      'string.min': 'Password must be at least {#limit} characters long',
      'string.max': 'Password must be at most {#limit} characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'string.empty': 'Confirm password cannot be empty',
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    }),
  
  displayName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.base': 'Display name must be a string',
      'string.empty': 'Display name cannot be empty',
      'string.min': 'Display name must be at least {#limit} characters long',
      'string.max': 'Display name must be at most {#limit} characters long',
      'any.required': 'Display name is required'
    }),
  
  profileImage: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.base': 'Profile image must be a string',
      'string.uri': 'Profile image must be a valid URL'
    }),
    
  metadata: Joi.object({
    bio: Joi.string().allow(null, ''),
    location: Joi.string().allow(null, ''),
    preferences: Joi.object({
      language: Joi.string().default('en'),
      theme: Joi.string().default('light'),
      notifications: Joi.boolean().default(true)
    }).default()
  }).default()
});

// Schema for user login
const userLoginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.empty': 'Username cannot be empty',
      'any.required': 'Username is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password cannot be empty',
      'any.required': 'Password is required'
    }),
    
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, '')
    .messages({
      'string.base': 'Service ID must be a string',
      'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId'
    })
});

// Schema for updating user profile
const userUpdateSchema = Joi.object({
  displayName: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.base': 'Display name must be a string',
      'string.empty': 'Display name cannot be empty',
      'string.min': 'Display name must be at least {#limit} characters long',
      'string.max': 'Display name must be at most {#limit} characters long'
    }),
  
  profileImage: Joi.string()
    .uri()
    .allow(null, '')
    .messages({
      'string.base': 'Profile image must be a string',
      'string.uri': 'Profile image must be a valid URL'
    }),
    
  metadata: Joi.object({
    bio: Joi.string().allow(null, ''),
    location: Joi.string().allow(null, ''),
    preferences: Joi.object({
      language: Joi.string(),
      theme: Joi.string(),
      notifications: Joi.boolean()
    })
  })
});

// Schema for changing password
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.base': 'Current password must be a string',
      'string.empty': 'Current password cannot be empty',
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'))
    .required()
    .messages({
      'string.base': 'New password must be a string',
      'string.empty': 'New password cannot be empty',
      'string.min': 'New password must be at least {#limit} characters long',
      'string.max': 'New password must be at most {#limit} characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'string.empty': 'Confirm password cannot be empty',
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
});

// Schema for creating or updating a service
const serviceSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.base': 'Service name must be a string',
      'string.empty': 'Service name cannot be empty',
      'string.min': 'Service name must be at least {#limit} characters long',
      'string.max': 'Service name must be at most {#limit} characters long',
      'any.required': 'Service name is required'
    }),
  
  description: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'Description must be a string'
    }),
  
  apiKey: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'API key must be a string'
    }),
  
  apiSecret: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'API secret must be a string'
    }),
  
  callbackUrl: Joi.string()
    .uri()
    .allow('', null)
    .messages({
      'string.base': 'Callback URL must be a string',
      'string.uri': 'Callback URL must be a valid URL'
    }),
  
  active: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Active must be a boolean'
    }),
  
  config: Joi.object({
    allowedOrigins: Joi.array()
      .items(Joi.string())
      .default([]),
    
    tokenExpiration: Joi.number()
      .integer()
      .min(300) // Minimum 5 minutes (300 seconds)
      .default(3600), // Default 1 hour (3600 seconds)
    
    passwordPolicy: Joi.object({
      minLength: Joi.number()
        .integer()
        .min(6)
        .default(8),
      
      requireNumbers: Joi.boolean()
        .default(true),
      
      requireSymbols: Joi.boolean()
        .default(false)
    }).default()
  }).default()
});

// Schema for creating or updating a role
const roleSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.base': 'Role name must be a string',
      'string.empty': 'Role name cannot be empty',
      'string.min': 'Role name must be at least {#limit} characters long',
      'string.max': 'Role name must be at most {#limit} characters long',
      'any.required': 'Role name is required'
    }),
  
  description: Joi.string()
    .allow('', null)
    .messages({
      'string.base': 'Description must be a string'
    }),
  
  isGlobal: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isGlobal must be a boolean'
    }),
  
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, '')
    .messages({
      'string.base': 'Service ID must be a string',
      'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId'
    }),
  
  permissions: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': 'Permissions must be an array'
    })
});

// Schema for user-service relationship
const userServiceSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.base': 'User ID must be a string',
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId',
      'any.required': 'User ID is required'
    }),
  
  serviceId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.base': 'Service ID must be a string',
      'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId',
      'any.required': 'Service ID is required'
    }),
  
  roles: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .default([])
    .messages({
      'array.base': 'Roles must be an array',
      'string.pattern.base': 'Role ID must be a valid MongoDB ObjectId'
    }),
  
  status: Joi.string()
    .valid('active', 'suspended')
    .default('active')
    .messages({
      'string.base': 'Status must be a string',
      'any.only': 'Status must be either active or suspended'
    }),
  
  customData: Joi.object()
    .default({})
});

// Export schemas and validation middleware
module.exports = {
  validateRequest,
  schemas: {
    userRegister: userRegisterSchema,
    userLogin: userLoginSchema,
    userUpdate: userUpdateSchema,
    changePassword: changePasswordSchema,
    service: serviceSchema,
    role: roleSchema,
    userService: userServiceSchema
  }
};
