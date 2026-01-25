'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePosts } from '@/src/logic/hooks';
import type { CreatePostInput } from '@/src/types/post';

export default function CreatePostPage() {
  const router = useRouter();
  const { createPost } = usePosts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreatePostInput>({
    content: '',
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await createPost(formData);
      router.push('/posts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const imageFiles: File[] = fileArray.filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) return;

    // Read previews for all images
    const previewPromises = imageFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        })
    );

    try {
      const previews = await Promise.all(previewPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...imageFiles],
      }));
      setImagePreviews((prev) => [...prev, ...previews]);
    } catch (err) {
      setError('Failed to load image previews');
    }

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          href="/posts"
          className="mb-6 inline-block text-blue-700 hover:text-blue-800 font-medium"
        >
          ← Back to Posts
        </Link>

        <div className="rounded-lg bg-white border border-white/20 shadow-lg p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent mb-6">
            Create New Post
          </h1>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 dark:text-black mb-2"
              >
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                required
                rows={8}
                value={formData.content}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black dark:text-black focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                placeholder="Enter post content"
              />
            </div>

            <div>
              <label
                htmlFor="images"
                className="block text-sm font-medium text-gray-700 dark:text-black mb-2"
              >
                Images
              </label>
              <input
                ref={fileInputRef}
                type="file"
                id="images"
                name="images"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 px-4 py-6 text-center transition-colors bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-black">
                    Click to upload images
                  </span>
                  <span className="text-xs text-gray-400 dark:text-black">
                    PNG, JPG, GIF up to 10MB
                  </span>
                </div>
              </button>

              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-300 group"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center center' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Remove image"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || !formData.content.trim() || !formData.images || formData.images.length === 0}
                className="rounded-lg bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-2 text-white transition-colors hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Post'}
              </button>
              <Link
                href="/posts"
                className="rounded-lg border-2 border-gray-300 px-6 py-2 text-gray-700 dark:text-black transition-colors hover:border-blue-500 hover:text-blue-600 hover:bg-white"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
