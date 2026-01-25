'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/src/logic/hooks';
import { getCurrentUserId } from '@/src/infrastructure/auth';

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  
  const { userData, loading, updateProfile } = useUser(userId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [profile, setProfile] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      router.push(`/users/${userId}`);
      return;
    }
  }, [userId, router]);

  useEffect(() => {
    if (userData) {
      setName(userData.user.name || '');
      setUsername(userData.user.username);
      setIsPublic(userData.user.is_public);
      const profileText = userData.user.metadata?.profile;
      if (typeof profileText === 'string') {
        setProfile(profileText);
      } else if (profileText && typeof profileText === 'object') {
        setProfile(profileText.bio || profileText.description || '');
      }
      if (userData.user.metadata?.profile_image?.url) {
        setProfileImagePreview(userData.user.metadata.profile_image.url);
      }
    }
  }, [userData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const profileJson = profile.trim() ? JSON.stringify({ bio: profile.trim() }) : undefined;
      await updateProfile({
        name: name.trim() || undefined,
        username: username.trim(),
        is_public: isPublic,
        profile: profileJson,
        profile_image: profileImage || undefined,
      });
      // Redirect to profile page with refresh parameter
      router.push(`/users/${userId}?refresh=${Date.now()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userData) {
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
            href={`/users/${userId}`}
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
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-black dark:text-black">
            Edit Profile
          </h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Profile Image */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                  style={{ objectPosition: 'center center' }}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white text-4xl">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <span className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">
                Change Photo
              </span>
            </label>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-black"
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-black"
              placeholder="username"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-black"
              placeholder="Tell us about yourself"
            />
          </div>

          {/* Public/Private */}
          <div className="flex items-center gap-2">
            <input
              id="is_public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
              Public Account
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Link
              href={`/users/${userId}`}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
