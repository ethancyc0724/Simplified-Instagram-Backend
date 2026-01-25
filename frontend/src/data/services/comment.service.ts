/**
 * Data Layer - Comment Service
 * Handles comment-related API requests
 */

import { fetchAPI } from '@/src/infrastructure/http-client';

export interface Comment {
  comment_id: string;
  content: string;
  created_at: string;
  user: {
    user_id: string;
    name?: string;
    username: string;
    metadata?: Record<string, any>;
  };
}

export interface CommentListResponse {
  data: {
    comments: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  message: string;
}

export interface CommentCreateResponse {
  data: {
    comment_id: string;
  };
  message: string;
}

export interface CommentUpdateResponse extends CommentCreateResponse {}
export interface CommentDeleteResponse extends CommentCreateResponse {}

export const commentService = {
  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<CommentListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return fetchAPI<CommentListResponse>(`/posts/comment/${postId}?${params.toString()}`);
  },

  /**
   * Create comment
   */
  async createComment(
    postId: string,
    content: string
  ): Promise<CommentCreateResponse> {
    return fetchAPI<CommentCreateResponse>(`/posts/comment/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Update comment
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<CommentUpdateResponse> {
    return fetchAPI<CommentUpdateResponse>(`/posts/comment/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<CommentDeleteResponse> {
    return fetchAPI<CommentDeleteResponse>(`/posts/comment/${commentId}`, {
      method: 'DELETE',
    });
  },
};
