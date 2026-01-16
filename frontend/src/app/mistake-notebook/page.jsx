'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MistakeNotebookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, conceptual, calculation, silly, time_pressure, not_attempted
  const [showSolution, setShowSolution] = useState({}); // Track which mistakes have solution shown
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMistakes();
    }
  }, [user, filter]);

  const fetchMistakes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockTestApi.getMistakes();
      let filteredMistakes = response.data;
      
      if (filter !== 'all') {
        filteredMistakes = response.data.filter(m => m.error_type === filter);
      }
      
      setMistakes(filteredMistakes);
    } catch (err) {
      console.error('Error fetching mistakes:', err);
      setError(err.response?.data?.detail || 'Failed to load mistakes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const errorTypeLabels = {
    all: 'All Mistakes',
    conceptual: 'Conceptual Errors',
    calculation: 'Calculation Errors',
    silly: 'Silly Mistakes',
    time_pressure: 'Time Pressure',
    not_attempted: 'Not Attempted',
  };

  const getErrorTypeColor = (errorType) => {
    const colors = {
      conceptual: 'bg-red-100 text-red-800',
      calculation: 'bg-orange-100 text-orange-800',
      silly: 'bg-yellow-100 text-yellow-800',
      time_pressure: 'bg-blue-100 text-blue-800',
      not_attempted: 'bg-gray-100 text-gray-800',
    };
    return colors[errorType] || 'bg-gray-100 text-gray-800';
  };

  const handleGenerateTest = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Prepare error types filter
      const errorTypes = filter !== 'all' ? [filter] : [];
      
      const response = await mockTestApi.generateTestFromMistakes({
        error_types: errorTypes.length > 0 ? errorTypes : undefined,
        question_count: mistakes.length, // Use all available mistakes
        // Note: time_per_question is fixed at 4 minutes (set by backend)
      });
      
      const { test_id } = response.data;
      router.push(`/mock-tests/${test_id}`);
    } catch (err) {
      console.error('Error generating test from mistakes:', err);
      setError(err.response?.data?.detail || 'Failed to generate test. Please try again.');
      setGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="section-container">
          <div className="card text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Mistake Notebook</h1>
            <p className="text-gray-600 mb-4">Please log in to view your mistake notebook.</p>
            <Link href="/login" className="btn-primary inline-block">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="section-container">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mistake Notebook</h1>
            <p className="text-gray-600">
              Review and learn from your mistakes to improve your performance.
            </p>
          </div>
          {mistakes.length > 0 && !loading && (
            <button
              onClick={handleGenerateTest}
              disabled={generating}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {generating ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Practice These Mistakes
                </>
              )}
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(errorTypeLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading mistakes...</p>
          </div>
        ) : error ? (
          <div className="card text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchMistakes} className="btn-primary">
              Try Again
            </button>
          </div>
        ) : mistakes.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Mistakes Yet</h2>
            <p className="text-gray-600 mb-4">
              {filter === 'all'
                ? "You haven't made any mistakes yet. Keep practicing!"
                : `No ${errorTypeLabels[filter].toLowerCase()} found.`}
            </p>
            <Link href="/mock-tests" className="btn-primary inline-block">
              Take a Mock Test
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mistakes.map((mistake) => (
              <div key={mistake.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-gray-500">
                        Q{mistake.question_number}
                      </span>
                      {mistake.error_type && (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(
                            mistake.error_type
                          )}`}
                        >
                          {mistake.error_type_display || mistake.error_type}
                        </span>
                      )}
                      {mistake.test_title && (
                        <span className="text-sm text-gray-500">
                          from {mistake.test_title}
                        </span>
                      )}
                    </div>
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">
                        {mistake.question_subject}
                        {mistake.question_chapter && ` • ${mistake.question_chapter}`}
                      </span>
                    </div>
                    <div
                      className="prose max-w-none text-gray-900 font-medium mb-4"
                      dangerouslySetInnerHTML={{ __html: mistake.question_text }}
                    />
                    
                    {/* Options Display */}
                    {(mistake.question_option_a || mistake.question_option_b || 
                      mistake.question_option_c || mistake.question_option_d) && (
                      <div className="mb-4 space-y-2">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Options:</div>
                        {['A', 'B', 'C', 'D'].map((option) => {
                          const optionKey = `question_option_${option.toLowerCase()}`;
                          const optionText = mistake[optionKey];
                          const isCorrect = mistake.question_correct_option?.toUpperCase() === option;
                          
                          if (!optionText) return null;
                          
                          return (
                            <div
                              key={option}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`font-semibold ${
                                  isCorrect ? 'text-green-700' : 'text-gray-700'
                                }`}>
                                  {option}.
                                </span>
                                <div
                                  className="flex-1 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: optionText }}
                                />
                                {isCorrect && (
                                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                    Correct
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Solution Toggle */}
                    {(mistake.question_correct_option || mistake.question_explanation) && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowSolution(prev => ({
                            ...prev,
                            [mistake.id]: !prev[mistake.id]
                          }))}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                        >
                          {showSolution[mistake.id] ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Hide Solution
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Show Solution
                            </>
                          )}
                        </button>
                        {showSolution[mistake.id] && (
                          <div className="mt-2 space-y-2">
                            {mistake.question_correct_option && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm text-gray-700">
                                  <span className="font-semibold">Correct Answer: </span>
                                  <span className="font-semibold text-green-700">
                                    {mistake.question_correct_option}
                                  </span>
                                </span>
                              </div>
                            )}
                            {mistake.question_explanation && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                  Explanation:
                                </div>
                                <div
                                  className="prose prose-sm max-w-none text-gray-700"
                                  dangerouslySetInnerHTML={{ __html: mistake.question_explanation }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {mistake.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Notes: </span>
                          {mistake.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {new Date(mistake.logged_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

