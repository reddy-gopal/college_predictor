'use client';

import { getXPProgress } from '@/lib/gamification';
import { useEffect, useState } from 'react';

export default function ProgressSnapshot({ stats, activity, user }) {
  const [recentTests, setRecentTests] = useState(activity?.recentTests || []);
  
  // Update when activity changes (real-time updates)
  useEffect(() => {
    if (activity?.recentTests) {
      setRecentTests(activity.recentTests);
    }
  }, [activity?.recentTests]);

  const latestTest = recentTests.length > 0 ? recentTests[0] : null;
  const bestPercentile = recentTests.length > 0
    ? Math.max(...recentTests.map((t) => t.percentile || 0))
    : null;

  // Format exam target for display
  const getExamTarget = () => {
    if (!user?.exam_target) return null;
    return user.exam_target
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get target rank
  const getTargetRank = () => {
    if (!user?.target_rank) return null;
    return user.target_rank;
  };

  const examTarget = getExamTarget();
  const targetRank = getTargetRank();
  const xpProgress = getXPProgress(stats?.xpTotal || 0);

  return (
    <>
      {/* Row 1: Latest Score & Best Percentile */}
      <SnapshotCard
        label="Latest Score"
        value={latestTest ? latestTest.score.toFixed(1) : '—'}
        icon="📊"
        color="primary"
      />
      <SnapshotCard
        label="Best Percentile"
        value={bestPercentile ? `${bestPercentile.toFixed(1)}%` : '—'}
        icon="🏆"
        color="secondary"
      />
      
      {/* Row 2: Exam Target & Target Rank & XP */}
      <div className="card bg-gradient-to-br from-accent-1/10 to-accent-1/5 border-2 border-accent-1/20 text-center">
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-base font-bold text-gray-900 mb-1">
          {examTarget || '—'}
        </div>
        <div className="text-xs text-gray-600 mb-2">Exam Target</div>
        {targetRank ? (
          <div className="text-lg font-bold bg-gradient-to-r from-accent-1 to-accent-2 bg-clip-text text-transparent">
            Rank {targetRank.toLocaleString()}
          </div>
        ) : (
          <div className="text-lg font-bold text-gray-500">—</div>
        )}
        <div className="text-xs text-gray-600 mt-1">Target Rank</div>
      </div>
      <div className="card bg-gradient-to-br from-accent-2/10 to-accent-3/10 border-2 border-accent-2/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">XP</span>
          <span className="text-xs text-gray-600">
            {xpProgress.xpInCurrentLevel}/{xpProgress.xpForNextLevel}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-accent-2 to-accent-3 h-2 rounded-full transition-all duration-300"
            style={{ width: `${xpProgress.progress}%` }}
          />
        </div>
        <div className="text-lg font-bold text-gray-900">
          Level {xpProgress.level}
        </div>
      </div>
    </>
  );
}

function SnapshotCard({ label, value, icon, color }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20',
  };

  return (
    <div
      className={`card bg-gradient-to-br ${colorClasses[color]} border-2 text-center`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

