/**
 * Data Layer - User Service
 * Handles user-related API requests
 */

import { fetchAPI } from '@/src/infrastructure/http-client';
import { setAuthToken } from '@/src/infrastructure/auth';
import type {
  UserListResponse,
  UserDetailResponse,
  User,
  UserDetailData,
  UserLoginInput,
  UserLoginResponse,
  UserRegisterInput,
  UserRegisterResponse,
} from '@/src/types/user';

export const userService = {
  /**
   * Search users
   */
  async searchUsers(
    search: string,
    limit: number = 10,
    page: number = 1
  ): Promise<User[]> {
    const params = new URLSearchParams({
      search,
      limit: limit.toString(),
      page: page.toString(),
    });
    const response = await fetchAPI<UserListResponse>(`/users?${params.toString()}`);
    return response.data.users;
  },

  /**
   * Get user detail
   */
  async getUserDetail(userId: string, bypassCache?: boolean): Promise<UserDetailData> {
    const timestamp = Date.now();
    const url = bypassCache 
      ? `/users/${userId}?_t=${timestamp}&_nocache=1` 
      : `/users/${userId}?_t=${timestamp}`;
    const response = await fetchAPI<UserDetailResponse>(url);
    return response.data;
  },

  /**
   * Login user
   */
  async login(data: UserLoginInput): Promise<UserLoginResponse> {
    const response = await fetchAPI<UserLoginResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.data.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  /**
   * Register user
   */
  async register(data: UserRegisterInput): Promise<UserRegisterResponse> {
    const response = await fetchAPI<UserRegisterResponse>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.data.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: {
    name?: string;
    username?: string;
    is_public?: boolean;
    profile?: string;
    profile_image?: File;
  }): Promise<{ data: { user_id: string }; message: string }> {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.username !== undefined) formData.append('username', data.username);
    if (data.is_public !== undefined) formData.append('is_public', String(data.is_public));
    if (data.profile !== undefined) formData.append('profile', data.profile);
    if (data.profile_image) formData.append('profile_image', data.profile_image);

    return fetchAPI<{ data: { user_id: string }; message: string }>('/users/', {
      method: 'PATCH',
      body: formData,
    });
  },
};
