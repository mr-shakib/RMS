import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle AppError instances
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, res);
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid data provided',
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  // Return generic error for unknown errors
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError,
  res: Response
) => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      return res.status(409).json({
        status: 'error',
        message: 'A record with this value already exists',
      });
    case 'P2025':
      // Record not found
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
      });
    case 'P2003':
      // Foreign key constraint violation
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reference to related record',
      });
    default:
      return res.status(500).json({
        status: 'error',
        message: 'Database operation failed',
      });
  }
};
