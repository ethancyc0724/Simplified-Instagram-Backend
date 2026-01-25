/**
 * Data Layer - Follow Service
 * Handles follow-related API requests
 */

import { fetchAPI } from '@/src/infrastructure/http-client';

export const followService = {
  /**
   * Send follow request
   */
  async requestFollow(userId: string): Promise<{ 
    data: { follows_id: string; status: 'agree' | 'pending' }; 
    message: string 
  }> {
    return fetchAPI<{ 
      data: { follows_id: string; status: 'agree' | 'pending' }; 
      message: string 
    }>(`/follows/request/${userId}`, {
      method: 'POST',
    });
  },

  /**
   * Handle follow request (agree/reject/delete)
   */
  async actOnFollow(
    followsId: string,
    status: 'agree' | 'reject' | 'delete'
  ): Promise<{ data: { follows_id: string }; message: string }> {
    return fetchAPI<{ data: { follows_id: string }; message: string }>(`/follows/${followsId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Delete follow relation
   */
  async deleteFollowRelation(
    followsId: string
  ): Promise<{ data: { follows_id: string }; message: string }> {
    return fetchAPI<{ data: { follows_id: string }; message: string }>(`/follows/${followsId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get follow list
   */
  async getFollows(
    type: 'follower' | 'following',
    status: 'pending' | 'agree',
    page: number = 1,
    limit: number = 10,
    userId?: string,
    bypassCache?: boolean
  ): Promise<{
    data: {
      users: Array<{ 
        user_id: string; 
        name?: string; 
        username: string; 
        metadata?: any; 
        follows_id?: string 
      }>;
      pagination: { page: number; limit: number; total: number };
    };
  }> {
    const params = new URLSearchParams({
      type,
      status,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (userId) {
      params.append('user_id', userId);
    }
    if (bypassCache) {
      params.append('_t', Date.now().toString());
    }
    return fetchAPI(`/follows?${params.toString()}`);
  },
};
