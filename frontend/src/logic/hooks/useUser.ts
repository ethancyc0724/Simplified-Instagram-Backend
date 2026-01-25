/**
 * Logic Layer - useUser Hook
 * Handles user-related business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '@/src/data/services';
import { handleAPIError, isAuthError } from '@/src/infrastructure/error-handler';
import type { UserDetailData } from '@/src/types/user';

export function useUser(userId: string, bypassCache?: boolean) {
  const router = useRouter();
  const [userData, setUserData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserDetail(userId, bypassCache);
      setUserData(data);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      
      if (isAuthError(err)) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, bypassCache, router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const updateProfile = useCallback(async (data: {
    name?: string;
    username?: string;
    is_public?: boolean;
    profile?: string;
    profile_image?: File;
  }) => {
    try {
      await userService.updateProfile(data);
      await loadUser(); // Refresh user data
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, [loadUser]);

  return {
    userData,
    loading,
    error,
    updateProfile,
    refresh: loadUser,
  };
}
