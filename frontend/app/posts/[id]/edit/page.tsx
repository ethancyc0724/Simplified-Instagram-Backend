'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePostDetail, usePosts } from '@/src/logic/hooks';
import ImageCarousel from '@/src/components/ImageCarousel';
import type { UpdatePostInput } from '@/src/types/post';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { post, loading } = usePostDetail(postId);
  const { updatePost } = usePosts();
  
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize content when post loads
  useEffect(() => {
    if (post && post.content && content !== post.content) {
      setContent(post.content);
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: UpdatePostInput = {
        content: content.trim(),
      };
      await updatePost(post.id, updateData);
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !post) {
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="hover:opacity-70 transition-opacity text-blue-700 hover:text-blue-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent dark:text-black dark:bg-none dark:bg-clip-border">
            Edit Post
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 w-full">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          {/* Post preview */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
              </div>
              <div className="font-semibold text-sm text-black dark:text-black">
                {post.username}
              </div>
            </div>

            {/* Images preview */}
            {post.images && post.images.length > 0 && (
              <div className="mb-4">
                <ImageCarousel
                  images={post.images}
                  alt={post.content.slice(0, 50)}
                />
              </div>
            )}

            {/* Content textarea */}
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-black mb-2">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black dark:text-black bg-white dark:bg-white resize-none"
                placeholder="What's on your mind?"
                required
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 py-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-black border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
