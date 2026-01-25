/**
 * Logic Layer - useComments Hook
 * Handles comment-related business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { commentService, postService } from '@/src/data/services';
import { getCurrentUserId } from '@/src/infrastructure/auth';
import { handleAPIError, isAuthError } from '@/src/infrastructure/error-handler';
import type { PostDetail } from '@/src/types/post';
import type { Comment } from '@/src/data/services/comment.service';

export function useComments(postId: string) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const loadData = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [postData, commentsData] = await Promise.all([
        postService.getPost(postId).catch(() => null),
        commentService.getComments(postId, 1, 20).catch(() => ({ 
          data: { comments: [], pagination: { page: 1, limit: 20, total: 0 } } 
        })),
      ]);
      setPost(postData);
      setComments(commentsData.data.comments);
      setCommentPage(1);
      setHasMoreComments(commentsData.data.pagination.page < commentsData.data.pagination.total);
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
    loadData();
  }, [loadData]);

  const loadMoreComments = useCallback(async () => {
    if (!hasMoreComments || isSubmittingComment || !postId) return;
    try {
      const nextPage = commentPage + 1;
      const commentsData = await commentService.getComments(postId, nextPage, 20);
      setComments((prevComments) => [...prevComments, ...commentsData.data.comments]);
      setCommentPage(nextPage);
      setHasMoreComments(nextPage < commentsData.data.pagination.total);
    } catch (err) {
      console.error('Failed to load more comments:', err);
    }
  }, [hasMoreComments, isSubmittingComment, postId, commentPage]);

  const createComment = useCallback(async (content: string) => {
    if (!content.trim() || isSubmittingComment || !postId) return;
    setIsSubmittingComment(true);
    try {
      await commentService.createComment(postId, content.trim());
      // Reload comments to get the new one
      const commentsData = await commentService.getComments(postId, 1, commentPage * 20 + 1);
      setComments(commentsData.data.comments);
      setPost((prevPost) => {
        if (!prevPost) return prevPost;
        return {
          ...prevPost,
          commentCount: prevPost.commentCount + 1,
        };
      });
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(errorMessage);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [postId, isSubmittingComment, commentPage]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      await commentService.updateComment(commentId, content.trim());
      setComments((prevComments) => prevComments.map(c => 
        c.comment_id === commentId 
          ? { ...c, content: content.trim() }
          : c
      ));
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(errorMessage);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      setComments((prevComments) => prevComments.filter(c => c.comment_id !== commentId));
      setPost((prevPost) => {
        if (!prevPost) return prevPost;
        return {
          ...prevPost,
          commentCount: Math.max(0, prevPost.commentCount - 1),
        };
      });
    } catch (err) {
      const errorMessage = handleAPIError(err);
      alert(errorMessage);
    }
  }, []);

  const isOwnComment = useCallback((comment: Comment) => {
    return getCurrentUserId() === comment.user.user_id;
  }, []);

  return {
    post,
    comments,
    loading,
    hasMoreComments,
    isSubmittingComment,
    loadMoreComments,
    createComment,
    updateComment,
    deleteComment,
    isOwnComment,
    refresh: loadData,
  };
}
