'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/common/Avatar';

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
    <div className="card bg-[#FBF2F3] mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 md:p-6">
        {/* Profile Image */}
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <Avatar
            name={fullName}
            size="w-20 h-20 sm:w-24 sm:h-24"
            className="border-4 border-niat-primary/20"
          />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-niat-text mb-1 sm:mb-2">
            {fullName}
          </h1>
          <p className="text-sm sm:text-base text-niat-text-secondary mb-2 sm:mb-3 break-words">
            {user?.email}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-niat-text-secondary">Exam Target:</span>
              <span className="font-semibold text-niat-text">
                {examDisplay}
              </span>
            </div>
            {user?.target_rank && (
              <div className="flex items-center gap-2">
                <span className="text-niat-text-secondary">Target Rank:</span>
                <span className="font-semibold text-niat-text">
                  {user.target_rank.toLocaleString()}
                </span>
              </div>
            )}
            {/* TODO: Add global rank and batch rank when API is available */}
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={handleEditProfile}
            className="btn-primary whitespace-nowrap w-full sm:w-auto"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

