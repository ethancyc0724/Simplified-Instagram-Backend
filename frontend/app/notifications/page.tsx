'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEvents } from '@/src/logic/hooks';
import type { Event } from '@/src/data/services';

export default function NotificationsPage() {
  const router = useRouter();
  const { events, loading, hasMore, isLoadingMore, loadMoreEvents, handleReadEvent, handleFollowAction, refresh } = useEvents();

  const unreadEvents = events.filter(e => !e.is_read && e.type === 'friend_request');
  const otherEvents = events.filter(e => e.is_read || e.type !== 'friend_request');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-black text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 md:gap-4">
          <Link
            href="/posts"
            className="text-blue-700 hover:text-blue-800 transition-colors flex-shrink-0"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <Link href="/posts" className="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity dark:text-black dark:bg-none dark:bg-clip-border flex-shrink-0">
            Social
          </Link>
          <span className="text-gray-400 dark:text-black flex-shrink-0">/</span>
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-black dark:text-black">
            Notifications
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => refresh()}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {unreadEvents.length === 0 && otherEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-gray-600 dark:text-black">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unread Follow Requests */}
            {unreadEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-black dark:text-black">Follow Requests</h2>
                {unreadEvents.map((event) => {
                  const follower = event.metadata.follower;
                  const followsId = event.metadata.follows_id;
                  if (!follower || !followsId) return null;

                  return (
                    <div
                      key={event.event_id}
                      className="bg-white rounded-lg shadow-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Link href={`/users/${follower.user_id}`} className="flex-shrink-0">
                          {follower.metadata?.profile_image?.url ? (
                            <img
                              src={follower.metadata.profile_image.url}
                              alt={follower.username}
                              className="w-12 h-12 rounded-full object-cover"
                              style={{ objectPosition: 'center center' }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white text-lg">
                              {follower.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/users/${follower.user_id}`}
                            className="font-semibold text-black dark:text-black hover:underline block truncate"
                          >
                            {follower.username}
                          </Link>
                          <p className="text-sm text-gray-600 dark:text-black">{event.message}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleFollowAction(followsId, event.event_id, 'reject')}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleFollowAction(followsId, event.event_id, 'agree')}
                          className="px-4 py-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Events */}
            {otherEvents.length > 0 && (
              <div className="space-y-3">
                {unreadEvents.length > 0 && <h2 className="text-lg font-semibold text-black dark:text-black">Other</h2>}
                {otherEvents.map((event) => {
                  const user = event.metadata.follower || event.metadata.following;
                  if (!user) return null;

                  return (
                    <div
                      key={event.event_id}
                      className={`bg-white rounded-lg shadow-lg p-4 ${!event.is_read ? 'border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Link href={`/users/${user.user_id}`} className="flex-shrink-0">
                          {user.metadata?.profile_image?.url ? (
                            <img
                              src={user.metadata.profile_image.url}
                              alt={user.username}
                              className="w-12 h-12 rounded-full object-cover"
                              style={{ objectPosition: 'center center' }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white text-lg">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1">
                          <Link
                            href={`/users/${user.user_id}`}
                            className="font-semibold text-black dark:text-black hover:underline"
                          >
                            {user.username}
                          </Link>
                          <p className="text-sm text-gray-600 dark:text-black">{event.message}</p>
                        </div>
                        {!event.is_read && (
                          <button
                            onClick={() => handleReadEvent(event.event_id)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreEvents}
                  disabled={isLoadingMore}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
