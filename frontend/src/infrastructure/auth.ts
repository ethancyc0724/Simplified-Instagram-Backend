/**
 * Infrastructure Layer - Authentication Utilities
 * Handles authentication-related utility functions
 */

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Set authentication token to localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * Get current logged-in user ID (parsed from token)
 */
export function getCurrentUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
