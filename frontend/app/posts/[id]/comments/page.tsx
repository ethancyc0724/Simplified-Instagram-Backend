'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useComments } from '@/src/logic/hooks';

export default function CommentsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const {
    post,
    comments,
    loading,
    hasMoreComments,
    isSubmittingComment,
    loadMoreComments,
    createComment,
    updateComment,
    deleteComment,
    isOwnComment,
  } = useComments(postId);

  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitComment = async () => {
    if (newComment.trim()) {
      await createComment(newComment);
      setNewComment('');
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    await updateComment(commentId, content);
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Delete this comment?')) {
      await deleteComment(commentId);
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
            Comments ({post.commentCount})
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 w-full">
        {/* Post preview */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
            <Link href={`/users/${post.userId}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5 hover:opacity-80 transition-opacity">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/users/${post.userId}`} className="font-semibold text-sm hover:underline text-black dark:text-black">
                {post.username}
              </Link>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm text-black dark:text-black">
              <Link href={`/users/${post.userId}`} className="font-semibold mr-2 hover:underline text-black dark:text-black">
                {post.username}
              </Link>
              <span className="text-black dark:text-black">{post.content}</span>
            </div>
            <Link
              href={`/posts/${post.id}`}
              className="text-gray-500 dark:text-black text-xs hover:underline mt-2 inline-block"
            >
              View post
            </Link>
          </div>
        </div>

        {/* Comments list */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          {comments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-black">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {comments.map((comment) => {
                const isOwn = isOwnComment(comment);
                const isEditing = editingCommentId === comment.comment_id;

                return (
                  <div key={comment.comment_id} className="px-4 py-3 group hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/users/${comment.user.user_id}`}
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 p-0.5 hover:opacity-80 transition-opacity flex-shrink-0"
                      >
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-sm">👤</span>
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <Link
                              href={`/users/${comment.user.user_id}`}
                              className="font-semibold text-sm mr-2 hover:underline text-black dark:text-black inline-block"
                            >
                              {comment.user.username}
                            </Link>
                            {isEditing ? (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      if (editingContent.trim()) {
                                        await handleUpdateComment(comment.comment_id, editingContent.trim());
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingCommentId(null);
                                      setEditingContent('');
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={() => handleUpdateComment(comment.comment_id, editingContent.trim())}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingContent('');
                                    }}
                                    className="text-gray-600 hover:text-gray-800 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-black dark:text-black">{comment.content}</span>
                            )}
                            <p className="text-gray-400 dark:text-black text-xs mt-1" suppressHydrationWarning>
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {isOwn && !isEditing && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.comment_id);
                                  setEditingContent(comment.content);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.comment_id)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more button */}
          {hasMoreComments && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={loadMoreComments}
                className="w-full text-gray-500 dark:text-black text-sm hover:underline"
              >
                Load more comments
              </button>
            </div>
          )}

          {/* Add comment input */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newComment.trim() && !isSubmittingComment) {
                    e.preventDefault();
                    await handleSubmitComment();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black dark:text-black bg-white dark:bg-white"
                disabled={isSubmittingComment}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmittingComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
