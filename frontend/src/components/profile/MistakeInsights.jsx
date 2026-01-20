'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockTestApi } from '@/lib/api';

export default function MistakeInsights() {
  const router = useRouter();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch mistakes to calculate insights
      const response = await mockTestApi.getMistakes();
      const mistakes = response.data || [];

      if (mistakes.length === 0) {
        setInsights({
          total_mistakes: 0,
          top_weak_subjects: [],
          most_common_error_type: null,
        });
        return;
      }

      // Calculate top weak subjects
      const subjectCounts = {};
      mistakes.forEach((mistake) => {
        const subject = mistake.question_subject || 'Unknown';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      });

      const topWeakSubjects = Object.entries(subjectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([subject, count]) => ({ subject, count }));

      // Calculate most common error type
      const errorTypeCounts = {};
      mistakes.forEach((mistake) => {
        const errorType = mistake.error_type || 'unknown';
        errorTypeCounts[errorType] = (errorTypeCounts[errorType] || 0) + 1;
      });

      const mostCommonError = Object.entries(errorTypeCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

      setInsights({
        total_mistakes: mistakes.length,
        top_weak_subjects: topWeakSubjects,
        most_common_error_type: mostCommonError,
      });
    } catch (err) {
      console.error('Error fetching mistake insights:', err);
      setError('Failed to load mistake insights');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNotebook = () => {
    router.push('/mistake-notebook');
  };

  const getErrorTypeLabel = (errorType) => {
    const labels = {
      conceptual: 'Conceptual Error',
      calculation: 'Calculation Error',
      silly: 'Silly Mistake',
      time_pressure: 'Time Pressure',
      not_attempted: 'Not Attempted',
    };
    return labels[errorType] || errorType;
  };

  if (loading) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchInsights} className="btn-primary">
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
            Mistake Insights
          </h2>
          <button
            onClick={handleOpenNotebook}
            className="btn-primary text-sm w-full sm:w-auto"
          >
            Open Mistake Notebook
          </button>
        </div>

        {insights?.total_mistakes === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎉</div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              No mistakes recorded yet. Keep practicing!
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Total Mistakes */}
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
                  Total Mistakes
                </span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {insights?.total_mistakes || 0}
                </span>
              </div>
            </div>

            {/* Top Weak Subjects */}
            {insights?.top_weak_subjects && insights.top_weak_subjects.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                  Top Weak Subjects
                </h3>
                <div className="space-y-2">
                  {insights.top_weak_subjects.map((item, index) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-xs sm:text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white capitalize">
                          {item.subject}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {item.count} mistakes
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Common Error Type */}
            {insights?.most_common_error_type && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
                    Most Common Error Type
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-red-700 dark:text-red-400">
                    {getErrorTypeLabel(insights.most_common_error_type)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

