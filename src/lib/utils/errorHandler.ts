/**
 * Comprehensive error handling utilities
 */

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  isOperational?: boolean;
}

export class APIError extends Error implements AppError {
  code: string;
  statusCode: number;
  context: Record<string, any>;
  isOperational: boolean;

  constructor(
    message: string,
    code: string = 'API_ERROR',
    statusCode: number = 500,
    context: Record<string, any> = {},
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

export class ValidationError extends APIError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required', context: Record<string, any> = {}) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Access denied', context: Record<string, any> = {}) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found', context: Record<string, any> = {}) {
    super(message, 'NOT_FOUND_ERROR', 404, context);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded', context: Record<string, any> = {}) {
    super(message, 'RATE_LIMIT_ERROR', 429, context);
    this.name = 'RateLimitError';
  }
}

export class AIProviderError extends APIError {
  constructor(message: string, provider: string, context: Record<string, any> = {}) {
    super(message, 'AI_PROVIDER_ERROR', 502, { ...context, provider });
    this.name = 'AIProviderError';
  }
}

/**
 * Error handler for API routes
 */
export function handleAPIError(error: unknown): {
  error: string;
  code?: string;
  statusCode: number;
  context?: Record<string, any>;
} {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('Authentication required')) {
      return {
        error: 'Authentication required',
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
      };
    }

    if (error.message.includes('not found')) {
      return {
        error: error.message,
        code: 'NOT_FOUND_ERROR',
        statusCode: 404,
      };
    }

    if (error.message.includes('validation')) {
      return {
        error: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      };
    }

    // Generic error
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  // Unknown error
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

/**
 * Error handler for client-side operations
 */
export function handleClientError(error: unknown, context?: string): {
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: string;
} {
  console.error(`Client Error${context ? ` (${context})` : ''}:`, error);

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        message: 'Network error. Please check your connection.',
        type: 'error',
        action: 'retry',
      };
    }

    // Authentication errors
    if (error.message.includes('Authentication') || error.message.includes('401')) {
      return {
        message: 'Please sign in to continue.',
        type: 'warning',
        action: 'login',
      };
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('400')) {
      return {
        message: error.message,
        type: 'warning',
      };
    }

    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return {
        message: 'Too many requests. Please wait a moment.',
        type: 'warning',
      };
    }

    // AI provider errors
    if (error.message.includes('AI') || error.message.includes('provider')) {
      return {
        message: 'AI service temporarily unavailable. Please try again.',
        type: 'error',
        action: 'retry',
      };
    }

    return {
      message: error.message,
      type: 'error',
    };
  }

  return {
    message: 'An unexpected error occurred',
    type: 'error',
  };
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Safe async operation failed:', err);
    return { error: err, data: fallback };
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  };

  console.error('Application Error:', JSON.stringify(errorInfo, null, 2));

  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, or similar
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'AUTHENTICATION_ERROR':
        return 'Please sign in to continue.';
      case 'AUTHORIZATION_ERROR':
        return 'You don\'t have permission to perform this action.';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'NOT_FOUND_ERROR':
        return 'The requested resource was not found.';
      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment and try again.';
      case 'AI_PROVIDER_ERROR':
        return 'AI service is temporarily unavailable. Please try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}