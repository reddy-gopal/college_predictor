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

      // Award XP for test completion
      awardXP('test_completed', 50);

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
              {answers.map((answer, index) => (
                <AnswerReviewItem
                  key={answer.id}
                  answer={answer}
                  questionNumber={index + 1}
                />
              ))}
            </div>
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

