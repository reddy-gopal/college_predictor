'use client';

import { useState, useEffect } from 'react';
import { mockTestApi } from '@/lib/api';
import SimpleLineChart from './SimpleLineChart';

export default function PerformanceAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('score'); // 'score', 'accuracy', 'section', 'time'

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockTestApi.getProfileAnalytics();
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
      // Generate mock data for development
      const mockData = generateMockAnalytics();
      setAnalytics(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = () => {
    const scoreTrend = [];
    const accuracyTrend = [];
    const dates = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      scoreTrend.push({
        date: date.toISOString().split('T')[0],
        score: Math.floor(Math.random() * 50) + 200, // 200-250
      });
      accuracyTrend.push({
        date: date.toISOString().split('T')[0],
        accuracy: Math.floor(Math.random() * 30) + 60, // 60-90%
      });
    }

    return {
      score_trend: scoreTrend,
      accuracy_trend: accuracyTrend,
      section_accuracy: {
        physics: 75,
        chemistry: 82,
        mathematics: 68,
        biology: 0, // Not applicable for JEE
      },
      time_vs_accuracy: [
        { time_spent: 30, accuracy: 65 },
        { time_spent: 45, accuracy: 72 },
        { time_spent: 60, accuracy: 78 },
        { time_spent: 90, accuracy: 82 },
        { time_spent: 120, accuracy: 80 },
      ],
    };
  };

  if (loading) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white dark:bg-gray-800 mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Analytics
          </h2>
          <div className="flex gap-2">
            {['score', 'accuracy', 'section', 'time'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedChart(type)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${
                  selectedChart === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type === 'time' ? 'Time vs Accuracy' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Score Trend */}
          {selectedChart === 'score' && analytics?.score_trend && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Score Trend (Last 30 Days)
              </h3>
              <SimpleLineChart
                data={analytics.score_trend}
                xKey="date"
                yKey="score"
                color="primary"
                yLabel="Score"
              />
            </div>
          )}

          {/* Accuracy Trend */}
          {selectedChart === 'accuracy' && analytics?.accuracy_trend && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Accuracy Trend (Last 30 Days)
              </h3>
              <SimpleLineChart
                data={analytics.accuracy_trend}
                xKey="date"
                yKey="accuracy"
                color="secondary"
                yLabel="Accuracy (%)"
              />
            </div>
          )}

          {/* Section-wise Accuracy */}
          {selectedChart === 'section' && analytics?.section_accuracy && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Section-wise Accuracy
              </h3>
              <div className="space-y-4">
                {Object.entries(analytics.section_accuracy)
                  .filter(([_, accuracy]) => accuracy > 0)
                  .map(([section, accuracy]) => (
                    <div key={section}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {section}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {accuracy}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all duration-300"
                          style={{ width: `${accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Time vs Accuracy */}
          {selectedChart === 'time' && analytics?.time_vs_accuracy && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Time Spent vs Accuracy
              </h3>
              <SimpleLineChart
                data={analytics.time_vs_accuracy}
                xKey="time_spent"
                yKey="accuracy"
                color="accent-1"
                xLabel="Time (minutes)"
                yLabel="Accuracy (%)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

