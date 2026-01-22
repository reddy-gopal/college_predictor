'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function NewUserHome() {
  const { user } = useAuth();

  const name = user?.full_name || user?.first_name || 'Student';
  const examTarget = user?.exam_target || 'your exam';
  const examDisplay = examTarget
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Check if onboarding is completed based on StudentProfile data
  const needsPreferences = !user?.onboarding_completed || !user?.class_level || !user?.exam_target;
  
  // Get stats from user data (real-time from backend)
  const stats = {
    xpTotal: user?.total_xp || 0,
    currentStreak: 0, // TODO: Add streak tracking to backend
    weeklyGoalCount: 2, // TODO: Add weekly goals to backend
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-white">
      <div className="section-container py-12">
        {/* Greeting */}
        <div className="card bg-gradient-to-r from-[#220000] to-[#974039] text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {name}! 👋
          </h1>
          <p className="text-white/90">
            Ready to start your {examDisplay} preparation journey?
          </p>
        </div>

        {/* Setup Hint */}
        {needsPreferences && (
          <div className="card bg-accent-1/10 border-2 border-accent-1/20 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎯</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Complete Your Setup
                </h3>
                <p className="text-gray-600 mb-4">
                  Set your preferences to get personalized recommendations and
                  track your progress.
                </p>
                <Link
                  href="/onboarding-preferences"
                  className="btn-primary inline-block"
                >
                  Complete Setup
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <div className="card text-center mb-8">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Take Your First Mock Test
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start practicing with our comprehensive mock tests and see where you
            stand.
          </p>
          <Link href="/mock-tests" className="btn-primary text-lg px-8 py-4">
            Browse Mock Tests
          </Link>
        </div>

        {/* Minimal Gamification Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {stats.xpTotal || 0}
            </div>
            <div className="text-sm text-gray-600">Total XP</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-secondary mb-1">
              {stats.currentStreak || 0}
            </div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-accent-1 mb-1">
              {stats.weeklyGoalCount || 2}
            </div>
            <div className="text-sm text-gray-600">Weekly Goal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

