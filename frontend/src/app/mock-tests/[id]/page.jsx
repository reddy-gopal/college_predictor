'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mockTestApi } from '@/lib/api';

export default function MockTestAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id;

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTest();
  }, [testId]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const loadTest = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const [testResponse, questionsResponse] = await Promise.all([
        mockTestApi.getById(testId),
        mockTestApi.getQuestions(testId),
      ]);

      const testData = testResponse.data;
      const questionsData = questionsResponse.data?.results || questionsResponse.data || [];

      setTest(testData);
      setQuestions(questionsData);
      
      // Debug: Log first question to check structure
      if (questionsData.length > 0) {
        console.log('First question structure:', questionsData[0]);
      }

      // Create or resume test attempt
      try {
        const attemptResponse = await mockTestApi.createAttempt({
          mock_test_id: testData.id,
        });
        const attemptData = attemptResponse.data;
        setAttemptId(attemptData.id);
        
        // Check if this is a resumed attempt (existing incomplete attempt)
        const isExistingAttempt = attemptResponse.status === 200 && attemptData.is_completed === false;
        setIsResuming(isExistingAttempt);
        
        // If resuming an existing attempt, load existing answers
        if (isExistingAttempt) {
          try {
            const answersResponse = await mockTestApi.getAttemptAnswers(attemptData.id);
            const existingAnswers = answersResponse.data?.results || answersResponse.data || [];
            
            // Populate answers state with existing answers
            const answersMap = {};
            existingAnswers.forEach((answer) => {
              if (answer.question && answer.selected_option) {
                answersMap[answer.question] = answer.selected_option;
              }
            });
            setAnswers(answersMap);
            
            // Calculate remaining time if attempt was started
            if (attemptData.started_at && testData.duration_minutes) {
              const startedAt = new Date(attemptData.started_at);
              const elapsedSeconds = Math.floor((new Date() - startedAt) / 1000);
              const totalSeconds = testData.duration_minutes * 60;
              const remaining = Math.max(0, totalSeconds - elapsedSeconds);
              setTimeRemaining(remaining);
            } else if (testData.duration_minutes) {
              // If no started_at but duration exists, set full duration
              setTimeRemaining(testData.duration_minutes * 60);
            }
          } catch (answersErr) {
            console.warn('Could not load existing answers:', answersErr);
            // Continue anyway, answers will be empty
          }
        } else {
          // New attempt - set full timer
          if (testData.duration_minutes) {
            setTimeRemaining(testData.duration_minutes * 60);
          }
        }
      } catch (attemptErr) {
        // Log detailed error for debugging
        console.error('Create attempt error:', attemptErr.response?.data || attemptErr.message);
        throw attemptErr; // Re-throw to be handled by outer catch
      }

      // Timer is set above based on whether we're resuming or not
    } catch (err) {
      // Get detailed error message from backend
      const backendError = err.response?.data;
      let errorMessage = 'Failed to load test. Please try again.';
      
      if (err.response?.status === 403 || err.response?.status === 401) {
        errorMessage = 'Authentication required. Please login to take tests.';
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 400) {
        // Show backend validation error
        if (backendError?.mock_test_id) {
          errorMessage = Array.isArray(backendError.mock_test_id) 
            ? backendError.mock_test_id[0] 
            : backendError.mock_test_id;
        } else if (backendError?.detail) {
          errorMessage = backendError.detail;
        } else if (backendError?.non_field_errors) {
          errorMessage = Array.isArray(backendError.non_field_errors)
            ? backendError.non_field_errors[0]
            : backendError.non_field_errors;
        } else if (typeof backendError === 'object') {
          // Try to get first error message
          const firstError = Object.values(backendError)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      }
      
      setError(errorMessage);
      console.error('Error loading test:', err);
      console.error('Backend error details:', backendError);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId, selectedOption) => {
    const newAnswers = { ...answers, [questionId]: selectedOption };
    setAnswers(newAnswers);

    // Submit answer to backend
    if (attemptId) {
      try {
        const question = questions.find((q) => q.id === questionId);
        await mockTestApi.submitAnswer(attemptId, {
          question: questionId,
          selected_option: selectedOption,
          time_taken_seconds: 0,
        });
      } catch (err) {
        console.error('Error submitting answer:', err);
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    await submitTest();
  };

  const submitTest = async () => {
    if (!attemptId || submitting) return;

    try {
      setSubmitting(true);
      await mockTestApi.submitTest(attemptId);
      router.push(`/mock-tests/${testId}/results?attempt=${attemptId}`);
    } catch (err) {
      setError('Failed to submit test. Please try again.');
      console.error('Error submitting test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error && !test) {
    // Only show error screen if we don't have test data
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Test not found'}
          </h2>
          <button
            onClick={() => router.push('/mock-tests')}
            className="btn-primary mt-4"
          >
            Back to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-6">
        {/* Resume Notice */}
        {isResuming && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔄</div>
              <div>
                <h3 className="font-bold text-blue-900">Resuming Previous Attempt</h3>
                <p className="text-sm text-blue-700">
                  You have an incomplete attempt. Your previous answers have been loaded.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message (if any, but test is still loaded) */}
        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <p className="text-yellow-800">{error}</p>
          </div>
        )}
        
        {/* Header with Timer */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 sticky top-20 z-40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    timeRemaining < 300 ? 'text-accent-3' : 'text-primary'
                  }`}
                >
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-gray-600">Time Remaining</div>
              </div>
              <button
                onClick={submitTest}
                disabled={submitting}
                className="btn-accent px-6 py-2"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-32">
              <h3 className="font-semibold text-gray-900 mb-4">
                Question Navigation
              </h3>
              <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = index === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                        isCurrent
                          ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                          : isAnswered
                          ? 'bg-secondary text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Answered:</span>
                  <span className="font-semibold">
                    {answeredCount}/{questions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Area */}
          <div className="lg:col-span-3">
            <div className="card">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-primary">
                    Question {currentQuestionIndex + 1}
                  </span>
                  <span className="text-sm text-gray-600">
                    {currentQuestion.marks} Marks
                  </span>
                </div>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: currentQuestion.text,
                  }}
                />
              </div>

              {/* Options or Answer Input */}
              {currentQuestion.question_type === 'mcq' ? (
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionKey = `option_${option.toLowerCase()}`;
                    const optionText = currentQuestion[optionKey];
                    
                    // Skip if option is empty or null
                    if (!optionText || optionText.trim() === '') return null;

                    const isSelected = answers[currentQuestion.id] === option;

                    return (
                      <button
                        key={option}
                        onClick={() =>
                          handleAnswerChange(currentQuestion.id, option)
                        }
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-300 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-400'
                            }`}
                          >
                            {isSelected && '✓'}
                          </div>
                          <span className="font-semibold mr-2">{option}.</span>
                          <span className="flex-1">{optionText}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Integer/Numerical type question
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter your answer:
                    </label>
                    <input
                      type="number"
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
                      placeholder="Enter numerical value"
                      step={currentQuestion.question_type === 'integer' ? '1' : '0.01'}
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() =>
                    setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                  className="btn-secondary"
                >
                  ← Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.min(questions.length - 1, currentQuestionIndex + 1)
                    )
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="btn-primary"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

