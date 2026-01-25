/**
 * Logic Layer - useFollows Hook
 * Handles follow-related business logic
 */

import { useState, useCallback } from 'react';
import { followService } from '@/src/data/services';
import { handleAPIError } from '@/src/infrastructure/error-handler';

export function useFollows() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestFollow = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await followService.requestFollow(userId);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const actOnFollow = useCallback(async (
    followsId: string,
    status: 'agree' | 'reject' | 'delete'
  ) => {
    try {
      setLoading(true);
      setError(null);
      return await followService.actOnFollow(followsId, status);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFollowRelation = useCallback(async (followsId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await followService.deleteFollowRelation(followsId);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollows = useCallback(async (
    type: 'follower' | 'following',
    status: 'pending' | 'agree',
    page: number = 1,
    limit: number = 10,
    userId?: string,
    bypassCache?: boolean
  ) => {
    try {
      setLoading(true);
      setError(null);
      return await followService.getFollows(type, status, page, limit, userId, bypassCache);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requestFollow,
    actOnFollow,
    deleteFollowRelation,
    getFollows,
    loading,
    error,
  };
}
