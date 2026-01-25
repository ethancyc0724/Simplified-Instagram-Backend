/**
 * Logic Layer - useSearch Hook
 * Handles search-related business logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { userService } from '@/src/data/services';
import { postService } from '@/src/data/services';
import { handleAPIError } from '@/src/infrastructure/error-handler';
import type { User } from '@/src/types/user';
import type { Post } from '@/src/types/post';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{users: User[], posts: Post[]}>({users: [], posts: []});
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLFormElement>(null);

  const performSearch = useCallback(async (query: string): Promise<{users: User[], posts: Post[]}> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults({users: [], posts: []});
      setShowSearchResults(false);
      setIsSearching(false);
      return {users: [], posts: []};
    }

    setIsSearching(true);
    try {
      const [users, postsResult] = await Promise.all([
        userService.searchUsers(trimmedQuery).catch(() => []),
        postService.getPosts(trimmedQuery).catch(() => [])
      ]);
      const results = {users, posts: postsResult};
      setSearchResults(results);
      setShowSearchResults(results.users.length > 0 || results.posts.length > 0);
      return results;
    } catch {
      setSearchResults({users: [], posts: []});
      setShowSearchResults(false);
      return {users: [], posts: []};
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({users: [], posts: []});
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 700);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSearchResults]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults({users: [], posts: []});
    setShowSearchResults(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showSearchResults,
    setShowSearchResults,
    isSearching,
    performSearch,
    clearSearch,
    searchRef,
  };
}
