'use client';

import { getXPProgress } from '@/lib/gamification';

export default function GamificationSummary({ stats }) {
  const xpProgress = getXPProgress(stats?.xpTotal || 0);
  const weeklyProgress = stats?.weeklyCompletedCount || 0;
  const weeklyGoal = stats?.weeklyGoalCount || 2;
  const weeklyPercentage = (weeklyProgress / weeklyGoal) * 100;

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Your Progress
      </h2>
      <div className="space-y-6">
        {/* XP Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Experience Points</span>
            <span className="text-sm text-gray-600">
              {stats?.xpTotal || 0} XP • Level {xpProgress.level}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300"
              style={{ width: `${xpProgress.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {xpProgress.xpInCurrentLevel} / {xpProgress.xpForNextLevel} XP to
            Level {xpProgress.level + 1}
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent-1/10 to-accent-2/10 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 mb-1">Current Streak</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.currentStreak || 0} days 🔥
            </div>
          </div>
          <div className="text-4xl">🔥</div>
        </div>

        {/* Weekly Goal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Weekly Goal</span>
            <span className="text-sm text-gray-600">
              {weeklyProgress} / {weeklyGoal} tests
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-accent-1 to-accent-2 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(weeklyPercentage, 100)}%` }}
            />
          </div>
          {weeklyProgress >= weeklyGoal && (
            <div className="text-sm text-green-600 mt-1 font-semibold">
              ✓ Weekly goal achieved!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

