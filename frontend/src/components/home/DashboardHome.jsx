'use client';

import { useState, useEffect } from 'react';
import { getUserProfile, getUserStats, getActivity } from '@/lib/gamification';
import ProgressSnapshot from './ProgressSnapshot';
import TodaysFocus from './TodaysFocus';
import GamificationSummary from './GamificationSummary';
import QuickActions from './QuickActions';
import Recommendations from './Recommendations';

export default function DashboardHome() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ recentTests: [], weakSubjects: [] });

  useEffect(() => {
    // Load data from localStorage
    setProfile(getUserProfile());
    setStats(getUserStats());
    const loadedActivity = getActivity();
    // Ensure activity is always an object
    setActivity(loadedActivity || { recentTests: [], weakSubjects: [] });
  }, []);

  const name = profile?.full_name || profile?.name || 'Student';
  const examTarget = profile?.exam_target || 'your exam';
  const examDisplay = examTarget
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Calculate days left (optional - can be enhanced with actual exam date)
  const daysLeft = null; // TODO: Calculate from exam date if available

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-6">
        {/* Greeting Header */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-white mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Hi, {name} 👋</h1>
              <p className="text-white/90">
                {examDisplay}
                {daysLeft !== null && ` • ${daysLeft} days left`}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Snapshot */}
        <ProgressSnapshot stats={stats} activity={activity} />

        {/* Today's Focus */}
        <TodaysFocus profile={profile} stats={stats} activity={activity} />

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

  if (recentTests.length === 0) {
    return null;
  }

  const last5Tests = recentTests.slice(0, 5);
  const scores = last5Tests.map((t) => t.score || 0);
  const trend =
    scores.length >= 2
      ? scores[0] > scores[scores.length - 1]
        ? 'improving'
        : scores[0] < scores[scores.length - 1]
        ? 'declining'
        : 'stable'
      : null;

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Recent Performance
      </h2>
      <div className="space-y-3">
        {last5Tests.map((test, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {last5Tests.length - index}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {test.testTitle || 'Mock Test'}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(test.dateISO).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {test.score?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {test.percentile?.toFixed(1) || 'N/A'}%
              </div>
            </div>
          </div>
        ))}
        {trend && (
          <div className="pt-3 border-t border-gray-200">
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
    </div>
  );
}

