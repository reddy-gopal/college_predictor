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
      <div className="card bg-[#FBF2F3] mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-white/60 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-32 bg-white/60 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-[#FBF2F3] mb-4 md:mb-6">
      <div className="p-4 md:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-niat-text mb-4 sm:mb-6">
          Badges & Achievements
        </h2>

        {error && !badges.length ? (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
            <button onClick={fetchBadges} className="btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
          ? 'bg-gradient-to-br from-accent-1/20 to-accent-1/10 border-accent-1/30'
          : 'bg-white/80 border-niat-border/50 opacity-60'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(!showTooltip)}
    >
      <div className="text-center">
        <div className="text-3xl sm:text-4xl mb-1 sm:mb-2 filter grayscale-0">
          {badge.unlocked ? badge.icon : '🔒'}
        </div>
        <div className="font-semibold text-xs sm:text-sm text-niat-text mb-1">
          {badge.name}
        </div>
        {!badge.unlocked && badge.progress > 0 && (
          <div className="mt-1 sm:mt-2">
            <div className="w-full bg-white/80 rounded-full h-1.5">
              <div
                className="bg-niat-primary h-1.5 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${badge.progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-niat-text-secondary mt-1">
              {badge.progress}%
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-niat-text text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
          {badge.description}
          {badge.unlocked && badge.unlocked_at && (
            <div className="mt-1 text-white/80">
              Unlocked: {new Date(badge.unlocked_at).toLocaleDateString()}
            </div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-niat-text"></div>
          </div>
        </div>
      )}
    </div>
  );
}

