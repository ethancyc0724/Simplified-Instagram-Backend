'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePostDetail } from '@/src/logic/hooks';
import ImageCarousel from '@/src/components/ImageCarousel';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { post, latestComment, loading, isOwnPost, toggleLike, deletePost } = usePostDetail(postId);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleDeletePost = async () => {
    if (!post) return;
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 dark:text-black text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/posts" className="hover:opacity-70 transition-opacity text-blue-700 hover:text-blue-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:text-black dark:bg-none dark:bg-clip-border">Social</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 w-full">
        <article className="bg-white border border-gray-300 rounded-lg overflow-hidden w-full">
          {/* User info */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
            <Link href={`/users/${post.userId}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5 hover:opacity-80 transition-opacity">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/users/${post.userId}`} className="font-semibold text-sm hover:underline text-black dark:text-black">
                {post.username}
              </Link>
            </div>
            {isOwnPost && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-600 dark:text-black hover:text-gray-900 dark:hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      Edit Post
                    </Link>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDeletePost();
                      }}
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
              <div className="text-center px-8 max-w-md">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-700 dark:text-black text-base leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            </div>
          )}

          {/* Interaction buttons area */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleLike}
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

            {/* Likes */}
            {post.likeCount > 0 && (
              <p className="font-semibold text-sm text-black dark:text-black">{post.likeCount} likes</p>
            )}

            {/* Post content */}
            <div className="text-black dark:text-black">
              <Link href={`/users/${post.userId}`} className="font-semibold text-sm mr-2 hover:underline text-black dark:text-black">
                {post.username}
              </Link>
              <span className="text-sm text-black dark:text-black">{post.content}</span>
            </div>

            {/* Timestamp */}
            <p className="text-gray-400 dark:text-black text-xs uppercase" suppressHydrationWarning>
              {new Date(post.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            {/* Comment section - show only latest comment */}
            {post.commentCount > 0 && (
              <div className="border-t border-gray-200 pt-3">
                {latestComment ? (
                  <div 
                    onClick={() => router.push(`/posts/${post.id}/comments`)}
                    className="block hover:bg-gray-50 -mx-4 px-4 py-2 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="text-black dark:text-black">
                        <Link 
                          href={`/users/${latestComment.user.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-sm mr-2 hover:underline text-black dark:text-black"
                        >
                          {latestComment.user.username}
                        </Link>
                        <span className="text-sm text-black dark:text-black">{latestComment.content}</span>
                      </div>
                      {post.commentCount > 1 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/posts/${post.id}/comments`);
                          }}
                          className="text-gray-500 dark:text-black text-sm hover:underline block cursor-pointer"
                        >
                          View all {post.commentCount} comments
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/posts/${post.id}/comments`}
                    className="text-gray-500 dark:text-black text-sm hover:underline block"
                  >
                    View all {post.commentCount} comments
                  </Link>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
