/**
 * Logic Layer - useUserProfile Hook
 * Handles user profile page business logic (includes follow relationships)
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUserId } from '@/src/infrastructure/auth';
import { userService } from '@/src/data/services';
import { followService } from '@/src/data/services';
import { postService } from '@/src/data/services';
import { handleAPIError } from '@/src/infrastructure/error-handler';
import type { UserDetailData } from '@/src/types/user';
import type { Post } from '@/src/types/post';

export function useUserProfile(userId: string, bypassCache?: boolean) {
  const currentUserId = getCurrentUserId();
  const isSelf = currentUserId === userId;

  const [userData, setUserData] = useState<UserDetailData | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequested, setIsRequested] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsId, setFollowsId] = useState<string | null>(null);
  const [followerFollowsId, setFollowerFollowsId] = useState<string | null>(null);
  const [relationLoading, setRelationLoading] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(false);

  // Find follow relation ID (auto pagination)
  const findFollowsId = useCallback(async (
    listType: 'follower' | 'following', 
    status: 'pending' | 'agree', 
    bypassCache?: boolean
  ): Promise<string | null> => {
    for (let page = 1; page <= 20; page++) {
      const res = await followService.getFollows(listType, status, page, 50, undefined, bypassCache);
      const hit = res.data.users.find((u) => u.user_id === userId);
      if (hit?.follows_id) return hit.follows_id;
      if (page >= res.data.pagination.total) break;
    }
    return null;
  }, [userId]);

  // Update follow relation status
  const updateFollowRelation = useCallback(async (forceRefresh?: boolean) => {
    const agreeId = await findFollowsId('following', 'agree', forceRefresh);
    if (agreeId) {
      setIsFollowing(true);
      setIsRequested(false);
      setFollowsId(agreeId);
      return;
    }
    const pendingId = await findFollowsId('following', 'pending', forceRefresh);
    if (pendingId) {
      setIsRequested(true);
      setIsFollowing(false);
      setFollowsId(pendingId);
    } else {
      setIsFollowing(false);
      setIsRequested(false);
      setFollowsId(null);
    }
  }, [findFollowsId]);

  // Load user data
  const loadUserData = useCallback(async (forceRefresh?: boolean) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const shouldBypassCache = forceRefresh || bypassCache || isSelf;
      const [userDetail, posts] = await Promise.all([
        userService.getUserDetail(userId, shouldBypassCache),
        postService.getPosts(undefined, userId).catch(() => []),
      ]);

      setUserData(userDetail);
      setUserPosts(posts);

      // Load follow relations for other users' profiles
      if (!isSelf) {
        try {
          setRelationLoading(true);
          await updateFollowRelation(true);
          const theirAgreeId = await findFollowsId('follower', 'agree', true);
          setFollowerFollowsId(theirAgreeId || await findFollowsId('follower', 'pending', true));
        } catch (err) {
          setIsFollowing(userDetail.is_following || false);
          setIsRequested(false);
          setFollowsId(null);
          setFollowerFollowsId(null);
        } finally {
          setRelationLoading(false);
        }
      } else {
        setIsFollowing(userDetail.is_following);
      }
    } catch (err) {
      const errorMessage = handleAPIError(err);
      console.error('Failed to load user data:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, bypassCache, isSelf, updateFollowRelation, findFollowsId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Handle follow request
  const handleFollow = useCallback(async () => {
    if (followActionLoading) return;
    try {
      setFollowActionLoading(true);
      const result = await followService.requestFollow(userId);
      const status = result.data?.status;
      const newFollowsId = result.data?.follows_id;

      if (status === 'agree') {
        setIsFollowing(true);
        setIsRequested(false);
        setFollowsId(newFollowsId || await findFollowsId('following', 'agree', true));
      } else if (status === 'pending') {
        setIsRequested(true);
        setIsFollowing(false);
        setFollowsId(newFollowsId || await findFollowsId('following', 'pending', true));
      } else {
        await updateFollowRelation(true);
      }

      const userDetail = await userService.getUserDetail(userId, true);
      setUserData(userDetail);
    } catch (err) {
      await updateFollowRelation(true);
    } finally {
      setFollowActionLoading(false);
    }
  }, [userId, followActionLoading, findFollowsId, updateFollowRelation]);

  // Handle unfollow
  const handleUnfollow = useCallback(async () => {
    if (!followsId) return;
    try {
      await followService.actOnFollow(followsId, 'delete');
      setIsFollowing(false);
      setIsRequested(false);
      setFollowsId(null);
      const userDetail = await userService.getUserDetail(userId, true);
      setUserData(userDetail);
    } catch (err) {
      await updateFollowRelation();
    }
  }, [followsId, userId, updateFollowRelation]);

  return {
    userData,
    userPosts,
    loading,
    isSelf,
    isFollowing,
    isRequested,
    followsId,
    followerFollowsId,
    relationLoading,
    followActionLoading,
    handleFollow,
    handleUnfollow,
    refresh: loadUserData,
  };
}
