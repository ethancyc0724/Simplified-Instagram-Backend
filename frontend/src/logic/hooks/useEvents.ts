/**
 * Logic Layer - useEvents Hook
 * Handles event/notification-related business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { eventService, followService } from '@/src/data/services';
import { handleAPIError, isAuthError } from '@/src/infrastructure/error-handler';
import type { Event } from '@/src/data/services/event.service';

export function useEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadEvents = useCallback(async (resetPage: boolean = false) => {
    try {
      if (resetPage) {
        setLoading(true);
        setPage(1);
      }
      const targetPage = resetPage ? 1 : page;
      const response = await eventService.getEvents(targetPage, 20);
      if (resetPage) {
        setEvents(response.data.events);
      } else {
        setEvents((prev) => [...prev, ...response.data.events]);
      }
      setHasMore(targetPage < response.data.pagination.total);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      if (isAuthError(err)) {
        router.push('/login');
      } else {
        console.error('Failed to load events:', errorMessage);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, router]);

  useEffect(() => {
    loadEvents(true);
  }, []);

  const loadMoreEvents = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const response = await eventService.getEvents(nextPage, 20);
      setEvents((prev) => [...prev, ...response.data.events]);
      setPage(nextPage);
      setHasMore(nextPage < response.data.pagination.total);
    } catch (err) {
      const errorMessage = handleAPIError(err);
      if (isAuthError(err)) {
        router.push('/login');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, page, router]);

  const handleReadEvent = useCallback(async (eventId: string) => {
    try {
      await eventService.readEvent(eventId);
      setEvents(events.map(e => e.event_id === eventId ? { ...e, is_read: true } : e));
    } catch (err) {
      console.error('Failed to mark event as read:', err);
    }
  }, [events]);

  const handleFollowAction = useCallback(async (followsId: string, eventId: string, action: 'agree' | 'reject') => {
    try {
      await followService.actOnFollow(followsId, action);
      await handleReadEvent(eventId);
      await loadEvents(true);
    } catch (err) {
      console.error(`Failed to ${action} follow request:`, err);
    }
  }, [handleReadEvent, loadEvents]);

  return {
    events,
    loading,
    hasMore,
    isLoadingMore,
    loadMoreEvents,
    handleReadEvent,
    handleFollowAction,
    refresh: () => loadEvents(true),
  };
}
