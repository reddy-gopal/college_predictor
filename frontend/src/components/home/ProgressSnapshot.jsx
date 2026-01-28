'use client';

import { getXPProgress } from '@/lib/gamification';
import { useEffect, useState } from 'react';

export default function ProgressSnapshot({ stats, activity, user }) {
  const [averageScore, setAverageScore] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { mockTestApi } = await import('@/lib/api');
        const response = await mockTestApi.getStats();
        const { average_score, best_score } = response.data;
        setAverageScore(average_score);
        setBestScore(best_score);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setAverageScore(null);
        setBestScore(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

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
      {/* Row 1: Average Score & Best Score */}
      <SnapshotCard
        label="Average Score"
        value={loading ? '...' : (averageScore !== null ? averageScore.toFixed(1) : '—')}
        icon="📊"
        color="primary"
      />
      <SnapshotCard
        label="Best Score"
        value={loading ? '...' : (bestScore !== null && !isNaN(bestScore) ? bestScore.toFixed(1) : '—')}
        icon="🏆"
        color="secondary"
      />
      
      {/* Row 2: Exam Target & Target Rank & XP */}
      <div className="card border-2 text-center" style={{ backgroundColor: '#FEE2E2', borderColor: 'rgba(153, 27, 27, 0.2)' }}>
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-base font-bold text-niat-text mb-1">
          {examTarget || '—'}
        </div>
        <div className="text-xs text-niat-text-secondary mb-2">Exam Target</div>
        {targetRank ? (
          <div className="text-lg font-bold text-niat-primary">
            Rank {targetRank.toLocaleString()}
          </div>
        ) : (
          <div className="text-lg font-bold text-niat-text-secondary">—</div>
        )}
        <div className="text-xs text-niat-text-secondary mt-1">Target Rank</div>
      </div>
      <div className="card bg-[#FFF1C6] border-2 border-accent-2/20">
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
    primary: '#FFF1C6',
    secondary: '#FEE2E2',
    'accent-1': '#FFF1C6',
  };

  const backgroundColor = colorClasses[color] || colorClasses.primary;

  return (
    <div
      className="card border-2 text-center"
      style={{ backgroundColor, borderColor: 'rgba(153, 27, 27, 0.2)' }}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-niat-text mb-1">{value}</div>
      <div className="text-sm text-niat-text-secondary">{label}</div>
    </div>
  );
}

