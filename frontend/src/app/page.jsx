'use client';

import { useAuth } from '@/contexts/AuthContext';
import PublicHome from '@/components/home/PublicHome';
import NewUserHome from '@/components/home/NewUserHome';
import DashboardHome from '@/components/home/DashboardHome';
import { mockTestApi } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [testAttempts, setTestAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch test attempts from backend - ONLY when user is logged in
  useEffect(() => {
    const fetchTestAttempts = async () => {
      // Don't fetch if user is not logged in
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Only fetch user's test attempts when logged in
        const response = await mockTestApi.getUserAttempts({});
        const attempts = response.data?.results || response.data || [];
        setTestAttempts(attempts);
      } catch (error) {
        console.error('Error fetching test attempts:', error);
        setTestAttempts([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchTestAttempts();
    } else if (!authLoading && !user) {
      // User is not logged in, no need to fetch
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading || authLoading) {
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

  // Logged in but no tests or incomplete onboarding - show new user home
  if (testAttempts.length === 0 || !user.onboarding_completed) {
    return <NewUserHome />;
  }

  // Logged in with activity - show dashboard home
  return <DashboardHome />;
}
