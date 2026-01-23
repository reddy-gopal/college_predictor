'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { roomApi } from '@/lib/api';

export default function IndividualResults({ 
  code, 
  room, 
  user, 
  leaderboard, 
  setLeaderboard, 
  allSubmitted, 
  setAllSubmitted,
  submissionStatus,
  setSubmissionStatus,
  participants,
  setParticipants,
  submissionData,
  setSubmissionData,
  timeUntilResults,
  setTimeUntilResults
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkSubmissionStatus = async () => {
    if (!user || !code) return;
    
    try {
      // Fetch room details
      const roomResponse = await roomApi.getRoomByCode(code);
      const roomData = roomResponse.data;
      
      // Calculate time until results (24 hours after room creation)
      if (roomData.created_at) {
        const createdAt = new Date(roomData.created_at);
        const resultsTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        const now = new Date();
        const timeRemaining = Math.max(0, resultsTime - now);
        setTimeUntilResults(timeRemaining);
      }

      // Fetch submission status
      const statusResponse = await roomApi.getSubmissionStatus(code);
      const statusData = statusResponse.data;
      
      setSubmissionStatus({
        total: statusData.total_participants,
        submitted: statusData.submitted_count,
        pending: statusData.pending_count,
      });
      
      setSubmissionData(statusData.submissions || []);
      
      // If room is completed or expired, try to fetch leaderboard
      if (statusData.room_status === 'completed' || roomData.status === 'completed' || timeUntilResults === 0) {
        if (leaderboard.length === 0) {
          try {
            const leaderboardResponse = await roomApi.getLeaderboard(code);
            const leaderboardData = leaderboardResponse.data;
            setLeaderboard(leaderboardData.leaderboard || []);
            setAllSubmitted(true);
            setTimeUntilResults(0);
          } catch (err) {
            if (err.response?.status === 403) {
              // Still waiting for 24 hours
              setAllSubmitted(false);
              setError(null);
            } else {
              setError(err.response?.data?.detail || 'Failed to load leaderboard');
            }
          }
        } else {
          setAllSubmitted(true);
        }
      } else {
        setAllSubmitted(false);
      }
    } catch (err) {
      console.error('Error checking submission status:', err);
      setError(err.response?.data?.detail || 'Failed to check submission status');
    }
  };

  useEffect(() => {
    if (code && user) {
      checkSubmissionStatus();
      const interval = setInterval(() => {
        checkSubmissionStatus();
      }, 10000); // Poll every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [code, user]);

  // Countdown timer effect
  useEffect(() => {
    if (timeUntilResults === null || timeUntilResults <= 0) return;
    
    const timer = setInterval(() => {
      setTimeUntilResults((prev) => {
        if (prev === null || prev <= 1000) {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Results are ready!';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (allSubmitted && leaderboard.length > 0) {
    return (
      <div className="space-y-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Participant</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Score</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Percentage</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Correct</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Wrong</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const isCurrentUser = entry.user_email === user?.email;
                  return (
                    <tr
                      key={entry.participant_id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        isCurrentUser ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          {entry.rank === 1 && <span className="text-2xl mr-2">🥇</span>}
                          {entry.rank === 2 && <span className="text-2xl mr-2">🥈</span>}
                          {entry.rank === 3 && <span className="text-2xl mr-2">🥉</span>}
                          <span className={`font-bold ${isCurrentUser ? 'text-primary' : 'text-gray-900'}`}>
                            {entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-gray-900'}`}>
                            {entry.user_name}
                            {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                          </div>
                          <div className="text-sm text-gray-500">{entry.user_email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-gray-900">
                          {entry.total_score.toFixed(1)} / {entry.total_marks.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-semibold ${
                          entry.percentage >= 80 ? 'text-green-600' :
                          entry.percentage >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {entry.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-green-600 font-medium">
                        {entry.correct_count}
                      </td>
                      <td className="py-4 px-4 text-right text-red-600 font-medium">
                        {entry.wrong_count}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-600">
                        {formatTime(entry.total_time_seconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Total Participants</div>
            <div className="text-3xl font-bold text-gray-900">{leaderboard.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Average Score</div>
            <div className="text-3xl font-bold text-gray-900">
              {leaderboard.length > 0
                ? (leaderboard.reduce((sum, e) => sum + e.total_score, 0) / leaderboard.length).toFixed(1)
                : '0.0'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Highest Score</div>
            <div className="text-3xl font-bold text-green-600">
              {leaderboard.length > 0 ? leaderboard[0].total_score.toFixed(1) : '0.0'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for 24 hours
  return (
    <div className="bg-gradient-to-br from-niat-primary/10 to-accent-1/10 border-2 border-niat-primary/20 rounded-lg shadow-lg p-8 text-center">
      <h2 className="text-3xl font-bold text-niat-primary mb-4">
        Results will be out soon! 🚀
      </h2>
      <p className="text-lg text-gray-700 mb-6">
        We're crunching the numbers. The final leaderboard will be revealed once the room expires (24 hours after creation).
      </p>

      {/* Countdown Timer */}
      {timeUntilResults !== null && timeUntilResults > 0 && (
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-600 mb-2">Time until results:</p>
          <div className="inline-block bg-gradient-to-r from-niat-primary to-accent-1 text-white text-4xl md:text-5xl font-extrabold px-8 py-4 rounded-xl shadow-md">
            {formatTimeRemaining(timeUntilResults)}
          </div>
        </div>
      )}

      {/* Participants List with Submission Status */}
      {submissionData && submissionData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-left">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Participants ({submissionData.length})
          </h3>
          <div className="space-y-3">
            {submissionData.map((sub) => {
              const isCurrentUser = sub.user_email?.toLowerCase() === user?.email?.toLowerCase();
              return (
                <div
                  key={sub.participant_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                      {sub.user_name || sub.user_email}
                      {isCurrentUser && <span className="ml-2 text-xs text-blue-700">(You)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    {sub.has_submitted_all ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Submitted
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Progress
                      </span>
                    )}
                    {sub.total_questions > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {sub.answered_count} / {sub.total_questions} Qs
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

