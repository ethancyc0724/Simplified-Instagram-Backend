'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300">
      <div className="w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-10 border border-white/20">
          <h1 className="text-center text-5xl font-extrabold bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent mb-4">
            Social
          </h1>

          <p className="text-center text-2xl font-semibold text-gray-800 mb-2">
            Welcome to Social
          </p>
          <p className="text-center text-gray-600 mb-10 leading-relaxed">
            Share your thoughts and connect with others
          </p>

          <div className="space-y-4">
            <Link 
              href="/register" 
              className="block w-full py-3.5 px-6 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white rounded-xl text-center font-semibold hover:shadow-lg hover:from-blue-800 hover:via-blue-700 hover:to-blue-600 transition-colors"
            >
              Create new account
            </Link>
            <Link 
              href="/login" 
              className="block w-full py-3.5 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl text-center font-semibold hover:border-blue-600 hover:text-blue-700 hover:shadow-md transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}