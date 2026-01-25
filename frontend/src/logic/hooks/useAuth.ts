/**
 * Logic Layer - useAuth Hook
 * Handles authentication-related business logic
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserId, isAuthenticated, removeAuthToken } from '@/src/infrastructure/auth';
import { userService } from '@/src/data/services';
import { handleAPIError, isAuthError } from '@/src/infrastructure/error-handler';
import type { UserLoginInput, UserRegisterInput } from '@/src/types/user';

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (data: UserLoginInput) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.login(data);
      router.push('/posts');
      return response;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (data: UserRegisterInput) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.register(data);
      router.push('/posts');
      return response;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    removeAuthToken();
    router.push('/login');
  }, [router]);

  const currentUserId = getCurrentUserId();
  const authenticated = isAuthenticated();

  return {
    login,
    register,
    logout,
    currentUserId,
    authenticated,
    loading,
    error,
  };
}
