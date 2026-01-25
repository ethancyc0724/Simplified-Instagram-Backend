/**
 * Data Layer - Post Service
 * Handles post-related API requests
 */

import { fetchAPI } from '@/src/infrastructure/http-client';
import type {
  PostListResponse,
  PostDetailResponse,
  PostCreateResponse,
  PostUpdateResponse,
  PostDeleteResponse,
  Post,
  PostDetail,
  CreatePostInput,
  UpdatePostInput,
} from '@/src/types/post';

/**
 * Transform post list item from API response
 */
function transformPostListItem(item: {
  post_id: string;
  content: string;
  images: any[];
  is_liked: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  username: string;
}): Post {
  const validImages = (item.images || []).filter((img: any) => img?.url?.trim());
  return {
    id: item.post_id,
    content: item.content,
    images: validImages,
    isLiked: item.is_liked,
    likeCount: item.like_count,
    commentCount: item.comment_count,
    createdAt: item.created_at,
    userId: item.user_id,
    username: item.username,
  };
}

/**
 * Transform post detail from API response
 */
function transformPostDetailData(data: {
  post_id: string;
  content: string;
  images: any[];
  comments: any[];
  created_at: string;
  is_liked: boolean;
  like_count: number;
  comment_count: number;
  user_id: string;
  username: string;
}): PostDetail {
  return {
    id: data.post_id,
    content: data.content,
    images: data.images,
    comments: data.comments,
    isLiked: data.is_liked,
    likeCount: data.like_count,
    commentCount: data.comment_count,
    createdAt: data.created_at,
    userId: data.user_id,
    username: data.username,
  };
}

export const postService = {
  /**
   * Get posts list
   */
  async getPosts(search?: string, userId?: string): Promise<Post[]> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (search) params.append('search', search);
    const response = await fetchAPI<PostListResponse>(`/posts?${params.toString()}`);
    return response.data.posts.map(transformPostListItem);
  },

  /**
   * Get single post detail
   */
  async getPost(id: string): Promise<PostDetail> {
    const response = await fetchAPI<PostDetailResponse>(`/posts/${id}`);
    return transformPostDetailData(response.data);
  },

  /**
   * Create new post
   */
  async createPost(data: CreatePostInput): Promise<PostCreateResponse> {
    const formData = new FormData();
    formData.append('content', data.content);

    if (data.images?.length) {
      data.images.forEach((image) => formData.append('images', image));
    }

    return fetchAPI<PostCreateResponse>('/posts/', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Update post
   */
  async updatePost(id: string, data: UpdatePostInput): Promise<PostUpdateResponse> {
    return fetchAPI<PostUpdateResponse>(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete post
   */
  async deletePost(id: string): Promise<void> {
    await fetchAPI<PostDeleteResponse>(`/posts/${id}`, { method: 'DELETE' });
  },

  /**
   * Like post
   */
  async likePost(id: string): Promise<PostCreateResponse> {
    return fetchAPI<PostCreateResponse>(`/posts/like/${id}`, { method: 'POST' });
  },

  /**
   * Unlike post
   */
  async unlikePost(id: string): Promise<PostCreateResponse> {
    return fetchAPI<PostCreateResponse>(`/posts/unlike/${id}`, { method: 'POST' });
  },
};
