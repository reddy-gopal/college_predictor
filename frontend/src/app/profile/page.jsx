'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PerformanceOverview from '@/components/profile/PerformanceOverview';
import BadgesAndAchievements from '@/components/profile/BadgesAndAchievements';
import ActivityHeatmap from '@/components/profile/ActivityHeatmap';
import TestAttemptsSummary from '@/components/profile/TestAttemptsSummary';
import PerformanceAnalytics from '@/components/profile/PerformanceAnalytics';
import MistakeInsights from '@/components/profile/MistakeInsights';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="section-container py-4 sm:py-6">
        {/* Profile Header */}
        <ProfileHeader user={user} />

        {/* Performance Overview */}
        <PerformanceOverview />

        {/* Badges & Achievements */}
        <BadgesAndAchievements />

        {/* Activity Heatmap */}
        <ActivityHeatmap />

        {/* Test Attempts Summary */}
        <TestAttemptsSummary />

        {/* Performance Analytics */}
        <PerformanceAnalytics />

        {/* Mistake Insights */}
        <MistakeInsights />
      </div>
    </div>
  );
}
