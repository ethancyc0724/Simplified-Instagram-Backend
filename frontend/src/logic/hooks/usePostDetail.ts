/**
 * Logic Layer - usePostDetail Hook
 * Handles single post detail page business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { postService, commentService } from '@/src/data/services';
import { getCurrentUserId } from '@/src/infrastructure/auth';
import { handleAPIError, isAuthError } from '@/src/infrastructure/error-handler';
import type { PostDetail } from '@/src/types/post';
import type { Comment } from '@/src/data/services/comment.service';

export function usePostDetail(postId: string) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [latestComment, setLatestComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPost = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [postData, commentsData] = await Promise.all([
        postService.getPost(postId),
        commentService.getComments(postId, 1, 1).catch(() => ({ 
          data: { comments: [], pagination: { page: 1, limit: 1, total: 0 } } 
        })),
      ]);
      setPost(postData);
      setLatestComment(commentsData.data.comments.length > 0 ? commentsData.data.comments[0] : null);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      if (isAuthError(err)) {
        router.push('/login');
      } else {
        router.push('/posts');
      }
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const toggleLike = useCallback(async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    const newLikeCount = wasLiked ? post.likeCount - 1 : post.likeCount + 1;

    // Optimistic update
    setPost({
      ...post,
      isLiked: !wasLiked,
      likeCount: newLikeCount,
    });

    try {
      if (wasLiked) {
        await postService.unlikePost(post.id);
      } else {
        await postService.likePost(post.id);
      }
    } catch (err) {
      // Revert on error
      setPost({
        ...post,
        isLiked: wasLiked,
        likeCount: post.likeCount,
      });
    }
  }, [post]);

  const deletePost = useCallback(async () => {
    if (!post) return;
    try {
      await postService.deletePost(post.id);
      router.push('/posts');
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(errorMessage);
    }
  }, [post, router]);

  const isOwnPost = post && getCurrentUserId() === post.userId;

  return {
    post,
    latestComment,
    loading,
    isOwnPost,
    toggleLike,
    deletePost,
    refresh: loadPost,
  };
}
