'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileHeader({ user }) {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const fullName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Student';
  const examTarget = user?.exam_target || 'Not set';
  const examDisplay = examTarget
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const handleEditProfile = () => {
    // Navigate to profile edit page
    router.push('/profile/edit');
  };

  return (
    <div className="card bg-white dark:bg-gray-800 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          {user?.google_picture ? (
            <img
              src={user.google_picture}
              alt={fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold border-4 border-primary/20">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {fullName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            {user?.email}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Exam Target:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {examDisplay}
              </span>
            </div>
            {user?.target_rank && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Target Rank:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {user.target_rank.toLocaleString()}
                </span>
              </div>
            )}
            {/* TODO: Add global rank and batch rank when API is available */}
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleEditProfile}
            className="btn-primary whitespace-nowrap"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

