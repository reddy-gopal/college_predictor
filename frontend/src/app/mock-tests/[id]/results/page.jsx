'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockTestApi } from '@/lib/api';
import {
  addTestResult,
  awardXP,
  updateStreakOnTestCompletion,
  updateWeeklyProgress,
  getActivity,
} from '@/lib/gamification';

export default function MockTestResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get('attempt');

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unattemptedQuestions, setUnattemptedQuestions] = useState([]);
  const [showUnattempted, setShowUnattempted] = useState(false);
  const [loadingUnattempted, setLoadingUnattempted] = useState(false);
  const [showUnattemptedSolution, setShowUnattemptedSolution] = useState({});

  useEffect(() => {
    if (attemptId) {
      loadResults();
    } else {
      setError('No attempt ID provided');
      setLoading(false);
    }
  }, [attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const [attemptResponse, answersResponse] = await Promise.all([
        mockTestApi.getAttempt(attemptId),
        mockTestApi.getAttemptAnswers(attemptId),
      ]);

      const attemptData = attemptResponse.data;
      const answersData = answersResponse.data?.results || answersResponse.data || [];

      setAttempt(attemptData);
      setAnswers(answersData);

      // Update gamification stats if test is completed
      if (attemptData.is_completed) {
        updateGamificationStats(attemptData);
      }
    } catch (err) {
      setError('Failed to load results. Please try again.');
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnattempted = async () => {
    if (!attemptId) return;
    
    try {
      setLoadingUnattempted(true);
      const response = await mockTestApi.getUnattemptedQuestions(attemptId);
      setUnattemptedQuestions(response.data.unattempted_questions || []);
      setShowUnattempted(true);
    } catch (err) {
      console.error('Error fetching unattempted questions:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(err.response?.data?.detail || 'Failed to load unattempted questions', 'error');
      }
    } finally {
      setLoadingUnattempted(false);
    }
  };

  const updateGamificationStats = (attemptData) => {
    try {
      const mockTest = attemptData.mock_test;
      const score = attemptData.score || 0;
      const percentile = attemptData.percentile || 0;
      const dateISO = attemptData.completed_at || new Date().toISOString();

      // Check if this result was already processed (avoid duplicate XP)
      const activity = getActivity();
      const alreadyProcessed = activity.recentTests?.some(
        (test) => test.testId === attemptData.id
      );

      if (alreadyProcessed) {
        return; // Already processed, skip
      }

      // Add test result to activity
      addTestResult({
        testId: attemptData.id,
        testTitle: mockTest?.title || 'Mock Test',
        score,
        percentile,
        dateISO,
      });

      // Award XP for test completion based on test type
      const testMode = attemptData.test_mode || 'preset';
      const testType = mockTest?.test_type || 'practice';
      const generationConfig = attemptData.generation_config || {};
      
      let baseXP = 50; // Default for preset tests
      
      if (testMode === 'custom') {
        // Custom test XP based on test type
        switch (testType) {
          case 'practice':
            baseXP = 40;
            break;
          case 'sectional':
            baseXP = 50;
            break;
          case 'full_length':
            baseXP = 80;
            break;
          case 'custom':
            baseXP = 50; // Base for custom type
            break;
          default:
            baseXP = 50;
        }
        
        // PYQ bonus (if years are specified in generation config)
        if (generationConfig.years && generationConfig.years.length > 0) {
          baseXP += 20;
        }
      }
      
      awardXP('test_completed', baseXP);

      // Check for improvement bonus
      const previousTests = activity.recentTests || [];
      if (previousTests.length > 0) {
        const lastScore = previousTests[0].score || 0;
        if (score > lastScore) {
          awardXP('score_improvement', 20);
        }
      }

      // Update streak
      updateStreakOnTestCompletion(dateISO);

      // Update weekly progress
      updateWeeklyProgress(dateISO);
    } catch (error) {
      console.error('Error updating gamification stats:', error);
      // Don't block the UI if gamification update fails
    }
  };

  if (loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Results not found'}
          </h2>
          <Link href="/mock-tests" className="btn-primary mt-4">
            Back to Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  const mockTest = attempt.mock_test;
  const score = attempt.score || 0;
  const totalMarks = mockTest?.total_marks || 100;
  // Calculate percentage, ensuring it's not negative for display purposes
  const percentage = totalMarks > 0 ? Math.max(0, (score / totalMarks) * 100) : 0;
  const accuracy = attempt.percentage !== undefined && attempt.percentage !== null 
    ? attempt.percentage 
    : percentage;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="section-title">Test Results</h1>
          <p className="text-lg text-gray-600">{mockTest?.title}</p>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <ScoreCard
            label="Total Score"
            value={`${score.toFixed(1)} / ${totalMarks}`}
            percentage={percentage}
            color="primary"
          />
          <ScoreCard
            label="Correct Answers"
            value={`${attempt.correct_count || 0} / ${mockTest?.total_questions || 0}`}
            percentage={mockTest?.total_questions > 0 
              ? ((attempt.correct_count || 0) / mockTest.total_questions) * 100 
              : 0}
            color="secondary"
          />
          <ScoreCard
            label="Accuracy"
            value={`${accuracy.toFixed(1)}%`}
            percentage={accuracy}
            color="accent-1"
          />
        </div>

        {/* Detailed Stats */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Performance Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatItem
              label="Correct"
              value={attempt.correct_count || 0}
              icon="✅"
              color="green"
            />
            <StatItem
              label="Wrong"
              value={attempt.wrong_count || 0}
              icon="❌"
              color="red"
            />
            <StatItem
              label="Unanswered"
              value={attempt.unanswered_count || 0}
              icon="⏭️"
              color="gray"
            />
            <StatItem
              label="Percentile"
              value={`${(attempt.percentile || 0).toFixed(1)}%`}
              icon="📊"
              color="blue"
            />
          </div>
        </div>

        {/* Answer Review */}
        {answers.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Answer Review
            </h2>
            <div className="space-y-4">
              {answers
                .sort((a, b) => (a.question_number || 9999) - (b.question_number || 9999))
                .map((answer) => (
                  <AnswerReviewItem
                    key={answer.id}
                    answer={answer}
                    questionNumber={answer.question_number || 0}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Unattempted Questions Section */}
        {attempt?.is_completed && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Review Unattempted Questions
              </h2>
              {!showUnattempted && (
                <button
                  onClick={fetchUnattempted}
                  disabled={loadingUnattempted}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingUnattempted ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Review Unattempted Questions
                    </>
                  )}
                </button>
              )}
            </div>
            
            {showUnattempted && (
              <div>
                {unattemptedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">🎉 Great job! You attempted all questions!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      You left {unattemptedQuestions.length} question{unattemptedQuestions.length !== 1 ? 's' : ''} unattempted. Review them below to see the correct answers and solutions.
                    </p>
                    {unattemptedQuestions.map((item) => {
                      const question = item.question;
                      const isMCQ = question?.question_type === 'mcq';
                      
                      return (
                        <div
                          key={item.question_number}
                          className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <span className="font-semibold mr-2">Q{item.question_number}:</span>
                              <span className="text-sm font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800">
                                Unattempted
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {item.marks?.toFixed(1) || '0.0'} marks
                            </span>
                          </div>
                          <div
                            className="prose max-w-none text-sm mb-2"
                            dangerouslySetInnerHTML={{ __html: question?.text || '' }}
                          />
                          
                          {/* Options Display */}
                          {isMCQ && (question?.option_a || question?.option_b || question?.option_c || question?.option_d) && (
                            <div className="mb-2 space-y-2">
                              <div className="text-sm font-semibold text-gray-700 mb-1">Options:</div>
                              {['A', 'B', 'C', 'D'].map((option) => {
                                const optionKey = `option_${option.toLowerCase()}`;
                                const optionText = question?.[optionKey];
                                const isCorrect = question?.correct_option?.toUpperCase() === option;
                                
                                if (!optionText) return null;
                                
                                return (
                                  <div
                                    key={option}
                                    className={`p-2 rounded border ${
                                      isCorrect
                                        ? 'bg-green-50 border-green-300'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`font-semibold text-sm ${
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
                          
                          {/* Integer/Numerical Answer Display */}
                          {!isMCQ && question?.correct_option && (
                            <div className="mb-2">
                              <div className="p-2 bg-green-50 border border-green-300 rounded">
                                <span className="text-sm font-semibold text-green-700">Correct Answer: </span>
                                <span className="text-sm text-green-700">{question.correct_option}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Solution */}
                          {question?.explanation && (
                            <div className="mt-2">
                              <button
                                onClick={() => setShowUnattemptedSolution(prev => ({
                                  ...prev,
                                  [item.question_number]: !prev[item.question_number]
                                }))}
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${
                                    showUnattemptedSolution[item.question_number] ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                {showUnattemptedSolution[item.question_number] ? 'Hide' : 'Show'} Explanation
                              </button>
                              {showUnattemptedSolution[item.question_number] && (
                                <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
                                  <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: question.explanation }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link href="/mock-tests" className="btn-primary text-center">
            Take Another Test
          </Link>
          <Link href="/" className="btn-secondary text-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, percentage, total, color }) {
  const colorClasses = {
    primary: 'from-indigo-600 to-indigo-800',
    secondary: 'from-blue-600 to-blue-800',
    'accent-1': 'from-amber-500 to-amber-700',
  };

  const gradientClass = colorClasses[color] || colorClasses.primary;
  const isNegative = typeof value === 'string' && value.includes('-');

  return (
    <div className={`bg-gradient-to-br ${gradientClass} text-white p-8 text-center rounded-lg shadow-lg transform transition-transform hover:scale-105`}>
      <div className="text-sm font-semibold mb-3 opacity-90 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-5xl font-bold mb-4 ${isNegative ? 'text-red-200' : 'text-white'}`}>
        {value}
      </div>
      {percentage !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                percentage < 0 
                  ? 'bg-red-300' 
                  : percentage < 50 
                  ? 'bg-yellow-300' 
                  : percentage < 75
                  ? 'bg-green-300'
                  : 'bg-white'
              }`}
              style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
            />
          </div>
          <div className="text-xs opacity-75">
            {percentage.toFixed(1)}% complete
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, icon, color }) {
  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function AnswerReviewItem({ answer, questionNumber }) {
  const question = answer.question;
  const isCorrect = answer.is_correct;

  return (
    <div
      className={`border-2 rounded-lg p-4 ${
        isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <span className="font-semibold mr-2">Q{questionNumber}:</span>
          <span
            className={`text-sm font-semibold px-2 py-1 rounded ${
              isCorrect
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isCorrect ? 'Correct' : 'Wrong'}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          {answer.marks_obtained > 0 ? '+' : ''}
          {answer.marks_obtained.toFixed(1)} marks
        </span>
      </div>
      <div
        className="prose max-w-none text-sm mb-2"
        dangerouslySetInnerHTML={{ __html: question?.text }}
      />
      <div className="text-sm">
        <span className="font-semibold">Your Answer:</span>{' '}
        <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
          {answer.selected_option || 'Not answered'}
        </span>
        {question?.correct_option && (
          <>
            {' | '}
            <span className="font-semibold">Correct Answer:</span>{' '}
            <span className="text-green-700">{question.correct_option}</span>
          </>
        )}
      </div>
      {question?.explanation && (
        <div
          className="mt-2 p-3 bg-gray-100 rounded text-sm"
          dangerouslySetInnerHTML={{ __html: question.explanation }}
        />
      )}
    </div>
  );
}

