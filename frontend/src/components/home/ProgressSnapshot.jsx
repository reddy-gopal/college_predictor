'use client';

import { getXPProgress } from '@/lib/gamification';

export default function ProgressSnapshot({ stats, activity }) {
  const recentTests = activity?.recentTests || [];
  const latestTest = recentTests[0];
  const bestPercentile = recentTests.length > 0
    ? Math.max(...recentTests.map((t) => t.percentile || 0))
    : null;

  // Simple rank category logic (can be enhanced)
  const getRankCategory = () => {
    if (!latestTest || !stats?.goalRank) return 'N/A';
    const score = latestTest.score || 0;
    const goal = stats.goalRank || 0;
    if (score >= goal * 0.9) return 'Safe';
    if (score >= goal * 0.7) return 'Target';
    return 'Dream';
  };

  const xpProgress = getXPProgress(stats?.xpTotal || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <SnapshotCard
        label="Latest Score"
        value={latestTest?.score?.toFixed(1) || 'N/A'}
        icon="📊"
        color="primary"
      />
      <SnapshotCard
        label="Best Percentile"
        value={bestPercentile ? `${bestPercentile.toFixed(1)}%` : 'N/A'}
        icon="🏆"
        color="secondary"
      />
      <SnapshotCard
        label="Rank Category"
        value={getRankCategory()}
        icon="🎯"
        color="accent-1"
      />
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
    </div>
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

