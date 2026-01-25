'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFollows, useUser } from '@/src/logic/hooks';
import { getCurrentUserId } from '@/src/infrastructure/auth';
import { followService } from '@/src/data/services';

export default function FollowingPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const currentUserId = getCurrentUserId();

  const { userData, loading: userLoading, refresh: refreshUser } = useUser(userId);
  const { getFollows, loading: followsLoading } = useFollows();
  
  const [following, setFollowing] = useState<Array<{ user_id: string; name?: string; username: string; metadata?: any; follows_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check if viewing own profile, otherwise deny access
    if (!currentUserId || userId !== currentUserId) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    loadData();
  }, [userId, currentUserId]);

  const loadData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const followingData = await getFollows('following', 'agree', 1, 20, userId);
      setFollowing(followingData.data.users);
      setPage(1);
      setHasMore(1 < followingData.data.pagination.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('401')) {
        router.push('/login');
      } else {
        router.push(`/users/${userId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading || !userId) return;
    try {
      const nextPage = page + 1;
      const followingData = await getFollows('following', 'agree', nextPage, 20, userId);
      setFollowing([...following, ...followingData.data.users]);
      setPage(nextPage);
      setHasMore(nextPage < followingData.data.pagination.total);
    } catch (err) {
      console.error('Failed to load more following:', err);
    }
  };

  const handleUnfollow = async (followsId: string, targetUserId: string) => {
    if (confirm('Unfollow this user?')) {
      try {
        await followService.deleteFollowRelation(followsId);
        // Remove from list
        setFollowing(following.filter(u => u.user_id !== targetUserId));
        // Update user data
        await refreshUser();
      } catch (err) {
        console.error('Failed to unfollow:', err);
        alert(err instanceof Error ? err.message : 'Failed to unfollow');
      }
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-black text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-blue-700 hover:text-blue-800 transition-colors"
            >
              <svg
                className="w-6 h-6"
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
            </button>
            <h1 className="text-xl font-semibold text-black dark:text-black">Following</h1>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-700 mb-6">You can only view your own following.</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-blue-700 hover:text-blue-800 transition-colors"
          >
            <svg
              className="w-6 h-6"
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
          </button>
          <Link href="/posts" className="text-lg font-semibold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Social
          </Link>
          <span className="text-gray-400 dark:text-black">/</span>
          <Link href={`/users/${userId}`} className="text-lg font-semibold text-black dark:text-black hover:underline">
            {userData?.user.username || userId}
          </Link>
          <span className="text-gray-400 dark:text-black">/</span>
          <h1 className="text-lg font-semibold text-black dark:text-black">Following</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {following.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-600 dark:text-black">Not following anyone yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((user) => (
              <div
                key={user.user_id}
                className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <Link href={`/users/${user.user_id}`} className="flex-shrink-0">
                    {user.metadata?.profile_image?.url ? (
                      <img
                        src={user.metadata.profile_image.url}
                        alt={user.username}
                        className="w-16 h-16 rounded-full object-cover"
                        style={{ objectPosition: 'center center' }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white text-2xl">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <Link href={`/users/${user.user_id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-lg text-black dark:text-black truncate">
                      {user.name || user.username}
                    </p>
                    <p className="text-gray-600 dark:text-black text-sm">@{user.username}</p>
                  </Link>
                  {user.follows_id && (
                    <button
                      onClick={() => handleUnfollow(user.follows_id!, user.user_id)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
                    >
                      Unfollow
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
