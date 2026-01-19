'use client';

import { useState, useEffect } from 'react';
import { mockTestApi } from '@/lib/api';
import CircularProgressRing from './CircularProgressRing';

export default function PerformanceOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakdownType, setBreakdownType] = useState('difficulty'); // 'difficulty' or 'section'

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockTestApi.getProfileOverview();
      setData(response.data);
    } catch (err) {
      console.error('Error fetching profile overview:', err);
      setError('Failed to load performance overview');
      // Use mock data for development
      setData({
        tests_attempted: 15,
        tests_completed: 12,
        tests_in_progress: 2,
        tests_abandoned: 1,
        difficulty_breakdown: {
          easy: { attempted: 5, completed: 5, accuracy: 85 },
          medium: { attempted: 7, completed: 5, accuracy: 72 },
          hard: { attempted: 3, completed: 2, accuracy: 58 },
        },
        section_breakdown: {
          physics: { attempted: 8, completed: 7, accuracy: 75 },
          chemistry: { attempted: 6, completed: 5, accuracy: 80 },
          mathematics: { attempted: 7, completed: 6, accuracy: 70 },
        },
      });
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
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto"></div>
              <div className="flex-1 space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchOverview} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const total = data?.tests_attempted || 0;
  const completed = data?.tests_completed || 0;
  const inProgress = data?.tests_in_progress || 0;
  const abandoned = data?.tests_abandoned || 0;

  const breakdown = breakdownType === 'difficulty' 
    ? data?.difficulty_breakdown 
    : data?.section_breakdown;

  return (
    <div className="card bg-white dark:bg-gray-800 mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Overview
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setBreakdownType('difficulty')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                breakdownType === 'difficulty'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Difficulty
            </button>
            <button
              onClick={() => setBreakdownType('section')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                breakdownType === 'section'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Section
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Circular Progress Ring */}
          <div className="flex-shrink-0">
            <CircularProgressRing
              total={total}
              completed={completed}
              inProgress={inProgress}
              abandoned={abandoned}
            />
          </div>

          {/* Breakdown */}
          <div className="flex-1 w-full">
            {breakdown ? (
              <div className="space-y-4">
                {Object.entries(breakdown).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white capitalize">
                        {key}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {value.accuracy || 0}% accuracy
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Attempted: {value.attempted || 0}</span>
                      <span>Completed: {value.completed || 0}</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((value.completed || 0) / (value.attempted || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No breakdown data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

