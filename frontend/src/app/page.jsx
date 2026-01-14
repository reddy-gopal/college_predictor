'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, getUserStats, getActivity, initializeUserData } from '@/lib/gamification';
import PublicHome from '@/components/home/PublicHome';
import NewUserHome from '@/components/home/NewUserHome';
import DashboardHome from '@/components/home/DashboardHome';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Load user data from localStorage
      const userProfile = getUserProfile();
      const userStats = getUserStats();
      const userActivity = getActivity();

      // If profile exists but stats don't, initialize
      if (userProfile && !userStats) {
        const newStats = initializeUserData(userProfile);
        setStats(newStats);
      } else {
        setStats(userStats);
      }

      setProfile(userProfile);
      setActivity(userActivity);
    }

    setPageLoading(false);
  }, [user, authLoading]);

  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in - show public home
  if (!user) {
    return <PublicHome />;
  }

  // Logged in but no tests - show new user home
  const recentTests = activity?.recentTests || [];
  if (recentTests.length === 0) {
    return <NewUserHome />;
  }

  // Logged in with activity - show dashboard home
  return <DashboardHome />;
}
