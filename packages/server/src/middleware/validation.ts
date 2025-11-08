import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';

type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
};

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[rule.field] = `${rule.field} is required`;
        continue;
      }

      // Skip further validation if field is not required and not provided
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Check type
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors[rule.field] = `${rule.field} must be a ${rule.type}`;
          continue;
        }
      }

      // Check min/max for numbers
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors[rule.field] = `${rule.field} must be at least ${rule.min}`;
          continue;
        }
        if (rule.max !== undefined && value > rule.max) {
          errors[rule.field] = `${rule.field} must be at most ${rule.max}`;
          continue;
        }
      }

      // Check min/max for strings
      if (rule.type === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors[rule.field] = `${rule.field} must be at least ${rule.min} characters`;
          continue;
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors[rule.field] = `${rule.field} must be at most ${rule.max} characters`;
          continue;
        }
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[rule.field] = `${rule.field} has invalid format`;
        continue;
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          errors[rule.field] = typeof result === 'string' ? result : `${rule.field} is invalid`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
};

// Common validation rules
export const orderValidation = validate([
  { field: 'tableId', required: true, type: 'number', min: 1 },
  {
    field: 'items',
    required: true,
    type: 'array',
    custom: (items) => {
      if (!Array.isArray(items) || items.length === 0) {
        return 'At least one item is required';
      }
      for (const item of items) {
        if (!item.menuItemId || typeof item.menuItemId !== 'string') {
          return 'Each item must have a valid menuItemId';
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
          return 'Each item must have a valid quantity (minimum 1)';
        }
      }
      return true;
    },
  },
]);

export const menuItemValidation = validate([
  { field: 'name', required: true, type: 'string', min: 1, max: 100 },
  { field: 'categoryId', required: true, type: 'string' },
  { field: 'price', required: true, type: 'number', min: 0 },
  { field: 'description', required: false, type: 'string', max: 500 },
  { field: 'imageUrl', required: false, type: 'string', max: 500 },
]);

export const tableValidation = validate([
  { field: 'name', required: true, type: 'string', min: 1, max: 50 },
]);

export const paymentValidation = validate([
  { field: 'orderId', required: true, type: 'string' },
  { field: 'amount', required: true, type: 'number', min: 0 },
  {
    field: 'method',
    required: true,
    type: 'string',
    custom: (value) => ['CASH', 'CARD', 'WALLET'].includes(value) || 'Invalid payment method',
  },
]);

export const categoryValidation = validate([
  { field: 'name', required: true, type: 'string', min: 1, max: 50 },
  { field: 'isBuffet', required: false, type: 'boolean' },
  { field: 'sortOrder', required: false, type: 'number', min: 0 },
]);
