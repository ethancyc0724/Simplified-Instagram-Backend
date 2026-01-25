// ==========================================
// Type definitions corresponding to backend schemas/post.py
// ==========================================

// Corresponds to PostImageItem
export interface PostImage {
  image_id: string;
  url: string;
  width?: number;
  height?: number;
  order: number;
}

// Corresponds to PostListItem (post in list)
export interface PostListItem {
  post_id: string;
  content: string;
  images: PostImage[];
  is_liked: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  username: string;
}

// Corresponds to PostListPagination
export interface PostListPagination {
  limit: number;
  cursor_post_id: string | null;
  total: number;
}

// Corresponds to PostListData
export interface PostListData {
  posts: PostListItem[];
  pagination: PostListPagination;
}

// Corresponds to PostListResponse (full response from GET /api/posts)
export interface PostListResponse {
  data: PostListData;
}

// Corresponds to PostDetailCommentUser
export interface PostDetailCommentUser {
  user_id: string;
  name?: string;
  metadata?: Record<string, any>;
}

// Corresponds to PostDetailComment
export interface PostDetailComment {
  comment_id: string;
  content: string;
  created_at: string;
  user: PostDetailCommentUser;
}

// Corresponds to PostDetailData (single post detail)
export interface PostDetailData {
  post_id: string;
  content: string;
  images: PostImage[];
  comments: PostDetailComment[];
  created_at: string;
  is_liked: boolean;
  like_count: number;
  comment_count: number;
  user_id: string;
  username: string;
}

// Corresponds to PostDetailResponse (full response from GET /api/posts/{post_id})
export interface PostDetailResponse {
  data: PostDetailData;
  message: string;
}

// Corresponds to PostCreateData
export interface PostCreateData {
  post_id: string;
}

// Corresponds to PostCreateResponse (full response from POST /api/posts/)
export interface PostCreateResponse {
  data: PostCreateData;
  message: string;
}

// Corresponds to PostUpdateResponse and PostDeleteResponse
export interface PostUpdateResponse extends PostCreateResponse {}
export interface PostDeleteResponse extends PostCreateResponse {}

// ==========================================
// Transformed types for frontend UI (convenient for frontend use)
// ==========================================

/**
 * Transformed post type for frontend UI display
 * Converts backend snake_case to frontend camelCase
 */
export interface Post {
  id: string;                // converted from post_id
  content: string;
  images: PostImage[];
  isLiked: boolean;          // converted from is_liked
  likeCount: number;         // converted from like_count
  commentCount: number;      // converted from comment_count
  createdAt: string;         // converted from created_at
  userId: string;            // converted from user_id
  username: string;          // converted from username
}

/**
 * Transformed post detail type (includes comments)
 */
export interface PostDetail extends Post {
  comments: PostDetailComment[];
}

// ==========================================
// Frontend input types
// ==========================================

/**
 * Input for creating post (corresponds to backend Form data)
 * Backend expects: content (Form) + images (File)
 */
export interface CreatePostInput {
  content: string;           // backend only needs content
  images?: File[];           // optional image uploads
}

/**
 * Input for updating post
 */
export interface UpdatePostInput {
  content?: string;
}
