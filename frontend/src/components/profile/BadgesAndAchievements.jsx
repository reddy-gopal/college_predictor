'use client';

import { useState, useEffect } from 'react';
import { mockTestApi } from '@/lib/api';

export default function BadgesAndAchievements() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockTestApi.getProfileBadges();
      setBadges(response.data?.badges || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError('Failed to load badges');
      // Mock data for development
      setBadges([
        {
          id: 1,
          name: 'First Test',
          description: 'Complete your first mock test',
          icon: '🎯',
          unlocked: true,
          unlocked_at: '2024-01-15',
          progress: 100,
        },
        {
          id: 2,
          name: 'Perfect Score',
          description: 'Score 100% on any test',
          icon: '⭐',
          unlocked: false,
          progress: 0,
        },
        {
          id: 3,
          name: 'Week Warrior',
          description: 'Complete 5 tests in a week',
          icon: '🔥',
          unlocked: true,
          unlocked_at: '2024-01-20',
          progress: 100,
        },
        {
          id: 4,
          name: 'Streak Master',
          description: 'Maintain a 7-day streak',
          icon: '⚡',
          unlocked: false,
          progress: 57, // 4/7 days
        },
        {
          id: 5,
          name: 'Subject Expert',
          description: 'Achieve 90%+ accuracy in all subjects',
          icon: '🏆',
          unlocked: false,
          progress: 33, // 1/3 subjects
        },
        {
          id: 6,
          name: 'Speed Demon',
          description: 'Complete a test in under 60 minutes',
          icon: '⚡',
          unlocked: false,
          progress: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white dark:bg-gray-800 mb-6">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Badges & Achievements
        </h2>

        {error && !badges.length ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button onClick={fetchBadges} className="btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BadgeCard({ badge }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all ${
        badge.unlocked
          ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700'
          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-60'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="text-center">
        <div className="text-4xl mb-2 filter grayscale-0">
          {badge.unlocked ? badge.icon : '🔒'}
        </div>
        <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
          {badge.name}
        </div>
        {!badge.unlocked && badge.progress > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${badge.progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {badge.progress}%
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
          {badge.description}
          {badge.unlocked && badge.unlocked_at && (
            <div className="mt-1 text-gray-400">
              Unlocked: {new Date(badge.unlocked_at).toLocaleDateString()}
            </div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}

