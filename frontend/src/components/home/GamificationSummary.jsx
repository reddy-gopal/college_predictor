'use client';

import { useState, useEffect } from 'react';
import { mockTestApi } from '@/lib/api';

export default function GamificationSummary({ stats, user }) {
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationSummary();
  }, []);

  const fetchGamificationSummary = async () => {
    try {
      setLoading(true);
      const response = await mockTestApi.getGamificationSummary();
      setGamificationData(response.data);
    } catch (error) {
      console.error('Error fetching gamification summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    );
  }

  const data = gamificationData || {
    total_xp: stats?.xpTotal || 0,
    current_level: 1,
    xp_in_current_level: 0,
    xp_for_next_level: 500,
    level_progress: 0,
    current_streak: 0,
    best_streak: 0,
    weekly_goal: { completed: 0, goal: 2, percentage: 0 }
  };

  const weeklyProgress = data.weekly_goal.completed;
  const weeklyGoal = data.weekly_goal.goal;
  const weeklyPercentage = data.weekly_goal.percentage;

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
              {data.total_xp} XP • Level {data.current_level}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300"
              style={{ width: `${data.level_progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.xp_in_current_level} / {data.xp_for_next_level} XP to
            Level {data.current_level + 1}
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent-1/10 to-accent-2/10 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 mb-1">Current Streak</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.current_streak} days 🔥
            </div>
            {data.best_streak > data.current_streak && (
              <div className="text-xs text-gray-500 mt-1">
                Best: {data.best_streak} days
              </div>
            )}
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

