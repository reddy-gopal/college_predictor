'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/lib/api';
import Link from 'next/link';

export default function GuildRoomsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      // Check if there's a token in sessionStorage - if so, wait a bit for auth to initialize
      const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
      if (!sessionToken) {
        router.push('/login');
      }
      return;
    }
    
    // Only fetch rooms if user is authenticated
    if (user) {
      fetchRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, filter]);

  const fetchRooms = async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const params = {};
      if (filter === 'completed') {
        // Only show completed rooms
        params.status = 'completed';
      } else if (filter === 'public' || filter === 'private') {
        // For public/private, exclude completed rooms
        params.privacy = filter;
        params.exclude_status = 'completed';
      } else if (filter === 'waiting' || filter === 'active') {
        // For waiting/active, show only that status
        params.status = filter;
      } else {
        // For 'all', exclude completed rooms
        params.exclude_status = 'completed';
      }
      const response = await roomApi.getRooms(params);
      setRooms(response.data.results || response.data);
      setError(null);
    } catch (err) {
      // If it's an auth error, don't show error message - let the interceptor handle redirect
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Auth error - will be handled by interceptor or component will redirect
        setLoading(false);
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Room code is required');
      return;
    }

    try {
      setJoining(true);
      setError(null);
      const response = await roomApi.joinRoom({
        code: joinCode.toUpperCase(),
        password: joinPassword || '',
      });
      
      // Show success toast
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Successfully joined room!', 'success');
      }
      
      // Navigate to waiting lobby
      router.push(`/guild/${joinCode.toUpperCase()}/lobby`);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.password?.[0] || err.response?.data?.code?.[0] || 'Failed to join room';
      setError(errorMsg);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleStartRoom = async (code) => {
    if (!confirm('Are you sure you want to start this test? All participants will begin immediately.')) {
      return;
    }

    try {
      await roomApi.startRoom(code);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Test started successfully!', 'success');
      }
      fetchRooms();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to start room';
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  };

  const handleEndRoom = async (code) => {
    if (!confirm('Are you sure you want to end this test? This action cannot be undone.')) {
      return;
    }

    try {
      await roomApi.endRoom(code);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Test ended successfully!', 'success');
      }
      fetchRooms();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to end room';
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  };

  const filteredRooms = rooms.filter((room) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        room.code.toLowerCase().includes(query) ||
        room.host_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      active: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      locked: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[status] || badges.waiting;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="section-container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Guild Rooms 🎯
              </h1>
              <p className="text-gray-600">
                Join or create tournament-style test rooms
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Token Type Display */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent-1/10 to-accent-1/5 border-2 border-accent-1/20 rounded-lg">
                <svg className="w-6 h-6 text-accent-1" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-lg font-bold text-accent-1">
                  {user?.room_credits ?? 0}
                </span>
              </div>
              <Link
                href="/guild/create"
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Room
              </Link>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {['all', 'public', 'private', 'waiting', 'active', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by room code or host..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Insufficient Credits Message */}
        {user && user.room_credits < 1 && (
          <div className="mb-6 p-4 bg-gradient-to-br from-accent-1/10 to-accent-2/10 border-2 border-accent-1 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Need Room Credits?
                </h3>
                <p className="text-gray-900 mb-3">
                  You don't have enough room credits to create a guild room. Refer students to earn room credits!
                </p>
                <Link
                  href="/referral"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-1 text-primary font-medium rounded-lg hover:bg-accent-2 hover:text-white transition-colors"
                >
                  <span>Refer & Earn</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {authLoading || loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No rooms found</p>
            <Link
              href="/guild/create"
              className="text-primary hover:underline font-medium"
            >
              Create the first room
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUser={user}
                onJoin={() => {
                  setSelectedRoom(room);
                  setJoinCode(room.code);
                  setJoinPassword('');
                  setJoinModalOpen(true);
                }}
                onStart={() => handleStartRoom(room.code)}
                onEnd={() => handleEndRoom(room.code)}
                onViewParticipants={() => router.push(`/guild/${room.code}/lobby`)}
              />
            ))}
          </div>
        )}

        {/* Join Modal */}
        {joinModalOpen && (
          <JoinRoomModal
            room={selectedRoom}
            code={joinCode}
            password={joinPassword}
            onCodeChange={setJoinCode}
            onPasswordChange={setJoinPassword}
            onJoin={handleJoin}
            onClose={() => {
              setJoinModalOpen(false);
              setSelectedRoom(null);
              setJoinCode('');
              setJoinPassword('');
              setError(null);
            }}
            joining={joining}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

// Room Card Component
function RoomCard({ room, currentUser, onJoin, onStart, onEnd, onViewParticipants }) {
  const router = useRouter();
  const isHost = room.host === currentUser?.id || room.host_email === currentUser?.email;
  const isFull = room.is_full;
  const canJoin = room.status === 'waiting' && !isFull && !isHost;

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
      locked: { bg: 'bg-red-100', text: 'text-red-800', label: 'Locked' },
    };
    return badges[status] || badges.waiting;
  };

  const statusBadge = getStatusBadge(room.status);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{room.code}</h3>
            {room.privacy === 'private' && (
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Room Details */}
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">Exam:</span>
          <span>{room.exam_name || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Questions:</span>
          <span>{room.number_of_questions}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Duration:</span>
          <span>{room.duration} min</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Participants:</span>
          <span>{room.participant_count || 0} / {room.participant_limit || '∞'}</span>
        </div>
        {room.start_time && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Start:</span>
            <span>{new Date(room.start_time).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {room.status === 'completed' ? (
          <button
            onClick={() => router.push(`/guild/${room.code}/results`)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            View Results
          </button>
        ) : isHost ? (
          <>
            <button
              onClick={onViewParticipants}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              Manage
            </button>
            {room.status === 'waiting' && (
              <button
                onClick={onStart}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
              >
                Start
              </button>
            )}
            {room.status === 'active' && (
              <button
                onClick={onEnd}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                End
              </button>
            )}
          </>
        ) : canJoin ? (
          <button
            onClick={onJoin}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Join Room
          </button>
        ) : (
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
          >
            {isFull ? 'Room Full' : room.status === 'active' ? 'In Progress' : 'Cannot Join'}
          </button>
        )}
      </div>
    </div>
  );
}

// Join Room Modal Component
function JoinRoomModal({ room, code, password, onCodeChange, onPasswordChange, onJoin, onClose, joining, error }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Join Room</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {room && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Room:</span> {room.code}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Exam:</span> {room.exam_name}
            </p>
          </div>
        )}

        <form onSubmit={onJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={!!room}
            />
          </div>

          {room?.privacy === 'private' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Enter room password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joining || !code.trim()}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

