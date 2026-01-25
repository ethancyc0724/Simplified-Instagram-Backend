/**
 * Data Layer - Event Service
 * Handles event/notification-related API requests
 */

import { fetchAPI } from '@/src/infrastructure/http-client';

export interface Event {
  event_id: string;
  message: string;
  is_read: boolean;
  type: string;
  metadata: any;
}

export interface EventListResponse {
  data: {
    events: Event[];
    pagination: { page: number; limit: number; total: number };
  };
}

export const eventService = {
  /**
   * Get events/notifications list
   */
  async getEvents(
    page: number = 1,
    limit: number = 10
  ): Promise<EventListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return fetchAPI<EventListResponse>(`/events?${params.toString()}`);
  },

  /**
   * Mark event as read
   */
  async readEvent(eventId: string): Promise<{ 
    data: { event_id: string }; 
    message: string 
  }> {
    return fetchAPI<{ data: { event_id: string }; message: string }>(`/events/read/${eventId}`, {
      method: 'POST',
    });
  },
};
