'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/lib/api';
import AllAtOnceResults from '@/components/guild/AllAtOnceResults';
import IndividualResults from '@/components/guild/IndividualResults';

export default function RoomResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const code = params?.code?.toUpperCase();
  
  const [room, setRoom] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [unattemptedQuestions, setUnattemptedQuestions] = useState([]);
  const [showUnattempted, setShowUnattempted] = useState(false);
  const [loadingUnattempted, setLoadingUnattempted] = useState(false);
  const [showSolution, setShowSolution] = useState({});
  const [timeUntilResults, setTimeUntilResults] = useState(null);
  const [submissionData, setSubmissionData] = useState([]);

  const checkSubmissionStatus = async () => {
    if (!user) return;
    
    // If we already have leaderboard, don't make unnecessary requests
    if (allSubmitted && leaderboard.length > 0) {
      return;
    }
    
    try {
      // Fetch room details first to check status
      const roomResponse = await roomApi.getRoomByCode(code);
      const roomData = roomResponse.data;
      setRoom(roomData);
      
      // If room is completed, skip other checks and go straight to leaderboard
      if (roomData.status === 'completed' && leaderboard.length === 0) {
        try {
          const leaderboardResponse = await roomApi.getLeaderboard(code);
          const leaderboardData = leaderboardResponse.data;
          setLeaderboard(leaderboardData.leaderboard || []);
          setAllSubmitted(true);
          setTimeUntilResults(0);
          // Set participants from leaderboard if available
          if (leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0) {
            const participantsFromLeaderboard = leaderboardData.leaderboard.map(entry => ({
              user_email: entry.user_email,
              user_name: entry.user_name,
            }));
            setParticipants(participantsFromLeaderboard);
          }
          return; // Exit early, no need for other requests
        } catch (err) {
          // If leaderboard fails, continue with normal flow
          console.error('Error fetching leaderboard:', err);
        }
      }
      
      // For active rooms, fetch submission status (which includes participants data)
      try {
        const statusResponse = await roomApi.getSubmissionStatus(code);
        const statusData = statusResponse.data;
        
        setSubmissionStatus({
          total: statusData.total_participants,
          submitted: statusData.submitted_count,
          pending: statusData.pending_count,
        });
        
        // Store submission data for participant list (includes participant info)
        setSubmissionData(statusData.submissions || []);
        
        // Extract participants from submission data if available
        if (statusData.submissions && statusData.submissions.length > 0) {
          const participantsFromSubmissions = statusData.submissions.map(sub => ({
            user_email: sub.user_email,
            user_name: sub.user_name,
            participant_id: sub.participant_id,
          }));
          setParticipants(participantsFromSubmissions);
        }
        
        // Calculate time until results (24 hours after room creation) - only if not completed
        if (roomData.status !== 'completed' && roomData.created_at) {
          const createdAt = new Date(roomData.created_at);
          const resultsTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
          const now = new Date();
          const timeRemaining = Math.max(0, resultsTime - now);
          setTimeUntilResults(timeRemaining);
        } else if (roomData.status === 'completed') {
          setTimeUntilResults(0);
        }
        
        // If all submitted OR room is completed (manually ended by host), try to fetch leaderboard
        if (statusData.all_submitted || statusData.room_status === 'completed' || roomData.status === 'completed') {
          // Only fetch leaderboard if we don't already have it
          if (leaderboard.length === 0) {
            try {
              const leaderboardResponse = await roomApi.getLeaderboard(code);
              const leaderboardData = leaderboardResponse.data;
              setLeaderboard(leaderboardData.leaderboard || []);
              setAllSubmitted(true);
              setTimeUntilResults(0); // Clear countdown since results are ready
            } catch (err) {
              // Leaderboard might not be ready yet (403 if room not expired and not completed)
              if (err.response?.status === 403) {
                // Room not expired yet and not manually ended - show wait message
                setAllSubmitted(false);
                setError(null); // Don't show error, show engaging waiting page instead
              } else {
                // Other error - but all have submitted
                setAllSubmitted(statusData.all_submitted || roomData.status === 'completed');
              }
            }
          } else {
            // Already have leaderboard, just mark as submitted
            setAllSubmitted(true);
          }
        } else {
          setAllSubmitted(false);
        }
      } catch (err) {
        // If submission status endpoint fails, try leaderboard directly
        if (err.response?.status === 400 && err.response?.data?.detail?.includes('not active')) {
          // Room might be completed - try leaderboard
          try {
            const leaderboardResponse = await roomApi.getLeaderboard(code);
            const leaderboardData = leaderboardResponse.data;
            setLeaderboard(leaderboardData.leaderboard || []);
            setAllSubmitted(true);
            setSubmissionStatus({
              total: leaderboardData.total_participants,
              submitted: leaderboardData.total_participants,
              pending: 0,
            });
          } catch (leaderboardErr) {
            // If 403, room not expired - show wait message
            if (leaderboardErr.response?.status === 403) {
              setError(leaderboardErr.response?.data?.detail || 'Results are not ready yet. Please wait for 24 hours after room creation to see final results.');
            } else {
              setError(leaderboardErr.response?.data?.detail || 'Failed to check submission status');
            }
          }
        } else {
          setError(err.response?.data?.detail || 'Failed to check submission status');
        }
      }
    } catch (err) {
      console.error('Error checking submission status:', err);
      setError(err.response?.data?.detail || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

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
      checkSubmissionStatus();
    }
  }, [code, user, authLoading]);

  // Poll for updates only if results are not ready yet
  // Increase interval to 10 seconds to reduce load
  useEffect(() => {
    if (!code || !user || allSubmitted || leaderboard.length > 0) {
      return; // Don't poll if results are ready
    }
    
    const interval = setInterval(() => {
      checkSubmissionStatus();
    }, 10000); // Poll every 10 seconds instead of 5
    
    return () => clearInterval(interval);
  }, [code, user, allSubmitted, leaderboard.length]);

  // Countdown timer effect
  useEffect(() => {
    if (!timeUntilResults || timeUntilResults <= 0) return;
    
    const timer = setInterval(() => {
      setTimeUntilResults((prev) => {
        if (prev <= 1000) {
          // Time's up, refresh to check for results
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeUntilResults]);
  
  // Refresh when countdown reaches zero
  useEffect(() => {
    if (timeUntilResults === 0 && code && user) {
      checkSubmissionStatus();
    }
  }, [timeUntilResults, code, user]);

  const handleEndTest = async () => {
    if (!confirm('Are you sure you want to end the test? This will finalize results for all participants, even if some haven\'t submitted yet.')) {
      return;
    }

    try {
      await roomApi.endRoom(code);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Test ended successfully!', 'success');
      }
      // Refresh to show results
      checkSubmissionStatus();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to end test';
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  };

  const fetchReview = async () => {
    if (!user || !code) return;
    
    try {
      setLoadingReview(true);
      const response = await roomApi.getReview(code);
      setWrongAnswers(response.data.wrong_answers || []);
      setShowReview(true);
    } catch (err) {
      console.error('Error fetching review:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(err.response?.data?.detail || 'Failed to load review', 'error');
      }
    } finally {
      setLoadingReview(false);
    }
  };

  const fetchUnattempted = async () => {
    if (!user || !code) return;
    
    try {
      setLoadingUnattempted(true);
      const response = await roomApi.getUnattempted(code);
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

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatCountdown = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && !allSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="section-container max-w-4xl">
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

  const isHost = room?.is_host || room?.host === user?.id || room?.host_email === user?.email;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="section-container max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Room {code} - Results</h1>
              <p className="text-gray-600 mt-1">
                {room?.exam_name || 'Test Results'}
              </p>
            </div>
            {!allSubmitted && isHost && room?.status === 'active' && (
              <button
                onClick={handleEndTest}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                End Test Now
              </button>
            )}
          </div>
        </div>

        {/* Render appropriate component based on attempt_mode */}
        {room?.attempt_mode === 'ALL_AT_ONCE' ? (
          <AllAtOnceResults
            code={code}
            room={room}
            user={user}
            leaderboard={leaderboard}
            setLeaderboard={setLeaderboard}
            allSubmitted={allSubmitted}
            setAllSubmitted={setAllSubmitted}
            submissionStatus={submissionStatus}
            setSubmissionStatus={setSubmissionStatus}
            participants={participants}
            setParticipants={setParticipants}
            submissionData={submissionData}
            setSubmissionData={setSubmissionData}
          />
        ) : (
          <IndividualResults
            code={code}
            room={room}
            user={user}
            leaderboard={leaderboard}
            setLeaderboard={setLeaderboard}
            allSubmitted={allSubmitted}
            setAllSubmitted={setAllSubmitted}
            submissionStatus={submissionStatus}
            setSubmissionStatus={setSubmissionStatus}
            participants={participants}
            setParticipants={setParticipants}
            submissionData={submissionData}
            setSubmissionData={setSubmissionData}
            timeUntilResults={timeUntilResults}
            setTimeUntilResults={setTimeUntilResults}
          />
        )}

        {/* Review and Unattempted sections - shown after results are available */}

        {/* Review Section */}
        {allSubmitted && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Review Wrong Answers</h2>
              {!showReview && (
                <button
                  onClick={fetchReview}
                  disabled={loadingReview}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingReview ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Review Wrong Answers
                    </>
                  )}
                </button>
              )}
            </div>
            
            {showReview && (
              <div>
                {wrongAnswers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">🎉 Great job! You got all questions correct!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-gray-600 mb-4">
                      You got {wrongAnswers.length} question{wrongAnswers.length !== 1 ? 's' : ''} wrong. Review them below to learn from your mistakes.
                    </p>
                    {wrongAnswers.map((item) => {
                      const question = item.question;
                      const isMCQ = question?.question_type === 'mcq';
                      
                      return (
                        <div key={item.attempt_id} className="border-2 border-red-200 bg-red-50 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-semibold text-gray-500">
                                  Q{item.question_number}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Wrong Answer
                                </span>
                                {question?.subject && (
                                  <span className="text-sm text-gray-500">
                                    {question.subject}
                                  </span>
                                )}
                              </div>
                              
                              <div
                                className="prose max-w-none text-gray-900 font-medium mb-4"
                                dangerouslySetInnerHTML={{ __html: question?.text || '' }}
                              />
                              
                              {/* Options Display */}
                              {isMCQ && (question?.option_a || question?.option_b || question?.option_c || question?.option_d) && (
                                <div className="mb-4 space-y-2">
                                  <div className="text-sm font-semibold text-gray-700 mb-2">Options:</div>
                                  {['A', 'B', 'C', 'D'].map((option) => {
                                    const optionKey = `option_${option.toLowerCase()}`;
                                    const optionText = question?.[optionKey];
                                    const isCorrect = question?.correct_option?.toUpperCase() === option;
                                    const isSelected = item.selected_option?.toUpperCase() === option;
                                    
                                    if (!optionText) return null;
                                    
                                    return (
                                      <div
                                        key={option}
                                        className={`p-3 rounded-lg border-2 ${
                                          isCorrect
                                            ? 'bg-green-50 border-green-300'
                                            : isSelected
                                            ? 'bg-red-50 border-red-300'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className={`font-semibold ${
                                            isCorrect ? 'text-green-700' : isSelected ? 'text-red-700' : 'text-gray-700'
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
                                          {isSelected && !isCorrect && (
                                            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                                              Your Answer
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Integer/Numerical Answer Display */}
                              {!isMCQ && (
                                <div className="mb-4 space-y-2">
                                  <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                    <span className="text-sm font-semibold text-red-700">Your Answer: </span>
                                    <span className="text-sm text-red-700">
                                      {item.answer_text || item.selected_option || 'Not answered'}
                                    </span>
                                  </div>
                                  {question?.correct_option && (
                                    <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                                      <span className="text-sm font-semibold text-green-700">Correct Answer: </span>
                                      <span className="text-sm text-green-700">{question.correct_option}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Solution Toggle */}
                              {question?.explanation && (
                                <div className="mt-4">
                                  <button
                                    onClick={() => setShowSolution(prev => ({
                                      ...prev,
                                      [item.attempt_id]: !prev[item.attempt_id]
                                    }))}
                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${
                                        showSolution[item.attempt_id] ? 'rotate-180' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {showSolution[item.attempt_id] ? 'Hide' : 'Show'} Explanation
                                  </button>
                                  {showSolution[item.attempt_id] && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="text-sm font-semibold text-gray-700 mb-2">
                                        Explanation:
                                      </div>
                                      <div
                                        className="prose prose-sm max-w-none text-gray-700"
                                        dangerouslySetInnerHTML={{ __html: question.explanation }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Marks and Time */}
                              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                                <span>
                                  Marks: <span className="font-semibold text-red-600">{item.marks_obtained.toFixed(1)}</span>
                                </span>
                                {item.time_spent_seconds > 0 && (
                                  <span>
                                    Time: <span className="font-semibold">{formatTime(item.time_spent_seconds)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
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
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/guild/${code}/lobby`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Lobby
          </button>
          <button
            onClick={() => router.push('/guild')}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    </div>
  );
}

