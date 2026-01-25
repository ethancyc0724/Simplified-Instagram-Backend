/**
 * Legacy API - Backward Compatibility Layer
 * Maintains original API interface for backward compatibility
 * New code should directly use Data Layer services
 * 
 * @deprecated Please use services from @/src/data/services
 */

// Re-export from infrastructure
export { getCurrentUserId } from '@/src/infrastructure/auth';

// Re-export from data services
export { postService as postService } from '@/src/data/services';
export { commentService } from '@/src/data/services';
export { userService } from '@/src/data/services';
export { followService } from '@/src/data/services';
export { eventService } from '@/src/data/services';

// Legacy function exports for backward compatibility
import { postService } from '@/src/data/services';
import { commentService, type Comment, type CommentListResponse, type CommentCreateResponse, type CommentUpdateResponse, type CommentDeleteResponse } from '@/src/data/services';
import { userService } from '@/src/data/services';
import { followService } from '@/src/data/services';
import { eventService } from '@/src/data/services';

// Post functions
export const getPosts = postService.getPosts;
export const getPost = postService.getPost;
export const createPost = postService.createPost;
export const updatePost = postService.updatePost;
export const deletePost = postService.deletePost;
export const likePost = postService.likePost;
export const unlikePost = postService.unlikePost;

// Comment functions
export const getComments = commentService.getComments;
export const createComment = commentService.createComment;
export const updateComment = commentService.updateComment;
export const deleteComment = commentService.deleteComment;
export type { Comment, CommentListResponse, CommentCreateResponse, CommentUpdateResponse, CommentDeleteResponse };

// User functions
export const searchUsers = userService.searchUsers;
export const getUserDetail = userService.getUserDetail;
export const login = userService.login;
export const register = userService.register;
export const updateProfile = userService.updateProfile;

// Follow functions
export const requestFollow = followService.requestFollow;
export const actOnFollow = followService.actOnFollow;
export const deleteFollowRelation = followService.deleteFollowRelation;
export const getFollows = followService.getFollows;

// Event functions
export const getEvents = eventService.getEvents;
export const readEvent = eventService.readEvent;
