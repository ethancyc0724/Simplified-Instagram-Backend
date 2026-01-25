/**
 * Infrastructure Layer - Error Handler
 * Handles unified error processing
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Handle API errors and transform to user-friendly messages
 */
export function handleAPIError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Handle authentication errors
    if (error.message.includes('Not authenticated') || error.message.includes('401')) {
      return 'Please login to continue';
    }
    
    // Handle network errors
    if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Not authenticated') || 
           error.message.includes('401') ||
           error.message.includes('403');
  }
  return false;
}
