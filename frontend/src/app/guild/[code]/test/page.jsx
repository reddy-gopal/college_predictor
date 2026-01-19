'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/lib/api';

export default function RoomTestPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const code = params?.code?.toUpperCase();
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
      if (!sessionToken) {
        router.push('/login');
      }
      return;
    }
    
    if (code) {
      fetchQuestions();
    }
  }, [code, user, authLoading]);
  
  // Timer effect - separate from fetchQuestions to avoid resetting on reload
  // Timer syncs with backend's remaining_seconds which is calculated from room.start_time
  useEffect(() => {
    if (!testStarted || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [testStarted]); // Only depend on testStarted, not timeRemaining to avoid recreating timer

  const fetchQuestions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await roomApi.getQuestions(code);
      const data = response.data;
      
      console.log('Questions response:', data); // Debug log
      
      // Backend returns: { room_code, total_questions, time_per_question, total_duration, questions: [...] }
      const questionsList = data.questions || [];
      
      // Load existing answers from attempts
      const existingAnswers = {};
      questionsList.forEach((q) => {
        if (q.attempt) {
          existingAnswers[q.room_question_id] = {
            selected_option: q.attempt.selected_option || '',
            answer_text: q.attempt.answer_text || '',
            time_spent_seconds: q.attempt.time_spent_seconds || 0,
            started_at: q.attempt.started_at || new Date().toISOString(),
          };
        }
      });
      setAnswers(existingAnswers);
      
      setQuestions(questionsList);
      setTotalDuration(data.total_duration || 0);
      
      // Calculate remaining time based on backend's calculation
      // Backend returns remaining_seconds which is calculated from room.start_time
      // This ensures all participants see the same remaining time
      if (data.remaining_seconds !== undefined && data.remaining_seconds !== null) {
        setTimeRemaining(data.remaining_seconds);
      } else if (data.start_time) {
        // Fallback: calculate from start_time if remaining_seconds not provided
        const startTime = new Date(data.start_time);
        const now = new Date();
        const totalSeconds = (data.total_duration || 0) * 60;
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsedSeconds);
        setTimeRemaining(remaining);
      } else {
        // Last resort: use full duration (shouldn't happen for active rooms)
        setTimeRemaining((data.total_duration || 0) * 60);
      }
      
      setTestStarted(true);
      setError(null);
    } catch (err) {
      console.error('Error fetching questions:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to load questions';
      setError(errorMsg);
      
      // If test hasn't started, redirect back to lobby
      if (err.response?.status === 400 && errorMsg.includes('not started')) {
        router.push(`/guild/${code}/lobby`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (roomQuestionId, selectedOption, answerText = '') => {
    // Validate that roomQuestionId is a valid number/ID
    if (!roomQuestionId) {
      console.error('Invalid roomQuestionId:', roomQuestionId);
      return;
    }
    
    setAnswers((prev) => {
      // Create a new object to ensure state update
      const newAnswers = {
        ...prev,
        [roomQuestionId]: {
          selected_option: selectedOption,
          answer_text: answerText,
          time_spent_seconds: prev[roomQuestionId]?.time_spent_seconds || 0,
          started_at: prev[roomQuestionId]?.started_at || new Date().toISOString(),
        },
      };
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitAnswer = async (roomQuestionId) => {
    if (!answers[roomQuestionId]) return;
    
    try {
      const answerData = {
        room_question: roomQuestionId, // PrimaryKeyRelatedField accepts ID
        selected_option: answers[roomQuestionId].selected_option || '',
        answer_text: answers[roomQuestionId].answer_text || '',
        time_spent_seconds: answers[roomQuestionId].time_spent_seconds || 0,
        started_at: answers[roomQuestionId].started_at || new Date().toISOString(),
      };
      
      await roomApi.submitAnswer(answerData);
    } catch (err) {
      console.error('Error submitting answer:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Failed to save answer', 'error');
      }
    }
  };

  const handleAutoSubmit = async () => {
    // Auto-submit all unanswered questions
    for (const question of questions) {
      if (!answers[question.room_question_id]) {
        // Submit empty answer
        try {
          await roomApi.submitAnswer({
            room_question: question.room_question_id,
            selected_option: '',
            answer_text: '',
            time_spent_seconds: 0,
            submitted_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error auto-submitting answer:', err);
        }
      } else {
        // Submit existing answer
        await handleSubmitAnswer(question.room_question_id);
      }
    }
    
    // Navigate to results or lobby
    router.push(`/guild/${code}/results`);
  };

  const handleFinalSubmit = async () => {
    if (!confirm('Are you sure you want to submit the test? This action cannot be undone.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Submit all answers
      for (const question of questions) {
        if (answers[question.room_question_id]) {
          await handleSubmitAnswer(question.room_question_id);
        } else {
          // Submit empty answer for unanswered questions
          await roomApi.submitAnswer({
            room_question: question.room_question_id,
            selected_option: '',
            answer_text: '',
            time_spent_seconds: 0,
            started_at: new Date().toISOString(),
          });
        }
      }
      
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Test submitted successfully!', 'success');
      }
      
      // Navigate to results
      router.push(`/guild/${code}/results`);
    } catch (err) {
      console.error('Error submitting test:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Failed to submit test', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="section-container">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push(`/guild/${code}/lobby`)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="section-container">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700 mb-4">No questions available</p>
            <button
              onClick={() => router.push(`/guild/${code}/lobby`)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="section-container max-w-6xl">
        {/* Header with Timer */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 sticky top-20 z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room {code}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-gray-600">Time Remaining</div>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">
                {answeredCount} / {questions.length} answered
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-32">
              <h3 className="font-bold text-gray-900 mb-3">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.room_question_id];
                  const isCurrent = idx === currentQuestionIndex;
                  
                  return (
                    <button
                      key={q.room_question_id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`p-2 rounded text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-primary text-white'
                          : isAnswered
                          ? 'bg-green-100 text-green-800 border-2 border-green-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {currentQuestion && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-600">
                        Question {currentQuestion.question_number}
                      </span>
                      <span className="text-sm text-gray-600">
                        {currentQuestion.question?.subject} • {currentQuestion.question?.difficulty_level?.level || 'Mixed'}
                      </span>
                    </div>
                    
                    <div
                      className="text-lg font-medium text-gray-900 mb-6"
                      dangerouslySetInnerHTML={{ __html: currentQuestion.question?.text || '' }}
                    />
                  </div>

                  {/* Options */}
                  {currentQuestion.question?.question_type === 'mcq' && (
                    <div className="space-y-3 mb-6">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optionKey = `option_${option.toLowerCase()}`;
                        const optionText = currentQuestion.question?.[optionKey];
                        if (!optionText) return null;
                        
                        // Get the current answer for THIS specific question
                        const currentAnswer = answers[currentQuestion.room_question_id];
                        const savedAnswer = currentQuestion.attempt?.selected_option;
                        
                        // Check if this option is selected for THIS question only
                        const isSelected = currentAnswer?.selected_option === option || 
                                          (savedAnswer && savedAnswer === option && !currentAnswer);
                        
                        return (
                          <label
                            key={`${currentQuestion.room_question_id}-${option}`}
                            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.room_question_id}`}
                              id={`question-${currentQuestion.room_question_id}-${option}`}
                              value={option}
                              checked={isSelected}
                              onChange={(e) => {
                                // Capture the question ID to avoid closure issues
                                const questionId = currentQuestion.room_question_id;
                                const selectedValue = e.target.value;
                                
                                // Validate we have a valid question ID
                                if (!questionId) {
                                  console.error('Invalid question ID:', questionId);
                                  return;
                                }
                                
                                // Update answer state for this specific question only
                                handleAnswerChange(questionId, selectedValue);
                                
                                // Submit answer after a small delay to ensure state is updated
                                setTimeout(() => {
                                  handleSubmitAnswer(questionId);
                                }, 100);
                              }}
                              className="mt-1 mr-3"
                            />
                            <span className="font-medium mr-2">{option}:</span>
                            <span
                              className="flex-1"
                              dangerouslySetInnerHTML={{ __html: optionText }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Integer/Numerical Answer */}
                  {(currentQuestion.question?.question_type === 'integer' || 
                    currentQuestion.question?.question_type === 'numerical') && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Answer
                      </label>
                      <input
                        type="text"
                        value={answers[currentQuestion.room_question_id]?.answer_text || ''}
                        onChange={(e) => {
                          handleAnswerChange(
                            currentQuestion.room_question_id,
                            '',
                            e.target.value
                          );
                        }}
                        onBlur={() => handleSubmitAnswer(currentQuestion.room_question_id)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter your answer"
                      />
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <button
                      onClick={handlePrevious}
                      disabled={currentQuestionIndex === 0}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleSubmitAnswer(currentQuestion.room_question_id);
                          handleNext();
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Save & Next
                      </button>
                      
                      {currentQuestionIndex === questions.length - 1 ? (
                        <button
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : 'Submit Test'}
                        </button>
                      ) : (
                        <button
                          onClick={handleNext}
                          disabled={currentQuestionIndex === questions.length - 1}
                          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

