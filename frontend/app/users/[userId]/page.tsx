'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/src/logic/hooks';
import { followService } from '@/src/data/services';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params?.userId as string;
  
  const refreshParam = searchParams?.get('refresh');
  const {
    userData,
    userPosts,
    loading,
    isSelf,
    isFollowing,
    isRequested,
    followerFollowsId,
    followActionLoading,
    handleFollow,
    handleUnfollow,
    refresh,
  } = useUserProfile(userId, !!refreshParam);

  const [avatarError, setAvatarError] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Clear refresh param from URL after data is loaded
  useEffect(() => {
    if (refreshParam && typeof window !== 'undefined' && userData) {
      router.replace(`/users/${userId}`, { scroll: false });
    }
  }, [refreshParam, userData, userId, router]);

  // Refresh data when refresh param changes
  useEffect(() => {
    if (refreshParam) {
      refresh(true);
    }
  }, [refreshParam, refresh]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-black text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  const { user, follower_count, following_count, post_count } = userData;

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
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-black dark:text-black truncate min-w-0">{user.username}</h1>
        </div>
      </header>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Avatar */}
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            {user.metadata?.profile_image?.url && !avatarError ? (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-1 overflow-hidden">
                <img
                  src={user.metadata.profile_image.url}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                  style={{ objectPosition: 'center center' }}
                  onError={() => setAvatarError(true)}
                />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl md:text-5xl">👤</span>
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 className="text-lg sm:text-xl md:text-2xl font-light text-black dark:text-black break-words">{user.username}</h2>
              <div className="flex gap-2 flex-shrink-0">
                {isSelf ? (
                  <Link
                    href={`/users/${userId}/edit`}
                    className="px-3 sm:px-4 py-1.5 bg-gray-200 text-gray-800 dark:text-black rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    Edit Profile
                  </Link>
                ) : isFollowing || isRequested ? (
                  <button
                    onClick={handleUnfollow}
                    className="px-3 sm:px-4 py-1.5 bg-gray-200 text-gray-800 dark:text-black rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    {isFollowing ? 'Following' : 'Requested'}
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    disabled={followActionLoading}
                    className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {followActionLoading ? '...' : 'Follow'}
                  </button>
                )}
                {!isSelf && followerFollowsId && (
                  <button
                    onClick={async () => {
                      try {
                        await followService.deleteFollowRelation(followerFollowsId);
                        refresh(true);
                      } catch (err) {
                        // Failed to delete follower relation
                      }
                    }}
                    className="px-3 sm:px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-200 transition-colors whitespace-nowrap"
                    title="Delete their follow relation to you"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 flex-wrap items-baseline">
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-black dark:text-black text-sm sm:text-base">{post_count ?? 0}</span>
                <span className="text-gray-600 dark:text-black text-xs sm:text-sm">posts</span>
              </div>
              {isSelf ? (
                <>
                  <Link href={`/users/${userId}/followers`} className="flex items-baseline gap-1 hover:opacity-70 transition-opacity cursor-pointer">
                    <span className="font-semibold text-black dark:text-black text-sm sm:text-base">{follower_count ?? 0}</span>
                    <span className="text-gray-600 dark:text-black text-xs sm:text-sm">followers</span>
                  </Link>
                  <Link href={`/users/${userId}/following`} className="flex items-baseline gap-1 hover:opacity-70 transition-opacity cursor-pointer">
                    <span className="font-semibold text-black dark:text-black text-sm sm:text-base">{following_count ?? 0}</span>
                    <span className="text-gray-600 dark:text-black text-xs sm:text-sm">following</span>
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1 cursor-default">
                    <span className="font-semibold text-black dark:text-black text-sm sm:text-base">{follower_count ?? 0}</span>
                    <span className="text-gray-600 dark:text-black text-xs sm:text-sm">followers</span>
                  </div>
                  <div className="flex items-baseline gap-1 cursor-default">
                    <span className="font-semibold text-black dark:text-black text-sm sm:text-base">{following_count ?? 0}</span>
                    <span className="text-gray-600 dark:text-black text-xs sm:text-sm">following</span>
                  </div>
                </>
              )}
            </div>

            {/* Name and Bio */}
            <div className="break-words">
              {user.name && (
                <p className="font-semibold mb-1 text-black dark:text-black text-sm sm:text-base">{user.name}</p>
              )}
              {user.metadata?.profile && (
                <p className="text-xs sm:text-sm text-black dark:text-black">
                  {typeof user.metadata.profile === 'string' 
                    ? user.metadata.profile 
                    : (user.metadata.profile.bio || user.metadata.profile.description || '')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-4">
          {userPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-500 dark:text-black text-lg">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {userPosts.map((post) => {
                const firstImage = post.images?.[0];
                const hasValidImage = firstImage?.url && !imageErrors.has(post.id);
                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="aspect-square bg-gray-100 relative overflow-hidden group block"
                  >
                    {hasValidImage ? (
                      <>
                        <img
                          src={firstImage.url}
                          alt={post.content.slice(0, 50)}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          style={{ objectPosition: 'center center' }}
                          loading="lazy"
                          onError={() => setImageErrors(prev => new Set(prev).add(post.id))}
                        />
                        {post.images.length > 1 && (
                          <div className="absolute top-2 right-2 z-30">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 100 4 2 2 0 000-4zM10 3a2 2 0 100 4 2 2 0 000-4zM16 3a2 2 0 100 4 2 2 0 000-4zM2 9a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9zM8 9a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V9zM14 9a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V9z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="absolute inset-0 bg-black/30"></div>
                          <div className="relative flex items-center gap-4 text-white z-20">
                            <div className="flex items-center gap-1">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              <span className="font-semibold">{post.likeCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="font-semibold">{post.commentCount}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 flex items-center justify-center">
                        <div className="text-center px-4">
                          <div className="text-4xl mb-2">📝</div>
                          <p className="text-gray-600 dark:text-black text-xs line-clamp-3">{post.content}</p>
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
