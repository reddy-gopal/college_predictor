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
    fetchPerformanceSummary();
  }, []);

  const fetchPerformanceSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockTestApi.getPerformanceSummary();
      console.log("performance summary data", response.data);
      
      // Transform backend data to match frontend expectations
      const data = response.data;
      
      // Transform daily_average_score to score_trend format
      const scoreTrend = data.daily_average_score?.map(item => ({
        date: item.day,
        score: Math.round(item.avg_score || 0)
      })) || [];
      
      // For now, we'll use score data for accuracy trend (backend doesn't provide accuracy yet)
      // You can update this when backend adds accuracy calculation
      const accuracyTrend = data.daily_average_score?.map(item => ({
        date: item.day,
        accuracy: 0 // Placeholder - update when backend provides accuracy
      })) || [];
      
      setAnalytics({
        ...data,
        score_trend: scoreTrend,
        accuracy_trend: accuracyTrend,
        section_accuracy: data.section_accuracy || {},
        time_vs_accuracy: data.time_vs_accuracy || []
      });
    } catch (err) {
      console.error('Error fetching performance summary:', err);
      setError('Failed to load performance summary');
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
            <div className="h-64 bg-white/60 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="card bg-[#FBF2F3] mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchPerformanceSummary} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-[#FBF2F3] mb-4 md:mb-6">
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-niat-text">
            Performance Analytics
          </h2>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {['score', 'accuracy', 'section', 'time'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedChart(type)}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded text-xs sm:text-sm font-medium transition-colors capitalize ${
                  selectedChart === type
                    ? 'bg-niat-primary text-white shadow-sm'
                    : 'bg-white text-niat-text hover:bg-white/80 border border-niat-border/50'
                }`}
              >
                {type === 'time' ? 'Time vs Accuracy' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Score Trend */}
          {selectedChart === 'score' && analytics?.score_trend && analytics.score_trend.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-niat-text mb-3 sm:mb-4">
                Score Trend (Last 7 Days)
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
          
          {selectedChart === 'score' && (!analytics?.score_trend || analytics.score_trend.length === 0) && (
            <div className="text-center py-12">
              <p className="text-niat-text-secondary">
                No test attempts in the last 7 days. Complete some tests to see your score trend!
              </p>
            </div>
          )}

          {/* Accuracy Trend */}
          {selectedChart === 'accuracy' && analytics?.accuracy_trend && analytics.accuracy_trend.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-niat-text mb-3 sm:mb-4">
                Accuracy Trend (Last 7 Days)
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
          
          {selectedChart === 'accuracy' && (!analytics?.accuracy_trend || analytics.accuracy_trend.length === 0) && (
            <div className="text-center py-12">
              <p className="text-niat-text-secondary">
                No accuracy data available for the last 7 days.
              </p>
            </div>
          )}

          {/* Section-wise Accuracy */}
          {selectedChart === 'section' && analytics?.section_accuracy && Object.keys(analytics.section_accuracy).length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-niat-text mb-3 sm:mb-4">
                Section-wise Accuracy (Last 7 Days)
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(analytics.section_accuracy)
                  .filter(([_, accuracy]) => accuracy > 0)
                  .map(([section, accuracy]) => (
                    <div key={section}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-niat-text capitalize">
                          {section}
                        </span>
                        <span className="text-sm font-semibold text-niat-text">
                          {accuracy}%
                        </span>
                      </div>
                      <div className="w-full bg-white/80 rounded-full h-3">
                        <div
                          className="bg-niat-primary h-3 rounded-full transition-all duration-300 shadow-sm"
                          style={{ width: `${accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {selectedChart === 'section' && (!analytics?.section_accuracy || Object.keys(analytics.section_accuracy).length === 0) && (
            <div className="text-center py-12">
              <p className="text-niat-text-secondary">
                No section-wise accuracy data available for the last 7 days.
              </p>
            </div>
          )}

          {/* Time vs Accuracy */}
          {selectedChart === 'time' && analytics?.time_vs_accuracy && analytics.time_vs_accuracy.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-niat-text mb-3 sm:mb-4">
                Time Spent vs Accuracy (Last 7 Days)
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
          
          {selectedChart === 'time' && (!analytics?.time_vs_accuracy || analytics.time_vs_accuracy.length === 0) && (
            <div className="text-center py-12">
              <p className="text-niat-text-secondary">
                No time vs accuracy data available for the last 7 days.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

