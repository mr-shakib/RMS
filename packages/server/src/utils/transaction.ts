import { PrismaClient } from '@prisma/client';
import { DatabaseError } from '../errors/AppError';

/**
 * Execute a function within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      return await fn(tx);
    });
  } catch (error) {
    console.error('Transaction failed, rolling back:', error);
    
    if (error instanceof Error) {
      throw new DatabaseError(`Transaction failed: ${error.message}`, error);
    }
    
    throw new DatabaseError('Transaction failed with unknown error');
  }
}

/**
 * Execute a function with retry logic for transient database errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Check if error is retryable
      const isRetryable = isTransientError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, lastError.message);
      await sleep(delayMs);
      
      // Exponential backoff
      delayMs *= 2;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check if an error is transient and can be retried
 */
function isTransientError(error: any): boolean {
  if (!error) return false;

  const transientErrorCodes = [
    'P2024', // Connection timeout
    'P1001', // Can't reach database server
    'P1002', // Database server timeout
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
  ];

  // Check Prisma error codes
  if (error.code && transientErrorCodes.includes(error.code)) {
    return true;
  }

  // Check error messages
  const transientMessages = [
    'timeout',
    'connection',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
  ];

  const errorMessage = error.message?.toLowerCase() || '';
  return transientMessages.some((msg) => errorMessage.includes(msg));
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
