'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockTestApi } from '@/lib/api';

export default function TestAttemptsSummary() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's test attempts to calculate summary
      const response = await mockTestApi.getUserAttempts({});
      const attempts = response.data?.results || response.data || [];
      
      // Filter completed attempts
      const completedAttempts = attempts.filter(
        (attempt) => attempt.completed_at && attempt.score !== null
      );

      // Calculate summary
      const total = attempts.length;
      const completed = completedAttempts.length;
      const scores = completedAttempts.map((a) => a.score || 0);
      const percentiles = completedAttempts.map((a) => a.percentile || 0);

      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const avgPercentile = percentiles.length > 0
        ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length
        : 0;

      setSummary({
        total_tests: total,
        completed_tests: completed,
        average_score: avgScore,
        best_score: bestScore,
        average_percentile: avgPercentile,
      });
    } catch (err) {
      console.error('Error fetching test attempts summary:', err);
      setError('Failed to load test summary');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    router.push('/profile/test-attempts');
  };

  if (loading) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchSummary} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white dark:bg-gray-800 mb-4 md:mb-6">
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Test Attempts Summary
          </h2>
          <button
            onClick={handleViewAll}
            className="btn-secondary text-sm w-full sm:w-auto"
          >
            View All Attempts
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            label="Total Tests"
            value={summary?.total_tests || 0}
            icon="📊"
            color="primary"
          />
          <SummaryCard
            label="Average Score"
            value={summary?.average_score ? summary.average_score.toFixed(1) : '—'}
            icon="📈"
            color="secondary"
          />
          <SummaryCard
            label="Best Score"
            value={summary?.best_score ? summary.best_score.toFixed(1) : '—'}
            icon="🏆"
            color="accent-1"
          />
          <SummaryCard
            label="Avg Percentile"
            value={summary?.average_percentile ? `${summary.average_percentile.toFixed(1)}%` : '—'}
            icon="📉"
            color="accent-2"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20',
    'accent-2': 'from-accent-2/10 to-accent-2/5 border-accent-2/20',
  };

  return (
    <div className={`p-3 sm:p-4 rounded-lg border-2 bg-gradient-to-br ${colorClasses[color]} text-center`}>
      <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{icon}</div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

