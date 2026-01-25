/**
 * Logic Layer - usePosts Hook
 * Handles post-related business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { postService } from '@/src/data/services';
import { handleAPIError } from '@/src/infrastructure/error-handler';
import type { Post, CreatePostInput, UpdatePostInput } from '@/src/types/post';

export function usePosts(search?: string, userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await postService.getPosts(search, userId);
      setPosts(data);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [search, userId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const createPost = useCallback(async (data: CreatePostInput) => {
    try {
      await postService.createPost(data);
      await loadPosts(); // Refresh list
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, [loadPosts]);

  const updatePost = useCallback(async (id: string, data: UpdatePostInput) => {
    try {
      await postService.updatePost(id, data);
      await loadPosts(); // Refresh list
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, [loadPosts]);

  const deletePost = useCallback(async (id: string) => {
    try {
      await postService.deletePost(id);
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, [posts]);

  const toggleLike = useCallback(async (post: Post) => {
    const wasLiked = post.isLiked;
    const newLikeCount = wasLiked ? post.likeCount - 1 : post.likeCount + 1;

    // Optimistic update
    setPosts(posts.map(p => 
      p.id === post.id 
        ? { ...p, isLiked: !wasLiked, likeCount: newLikeCount }
        : p
    ));

    try {
      if (wasLiked) {
        await postService.unlikePost(post.id);
      } else {
        await postService.likePost(post.id);
      }
    } catch (err) {
      // Revert on error
      setPosts(posts);
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
    }
  }, [posts]);

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    refresh: loadPosts,
  };
}
