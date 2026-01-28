'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, ScholarshipApi } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchNotifications();
  }, [user, authLoading, showAll, router]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getNotifications({
        all: showAll,
        limit: 100
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
      setTotalCount(response.data.total_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await authApi.markNotificationRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      // Update unread count
      if (!showAll) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Failed to mark notification as read', 'error');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await authApi.markAllNotificationsRead();
      // Update all notifications to read
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Failed to mark all as read', 'error');
      }
    }
  };

  const handleScholarshipResponse = async (notificationId, response) => {
    try {
      await ScholarshipApi.handleNotificationResponse(notificationId, response);
      
      // Update notification to read
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      // Update unread count
      if (!showAll) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      if (typeof window !== 'undefined' && window.showToast) {
        const message = response === 'yes' 
          ? 'Application status updated to Applied!' 
          : 'Notification marked as read';
        window.showToast(message, 'success');
      }
      
      // Refresh notifications to get updated data
      fetchNotifications();
    } catch (err) {
      console.error('Error handling scholarship response:', err);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Failed to update application status', 'error');
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // All notifications are displayed together, no category filtering

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-niat-primary mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-niat-text-secondary">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 md:pt-28 pb-8 md:pb-12 px-4 sm:px-6 lg:px-8">
      <div className="section-container max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-niat-text">Notifications</h1>
              <p className="text-sm sm:text-base text-niat-text-secondary mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white border border-niat-border text-niat-text rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-niat-primary text-white rounded-lg hover:bg-niat-primary/90 transition-colors whitespace-nowrap"
              >
                {showAll ? 'Show Unread Only' : 'Show All'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 md:mb-6 text-sm">
            {error}
          </div>
        )}

        {/* All Notifications Section */}
        {notifications.length > 0 ? (
          <div className="mb-6 md:mb-8">
            <div className="space-y-2 sm:space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`card border-l-4 transition-all p-4 sm:p-6 ${
                    notification.is_read
                      ? 'bg-white border-l-gray-300'
                      : 'bg-niat-primary/5 border-l-niat-primary'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {notification.category === 'GUILD' && (
                          <span className="text-xl sm:text-2xl">🎯</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                          notification.category === 'GUILD'
                            ? 'text-niat-primary bg-niat-primary/10'
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          {notification.category_display}
                        </span>
                        {!notification.is_read && (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            notification.category === 'GUILD' ? 'bg-niat-primary' : 'bg-gray-400'
                          }`}></span>
                        )}
                      </div>
                      <p className={`text-sm sm:text-base text-niat-text mb-2 break-words ${notification.is_read ? '' : 'font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-niat-text-secondary break-words">
                        <span className="whitespace-nowrap">{formatTimeAgo(notification.created_at)}</span>
                        <span className="hidden sm:inline"> • </span>
                        <span className="block sm:inline mt-1 sm:mt-0">{formatDate(notification.created_at)}</span>
                      </p>
                    </div>
                    {!notification.is_read && notification.action_type === 'scholarship_apply_confirm' ? (
                      <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => handleScholarshipResponse(notification.id, 'yes')}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleScholarshipResponse(notification.id, 'no')}
                          className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap font-medium"
                        >
                          No
                        </button>
                      </div>
                    ) : !notification.is_read ? (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-white rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto ${
                          notification.category === 'GUILD'
                            ? 'bg-niat-primary hover:bg-niat-primary/90'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        Mark Read
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (

          <div className="card text-center py-8 sm:py-12 px-4">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔔</div>
            <h3 className="text-lg sm:text-xl font-bold text-niat-text mb-2">
              {showAll ? 'No notifications yet' : 'No unread notifications'}
            </h3>
            <p className="text-sm sm:text-base text-niat-text-secondary mb-4 max-w-md mx-auto">
              {showAll 
                ? "You don't have any notifications yet. Check back later!"
                : "You're all caught up! No unread notifications."}
            </p>
            {!showAll && totalCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="px-4 py-2 text-sm sm:text-base bg-niat-primary text-white rounded-lg hover:bg-niat-primary/90 transition-colors"
              >
                Show All Notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

