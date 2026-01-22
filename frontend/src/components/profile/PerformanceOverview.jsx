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
      // Fetch questions performance overview (real-time data)
      const questionsResponse = await mockTestApi.getQuestionsPerformanceOverview();
      const questionsData = questionsResponse.data;
      
      // Transform the data to match the existing component structure
      // For difficulty breakdown, use accuracy_by_difficulty
      const difficultyBreakdown = {};
      if (questionsData.accuracy_by_difficulty) {
        Object.entries(questionsData.accuracy_by_difficulty).forEach(([level, stats]) => {
          difficultyBreakdown[level] = {
            attempted: stats.total_attempted || 0,
            completed: stats.correct || 0,
            accuracy: stats.accuracy || 0,
          };
        });
      }
      
      // For section breakdown, we'll keep the old structure for now
      // (can be updated later if section data is available)
      const sectionBreakdown = {};
      
      setData({
        difficulty_breakdown: difficultyBreakdown,
        section_breakdown: sectionBreakdown,
        // Question data for CircularProgressRing
        questions_data: {
          total_correct: questionsData.total_correct_questions || 0,
          total_attempted: questionsData.total_attempted_questions || 0,
          total_wrong: questionsData.total_wrong_questions || 0,
          overall_accuracy: questionsData.overall_accuracy || 0,
        },
      });
    } catch (err) {
      console.error('Error fetching performance overview:', err);
      setError('Failed to load performance overview');
      // Fallback to empty data structure
      setData({
        difficulty_breakdown: {},
        section_breakdown: {},
        questions_data: {
          total_correct: 0,
          total_attempted: 0,
          total_wrong: 0,
          overall_accuracy: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-[#FFF8EB] mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-white/60 rounded w-48 mb-6"></div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-48 h-48 bg-white/60 rounded-full mx-auto"></div>
              <div className="flex-1 space-y-4">
                <div className="h-4 bg-white/60 rounded w-3/4"></div>
                <div className="h-4 bg-white/60 rounded w-1/2"></div>
                <div className="h-4 bg-white/60 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card bg-[#FFF8EB] mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchOverview} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use question data for CircularProgressRing
  const totalCorrect = data?.questions_data?.total_correct || 0;
  const totalAttempted = data?.questions_data?.total_attempted || 0;
  const totalWrong = data?.questions_data?.total_wrong || 0;

  const breakdown = breakdownType === 'difficulty' 
    ? data?.difficulty_breakdown 
    : data?.section_breakdown;

  return (
    <div className="card bg-[#FFF8EB] mb-4 md:mb-6">
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-niat-text">
            Performance Overview
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setBreakdownType('difficulty')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                breakdownType === 'difficulty'
                  ? 'bg-niat-primary text-white shadow-sm'
                  : 'bg-white text-niat-text hover:bg-white/80 border border-niat-border'
              }`}
            >
              Difficulty
            </button>
            <button
              onClick={() => setBreakdownType('section')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                breakdownType === 'section'
                  ? 'bg-niat-primary text-white shadow-sm'
                  : 'bg-white text-niat-text hover:bg-white/80 border border-niat-border'
              }`}
            >
              Section
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          {/* Circular Progress Ring */}
          <div className="flex-shrink-0">
            <CircularProgressRing
              total={totalAttempted}
              completed={totalCorrect}
              inProgress={0}
              abandoned={totalWrong}
            />
          </div>

          {/* Breakdown */}
          <div className="flex-1 w-full">
            {breakdown && Object.keys(breakdown).length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(breakdown).map(([key, value]) => (
                  <div key={key} className="border-b border-niat-border/50 pb-3 sm:pb-4 last:border-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 mb-2">
                      <span className="text-sm sm:text-base font-semibold text-niat-text capitalize">
                        {key}
                      </span>
                      <span className="text-xs sm:text-sm text-niat-text-secondary">
                        {value.accuracy || 0}% accuracy
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-niat-text-secondary">
                      <span>Attempted: {value.attempted || 0}</span>
                      <span>Correct: {value.completed || 0}</span>
                    </div>
                    <div className="mt-2 w-full bg-white/80 rounded-full h-2">
                      <div
                        className="bg-niat-primary h-2 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${((value.completed || 0) / (value.attempted || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {/* Display question statistics if available */}
                {data?.questions_data && (
                  <div className="mt-4 pt-4 border-t border-niat-border/50 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-niat-text">
                        Correctly Attempted
                      </span>
                      <span className="text-lg font-bold text-niat-primary">
                        {data.questions_data.total_correct || 0}
                      </span>
                    </div>
                    <div className="text-xs text-niat-text-secondary mt-1">
                      Out of {data.questions_data.total_attempted || 0} questions attempted • {data.questions_data.overall_accuracy || 0}% accuracy
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-niat-text-secondary">
                No breakdown data available. Complete some tests to see your performance!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

