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

  // Fetch test attempts from backend
  useEffect(() => {
    const fetchTestAttempts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await mockTestApi.getAll({});
        // Get user's test attempts
        // Note: This might need to be filtered by user on backend
        setTestAttempts(response.data?.results || response.data || []);
      } catch (error) {
        console.error('Error fetching test attempts:', error);
        setTestAttempts([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchTestAttempts();
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
