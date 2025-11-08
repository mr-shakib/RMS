import { Request, Response, NextFunction } from 'express';
import { AppError, PrinterError } from '../errors/AppError';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  status: 'error';
  message: string;
  details?: any;
  retryable?: boolean;
  code?: string;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors with context
  logError(error, req);

  // Handle AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      message: error.message,
    };

    if (error.details) {
      response.details = error.details;
    }

    if (error instanceof PrinterError) {
      response.retryable = error.retryable;
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, res);
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid data provided. Please check your input.',
      details: extractValidationDetails(error.message),
    });
  }

  // Handle Prisma initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please try again later.',
      retryable: true,
    });
  }

  // Handle Prisma connection errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error occurred. Please contact support.',
    });
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in request body',
    });
  }

  // Log unexpected errors with full stack trace
  console.error('❌ Unexpected error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Return generic error for unknown errors
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred. Please try again.',
  });
};

const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response => {
  const response: ErrorResponse = {
    status: 'error',
    message: '',
    code: error.code,
  };

  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || [];
      response.message = `A record with this ${target.join(', ')} already exists`;
      return res.status(409).json(response);

    case 'P2025':
      // Record not found
      response.message = 'The requested record was not found';
      return res.status(404).json(response);

    case 'P2003':
      // Foreign key constraint violation
      response.message = 'Invalid reference to related record';
      return res.status(400).json(response);

    case 'P2014':
      // Required relation violation
      response.message = 'The change violates a required relation';
      return res.status(400).json(response);

    case 'P2016':
      // Query interpretation error
      response.message = 'Invalid query parameters';
      return res.status(400).json(response);

    case 'P2021':
      // Table does not exist
      response.message = 'Database table not found. Please run migrations.';
      return res.status(500).json(response);

    case 'P2024':
      // Connection timeout
      response.message = 'Database connection timeout. Please try again.';
      response.retryable = true;
      return res.status(503).json(response);

    default:
      response.message = 'Database operation failed';
      return res.status(500).json(response);
  }
};

const logError = (error: Error, req: Request): void => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    name: error.name,
    message: error.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  if (error instanceof AppError && !error.isOperational) {
    // Log programming errors with full stack trace
    console.error('🔴 Programming Error:', {
      ...logData,
      stack: error.stack,
    });
  } else {
    // Log operational errors without stack trace
    console.warn('⚠️  Operational Error:', logData);
  }
};

const extractValidationDetails = (message: string): string => {
  // Extract useful information from Prisma validation error messages
  const lines = message.split('\n');
  const relevantLines = lines.filter(
    (line) =>
      line.includes('Argument') ||
      line.includes('Invalid') ||
      line.includes('Expected') ||
      line.includes('Got')
  );
  return relevantLines.join(' ').trim() || 'Validation failed';
};
