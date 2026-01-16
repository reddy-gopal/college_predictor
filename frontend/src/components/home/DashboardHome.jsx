'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi } from '@/lib/api';
import ProgressSnapshot from './ProgressSnapshot';
import TodaysFocus from './TodaysFocus';
import GamificationSummary from './GamificationSummary';
import QuickActions from './QuickActions';
import Recommendations from './Recommendations';
import DailyFocus from './DailyFocus';

export default function DashboardHome() {
  const { user, refreshUser } = useAuth();
  const [testAttempts, setTestAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTestAttempts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's test attempts - this endpoint automatically filters by logged-in user
      const response = await mockTestApi.getUserAttempts({});
      const attempts = response.data?.results || response.data || [];
      // Filter to only completed attempts with scores
      const completedAttempts = attempts.filter(
        attempt => attempt.completed_at && attempt.score !== null && attempt.score !== undefined
      );
      // Sort by completed_at descending (most recent first)
      completedAttempts.sort((a, b) => {
        const dateA = new Date(a.completed_at);
        const dateB = new Date(b.completed_at);
        return dateB - dateA;
      });
      setTestAttempts(completedAttempts);
    } catch (error) {
      console.error('Error fetching test attempts:', error);
      setTestAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTestAttempts();
  }, [user]);

  // Refresh test attempts when user data changes (e.g., after completing a test)
  useEffect(() => {
    if (user) {
      // Small delay to ensure backend has processed test completion
      const timer = setTimeout(() => {
        fetchTestAttempts();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.total_xp]); // Refresh when XP changes (indicates test completion)

  // Refresh when page becomes visible (user returns to tab/window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh data when user returns to the page
        fetchTestAttempts();
        refreshUser(); // Also refresh user data
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchTestAttempts, refreshUser]);

  // Refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        // Small delay to avoid too frequent refreshes
        setTimeout(() => {
          fetchTestAttempts();
          refreshUser();
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchTestAttempts, refreshUser]);

  if (loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const name = user?.full_name || user?.first_name || 'Student';
  const examTarget = user?.exam_target || 'your exam';
  const examDisplay = examTarget
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Prepare stats from real data
  const stats = {
    xpTotal: user?.total_xp || 0,
    currentStreak: 0, // Will be fetched from gamification API
    weeklyGoalCount: 2, // Will be fetched from gamification API
    weeklyCompletedCount: 0, // Will be fetched from gamification API
    goalRank: user?.target_rank || null,
  };

  // Prepare activity from test attempts (already filtered and sorted by user)
  // Only include attempts with real data - no fallbacks
  // Don't limit to 5 here - let the component handle scrolling
  const activity = {
    recentTests: testAttempts
      .filter(attempt => 
        attempt.completed_at && 
        attempt.score !== null && 
        attempt.score !== undefined &&
        attempt.percentile !== null &&
        attempt.percentile !== undefined &&
        (attempt.mock_test_title || attempt.mock_test?.title || attempt.mock_test?.name)
      )
      .map(attempt => ({
        testTitle: attempt.mock_test_title || attempt.mock_test?.title || attempt.mock_test?.name,
        score: attempt.score,
        percentile: attempt.percentile,
        dateISO: attempt.completed_at,
      })),
    weakSubjects: [], // TODO: Calculate from test attempts
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-6">
        {/* Greeting Header */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-white mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{name} 👋</h1>
              <p className="text-white/90">
                {examDisplay}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Snapshot with Daily Focus - Desktop: 2 cards per row + Daily Focus beside */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Progress Cards - 2 rows on desktop */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <ProgressSnapshot stats={stats} activity={activity} user={user} />
          </div>
          
          {/* Daily Focus - Beside Progress Cards on desktop */}
          <div className="lg:col-span-1">
            <DailyFocus />
          </div>
        </div>

        {/* Today's Focus */}
        <TodaysFocus user={user} stats={stats} activity={activity} />

        {/* Progress Mini Insights */}
        <ProgressInsights activity={activity} />

        {/* Gamification Summary */}
        <GamificationSummary stats={stats} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Recommendations */}
        <Recommendations activity={activity} />
      </div>
    </div>
  );
}

function ProgressInsights({ activity }) {
  const recentTests = activity?.recentTests || [];

  // Only show if there are real test attempts with complete data
  if (recentTests.length === 0) {
    return (
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recent Performance
        </h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600 mb-6">
            No test attempts yet. Complete a mock test to see your performance here.
          </p>
          <Link
            href="/mock-tests"
            className="btn-primary inline-block"
          >
            Attempt a Test
          </Link>
        </div>
      </div>
    );
  }

  // Calculate trend from first 5 tests for display
  const first5Tests = recentTests.slice(0, 5);
  const scores = first5Tests.map((t) => t.score);
  const trend =
    scores.length >= 2
      ? scores[0] > scores[scores.length - 1]
        ? 'improving'
        : scores[0] < scores[scores.length - 1]
        ? 'declining'
        : 'stable'
      : null;

  // Calculate max height for 5 items (each item is ~72px with spacing)
  // 5 items * 72px = 360px, add some padding
  const maxHeight = '400px';

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Recent Performance
      </h2>
      <div 
        className="space-y-3 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        {recentTests.map((test, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold">
                  {recentTests.length - index}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {test.testTitle}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(test.dateISO).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-gray-900">
                {test.score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">
                {test.percentile.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      {trend && recentTests.length > 0 && (
        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Trend:{' '}
            <span
              className={`font-semibold ${
                trend === 'improving'
                  ? 'text-green-600'
                  : trend === 'declining'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {trend.charAt(0).toUpperCase() + trend.slice(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

