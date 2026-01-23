'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/lib/api';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function WaitingLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const code = params?.code?.toUpperCase();
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [kickUserId, setKickUserId] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (code) {
      fetchRoom();
      fetchParticipants();
      // Only poll if room is not completed
      const interval = setInterval(() => {
        fetchRoom();
        fetchParticipants();
      }, 10000); // Refresh every 10 seconds instead of 5 to reduce load
      return () => clearInterval(interval);
    }
  }, [code, user, authLoading, router]);

  // Check submission status when room becomes active
  useEffect(() => {
    if (room && room.status === 'active' && user && !hasSubmitted) {
      checkSubmissionStatus();
      // Also check periodically, but stop if user has submitted
      const interval = setInterval(() => {
        if (!hasSubmitted) {
          checkSubmissionStatus();
        }
      }, 10000); // Poll every 10 seconds instead of 5
      return () => clearInterval(interval);
    } else {
      // Reset hasSubmitted when room is not active
      if (room?.status !== 'active') {
        setHasSubmitted(false);
      }
    }
  }, [room?.status, room?.id, user, code, hasSubmitted]);

  useEffect(() => {
    // Only auto-navigate to test for ALL_AT_ONCE mode
    // For INDIVIDUAL mode, participants start their test manually from lobby
    if (room?.status === 'active' && room?.attempt_mode === 'ALL_AT_ONCE') {
      router.push(`/guild/${code}/test`);
    }
  }, [room?.status, room?.attempt_mode, code]);

  const fetchRoom = async () => {
    try {
      const response = await roomApi.getRoomByCode(code);
      setRoom(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load room');
      console.error('Error fetching room:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      return;
    }
    
    try {
      const response = await roomApi.getParticipants(code);
      setParticipants(response.data);
    } catch (err) {
      // If it's a 403, it might be because user is not a participant yet (just joined)
      // Don't treat it as an auth error that requires logout
      if (err.response?.status === 403) {
        // Check if it's a permission error (not an auth error)
        const errorMsg = err.response?.data?.detail || '';
        if (errorMsg.includes('participant') || errorMsg.includes('host')) {
          // This is a permission error, not an auth error - don't log out
          console.warn('Cannot view participants:', errorMsg);
          return;
        }
      }
      // If it's an auth error (401), let the interceptor handle it
      if (err.response?.status === 401) {
        return;
      }
      console.error('Error fetching participants:', err);
    }
  };

  const checkSubmissionStatus = async () => {
    if (!user || !room || room.status !== 'active' || !code) {
      setHasSubmitted(false);
      return;
    }
    
    try {
      const response = await roomApi.getSubmissionStatus(code);
      const submissionData = response.data.submissions || [];
      
      // Find current user's submission by email (case-insensitive)
      const userEmail = user.email?.toLowerCase().trim();
      const currentUserSubmission = submissionData.find(
        (sub) => {
          const subEmail = sub.user_email?.toLowerCase().trim();
          return subEmail === userEmail;
        }
      );
      
      if (currentUserSubmission) {
        const submitted = currentUserSubmission.has_submitted_all === true;
        setHasSubmitted(submitted);
      } else {
        // User not found in submissions, assume not submitted
        setHasSubmitted(false);
      }
    } catch (err) {
      // If submission status endpoint fails, assume not submitted
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('not active')) {
        // Room not active yet, that's fine
        setHasSubmitted(false);
      } else if (err.response?.status !== 400) {
        console.error('Error checking submission status:', err);
        setHasSubmitted(false);
      }
    }
  };

  const handleKickClick = (userId) => {
    setKickUserId(userId);
    setShowKickModal(true);
  };

  const handleKick = async () => {
    if (!kickUserId) return;

    try {
      await roomApi.kickParticipant(code, kickUserId);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Participant kicked successfully', 'success');
      }
      fetchParticipants();
      setKickUserId(null);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to kick participant';
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  };

  const handleStartClick = () => {
    setShowStartModal(true);
  };

  const handleStart = async () => {
    // Start countdown
    setIsStarting(true);
    setCountdown(3);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // After countdown completes, start the room
    setTimeout(async () => {
      clearInterval(countdownInterval);
      setIsStarting(false);
      setCountdown(null);

      try {
        await roomApi.startRoom(code);
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('Test started!', 'success');
        }
        fetchRoom();
      } catch (err) {
        const errorMsg = err.response?.data?.detail || 'Failed to start room';
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(errorMsg, 'error');
        }
      }
    }, 3000); // 3 seconds for countdown
  };

  // Check if user is host - try multiple ways to determine this
  const isHost = room?.is_host === true || 
                 (room?.host && user?.id && String(room.host) === String(user.id)) ||
                 (room?.host_email && user?.email && room.host_email.toLowerCase() === user.email.toLowerCase());
  
  // Filter out the host from participants count (host is automatically a participant)
  // We need to identify the host by comparing user IDs or emails
  const hostId = room?.host || room?.host_id;
  const hostEmail = room?.host_email;
  
  const otherParticipants = participants.filter(p => {
    const participantUserId = p.user || p.user_id;
    const participantEmail = p.user_email || p.email;
    
    // Exclude if this participant is the host
    if (hostId && participantUserId) {
      return String(participantUserId) !== String(hostId);
    }
    if (hostEmail && participantEmail) {
      return participantEmail !== hostEmail;
    }
    // If we can't determine, include them (shouldn't happen)
    return true;
  });
  
  const hasOtherParticipants = otherParticipants.length > 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="section-container">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Room not found'}</p>
            <button
              onClick={() => router.push('/guild')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="section-container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/guild')}
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← Back to Rooms
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Room {room.code}
              </h1>
              <p className="text-gray-600">
                {room.exam_name} • {room.number_of_questions} questions • {room.duration} minutes
              </p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-medium border ${
              room.status === 'waiting' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              room.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
              'bg-gray-100 text-gray-800 border-gray-300'
            }`}>
              {room.status_display || room.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Room Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Room Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Exam:</span>
                  <p className="text-gray-900">{room.exam_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Questions:</span>
                  <p className="text-gray-900">{room.number_of_questions}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Duration:</span>
                  <p className="text-gray-900">{room.duration} minutes</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Time per Question:</span>
                  <p className="text-gray-900">{room.time_per_question} min</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Difficulty:</span>
                  <p className="text-gray-900 capitalize">{room.difficulty_display || room.difficulty}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Privacy:</span>
                  <p className="text-gray-900 capitalize">{room.privacy_display || room.privacy}</p>
                </div>
              </div>
            </div>

            {/* Host Controls - Show for waiting rooms */}
            {isHost && (room.status === 'waiting' || room.status === 'WAITING') && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Host Controls</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleStartClick}
                    disabled={room.attempt_mode === 'ALL_AT_ONCE' && !hasOtherParticipants}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {room.attempt_mode === 'INDIVIDUAL' ? 'Activate Room' : 'Start Test'}
                  </button>
                  <p className={`text-sm ${room.attempt_mode === 'ALL_AT_ONCE' && !hasOtherParticipants ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {room.attempt_mode === 'INDIVIDUAL'
                      ? 'Activate the room to allow participants to start their tests. You can also start your test after activation.'
                      : !hasOtherParticipants 
                        ? 'Invite at least one friend to Start the Room'
                        : `${otherParticipants.length} participant(s) ready`}
                  </p>
                </div>
              </div>
            )}

            {/* Host Start Test Button for INDIVIDUAL Mode (after activation) */}
            {isHost && room.status === 'active' && room.attempt_mode === 'INDIVIDUAL' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {hasSubmitted ? 'Test Submitted!' : 'Ready to Start?'}
                </h2>
                <div className="space-y-3">
                  {hasSubmitted ? (
                    <>
                      <button
                        onClick={() => router.push(`/guild/${code}/results`)}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Return to Results
                      </button>
                      <p className="text-sm text-gray-600">
                        You've completed your test! View results and see how you compare with others.
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/guild/${code}/test`)}
                        className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        Start My Test
                      </button>
                      <p className="text-sm text-gray-600">
                        You can start your test anytime. Your timer will begin when you click this button.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Start Test / Return to Results Button for INDIVIDUAL Mode */}
            {room.status === 'active' && room.attempt_mode === 'INDIVIDUAL' && !isHost && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {hasSubmitted ? 'Test Submitted!' : 'Ready to Start?'}
                </h2>
                <div className="space-y-3">
                  {hasSubmitted ? (
                    <>
                      <button
                        onClick={() => router.push(`/guild/${code}/results`)}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Return to Results
                      </button>
                      <p className="text-sm text-gray-600">
                        You've completed your test! View results and see how you compare with others.
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/guild/${code}/test`)}
                        className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        Start My Test
                      </button>
                      <p className="text-sm text-gray-600">
                        You can start your test anytime. Your timer will begin when you click this button.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Participants ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No participants yet</p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {participant.user_name || participant.user_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(participant.joined_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {isHost && room.status === 'waiting' && participant.user !== user?.id && (
                      <button
                        onClick={() => handleKickClick(participant.user)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-colors"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Waiting Message */}
        {room.status === 'waiting' && !isHost && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 font-medium">
              {room.attempt_mode === 'INDIVIDUAL' 
                ? 'Waiting for host to activate the room. Once activated, you can start your test anytime.'
                : 'Waiting for host to start the test...'}
            </p>
          </div>
        )}

      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showKickModal}
        onClose={() => {
          setShowKickModal(false);
          setKickUserId(null);
        }}
        onConfirm={handleKick}
        title="Kick Participant"
        message="Are you sure you want to kick this participant? They will be removed from the room."
        confirmText="Kick"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onConfirm={handleStart}
        title={room?.attempt_mode === 'INDIVIDUAL' ? 'Activate Room' : 'Start Test'}
        message={room?.attempt_mode === 'INDIVIDUAL' 
          ? 'Are you sure you want to activate this room? Participants will be able to start their tests individually.'
          : 'Are you sure you want to start this test? All participants will begin immediately.'}
        confirmText={room?.attempt_mode === 'INDIVIDUAL' ? 'Activate Room' : 'Start Test'}
        cancelText="Cancel"
        variant="default"
      />

      {/* Countdown Overlay */}
      {isStarting && countdown !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="relative">
            {/* Animated background circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-primary/20 rounded-full animate-ping"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 bg-primary/30 rounded-full animate-pulse"></div>
            </div>
            
            {/* Main countdown display */}
            <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-16 text-center shadow-2xl border-4 border-primary/30">
              <div className="text-[180px] md:text-[240px] font-black text-primary mb-6 leading-none animate-bounce">
                {countdown}
              </div>
              <p className="text-3xl md:text-4xl text-gray-800 font-bold mb-2">
                Test Starting In
              </p>
              <p className="text-lg text-gray-600 font-medium">
                Get ready!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

