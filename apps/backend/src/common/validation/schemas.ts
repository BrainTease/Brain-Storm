import * as Joi from 'joi';

/**
 * Shared validation schemas using Joi
 * Centralized location for all request payload validation schemas
 * Used by the validation middleware to reject malformed payloads
 */

// Stellar-related schemas
export const fundTestnetSchema = Joi.object({
  publicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'publicKey must be a valid Stellar public key',
  }),
});

export const mintCredentialSchema = Joi.object({
  recipientPublicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'recipientPublicKey must be a valid Stellar public key',
  }),
  courseId: Joi.string().required().uuid().messages({
    'string.guid': 'courseId must be a valid UUID',
  }),
});

export const issueCredentialSchema = Joi.object({
  recipientPublicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'recipientPublicKey must be a valid Stellar public key',
  }),
  courseId: Joi.string().required().uuid().messages({
    'string.guid': 'courseId must be a valid UUID',
  }),
});

export const recordProgressSchema = Joi.object({
  studentPublicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'studentPublicKey must be a valid Stellar public key',
  }),
  courseId: Joi.string().required().uuid().messages({
    'string.guid': 'courseId must be a valid UUID',
  }),
  progressPct: Joi.number().integer().min(0).max(100).required().messages({
    'number.min': 'progressPct must be at least 0',
    'number.max': 'progressPct must be at most 100',
  }),
});

export const mintRewardSchema = Joi.object({
  recipientPublicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'recipientPublicKey must be a valid Stellar public key',
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'amount must be a positive number',
  }),
});

export const mintCertificateSchema = Joi.object({
  recipientPublicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/).messages({
    'string.pattern.base': 'recipientPublicKey must be a valid Stellar public key',
  }),
  certificateHash: Joi.string().required().hex().messages({
    'string.hex': 'certificateHash must be a valid hex string',
  }),
  courseTitle: Joi.string().required().min(1).max(500).messages({
    'string.min': 'courseTitle must not be empty',
    'string.max': 'courseTitle must be at most 500 characters',
  }),
});

// Auth-related schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  bio: Joi.string().optional().max(1000),
  profileImageUrl: Joi.string().optional().uri(),
}).min(1);

// Generic ID validation
export const uuidSchema = Joi.object({
  id: Joi.string().required().uuid(),
});

export const publicKeySchema = Joi.object({
  publicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/),
});
