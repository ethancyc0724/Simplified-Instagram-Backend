'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePosts, useSearch } from '@/src/logic/hooks';
import { getCurrentUserId } from '@/src/infrastructure/auth';
import ImageCarousel from '@/src/components/ImageCarousel';
import type { Post } from '@/src/types/post';

export default function PostsPage() {
  const router = useRouter();
  const { posts, loading, error, toggleLike, deletePost } = usePosts();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    showSearchResults,
    setShowSearchResults,
    isSearching,
    performSearch,
    clearSearch,
    searchRef,
  } = useSearch();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId) {
        const menuElement = document.getElementById(`menu-${openMenuId}`);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleDeletePost = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(postId);
        setOpenMenuId(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete post');
      }
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
    clearSearch();
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const results = await performSearch(query);
    if (results.users.length > 0) {
      handleUserClick(results.users[0].user_id);
    } else if (results.posts.length > 0) {
      router.push(`/posts/${results.posts[0].id}`);
      clearSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-20 overflow-visible">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-4 overflow-visible">
            <Link href="/posts" className="text-2xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              Social
            </Link>
            
            {/* Search bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 max-w-2xl min-w-0"
              ref={searchRef}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-black absolute left-3 z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search users or posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.users.length > 0 || searchResults.posts.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-black bg-white dark:bg-white placeholder-gray-400 dark:placeholder-gray-400 border-gray-300 dark:border-gray-400"
                  suppressHydrationWarning
                  autoComplete="off"
                />
              </div>

              {/* Search results dropdown */}
              {showSearchResults && (searchResults.users.length > 0 || searchResults.posts.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto overflow-x-auto z-30">
                  <div className="min-w-[400px] sm:min-w-0">
                    {/* Users section */}
                    {searchResults.users.length > 0 && (
                      <div className="border-b border-gray-200">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 dark:text-black uppercase">Users</p>
                        </div>
                        {searchResults.users.map((user) => (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => handleUserClick(user.user_id)}
                            className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5 flex-shrink-0">
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                <span className="text-lg">👤</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-black dark:text-black">
                                @{user.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Posts section */}
                    {searchResults.posts.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 dark:text-black uppercase">Posts</p>
                        </div>
                        {searchResults.posts.map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => {
                              router.push(`/posts/${post.id}`);
                              clearSearch();
                            }}
                            className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left border-b border-gray-100 last:border-b-0"
                          >
                            {post.images && post.images.length > 0 ? (
                              <div className="w-12 h-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                                <img
                                  src={post.images[0].url}
                                  alt={post.content.slice(0, 50)}
                                  className="w-full h-full object-cover"
                                  style={{ objectPosition: 'center center' }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 flex-shrink-0 flex items-center justify-center">
                                <span className="text-lg">📝</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm truncate text-black dark:text-black">
                                  {post.username}
                                </p>
                              </div>
                              <p className="text-gray-600 dark:text-black text-sm line-clamp-2">{post.content}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <Link
                href="/notifications"
                className="p-2 hover:opacity-70 transition-opacity"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <Link
                href="/posts/create"
                className="px-2 py-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-lg text-xs font-semibold hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors whitespace-nowrap"
              >
                + Create Post
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 dark:text-black">Loading...</div>
          </div>
        ) : posts.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-gray-500 dark:text-black text-lg">No posts yet</p>
            <Link
              href="/posts/create"
              className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors"
            >
              Create the first post
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white border border-gray-300 rounded-lg overflow-hidden w-full"
              >
                {/* Post header */}
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
                  <Link href={`/users/${post.userId}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5 hover:opacity-80 transition-opacity">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/users/${post.userId}`} className="font-semibold text-sm hover:underline text-black dark:text-black truncate block">
                      {post.username}
                    </Link>
                  </div>
                  {getCurrentUserId() === post.userId && (
                    <div className="relative flex-shrink-0" id={`menu-${post.id}`}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                        className="text-gray-600 dark:text-black hover:text-gray-900 dark:hover:text-gray-700"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {openMenuId === post.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                          <Link
                            href={`/posts/${post.id}/edit`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setOpenMenuId(null)}
                          >
                            Edit Post
                          </Link>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                          >
                            Delete Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Image area */}
                {post.images && post.images.length > 0 ? (
                  <div className="group w-full">
                    <ImageCarousel
                      images={post.images}
                      alt={post.content.slice(0, 50)}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 flex items-center justify-center">
                    <div className="text-center px-8">
                      <div className="text-4xl mb-2">📝</div>
                      <p className="text-gray-600 dark:text-black text-sm line-clamp-3">{post.content}</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {post.isLiked ? (
                        <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>
                    <Link href={`/posts/${post.id}/comments`} className="hover:opacity-70 transition-opacity">
                      <svg className="w-7 h-7 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </Link>
                    <div className="flex-1" />
                  </div>

                  {/* Likes and interactions */}
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-black dark:text-black">
                      {post.likeCount > 0 && `${post.likeCount} likes`}
                    </p>
                    
                    {/* Post content */}
                    <div className="text-sm text-black dark:text-black">
                      <Link href={`/users/${post.userId}`} className="font-semibold mr-2 hover:underline text-black dark:text-black">
                        {post.username}
                      </Link>
                      <span className="text-black dark:text-black">{post.content}</span>
                    </div>

                    {/* Comment count */}
                    {post.commentCount > 0 && (
                      <Link
                        href={`/posts/${post.id}/comments`}
                        className="text-gray-500 dark:text-black text-sm hover:underline block"
                      >
                        View all {post.commentCount} comments
                      </Link>
                    )}

                    {/* Timestamp */}
                    <p className="text-gray-400 dark:text-black text-xs uppercase" suppressHydrationWarning>
                      {new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
