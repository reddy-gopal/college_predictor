import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials removed - not using session-based auth, using default user workaround
});

// Token storage in memory (module-level variable)
let authToken = null;

// Function to set token (called from AuthContext)
export const setAuthToken = (token) => {
  authToken = token;
};

// Function to get token
export const getAuthToken = () => {
  return authToken;
};

// Add request interceptor to include auth token if available
api.interceptors.request.use(
  (config) => {
    // Get token from memory (set by AuthContext)
    if (authToken) {
      // Always use Bearer format for JWT tokens
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 (Unauthorized) - this means token is invalid/expired
    // 403 (Forbidden) is a permission issue, not an auth issue - don't log out
    if (error.response?.status === 401) {
      // Clear token from memory
      authToken = null;
      // Only redirect if we have a token in sessionStorage (meaning user was logged in)
      // This prevents redirecting when user is legitimately not logged in
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('auth_token');
        const pathname = window.location.pathname;
        const publicPaths = ['/login', '/register', '/'];
        const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
        
        // Only redirect if:
        // 1. We're not on a public path
        // 2. We had a token (user was logged in, so this is a real auth error)
        // 3. We're not already on login/register
        if (!isPublicPath && sessionToken && !pathname.includes('/login') && !pathname.includes('/register')) {
          // Clear session token since auth failed
          sessionStorage.removeItem('auth_token');
          // Use a small delay to avoid race conditions with React state updates
          setTimeout(() => {
            // Double-check we're still not on a public path (React might have navigated)
            if (!window.location.pathname.includes('/login') && 
                !window.location.pathname.includes('/register')) {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    }
    // For 403 errors, don't log out - it's a permission issue, not an auth issue
    return Promise.reject(error);
  }
);

// Mock Test APIs
export const mockTestApi = {
  getExams: () => api.get('/mocktest/exams/'),
  getAll: (params) => api.get('/mocktest/mock-tests/', { params }),
  getById: (id) => api.get(`/mocktest/mock-tests/${id}/`),
  getQuestions: (testId) => api.get(`/mocktest/mock-tests/${testId}/questions/`),
  createAttempt: (data) => api.post('/mocktest/test-attempts/', data),
  getAttempt: (id) => api.get(`/mocktest/test-attempts/${id}/`),
  getUserAttempts: (params) => api.get('/mocktest/test-attempts/', { params }),
  submitAnswer: (attemptId, data) => api.post(`/mocktest/test-attempts/${attemptId}/submit_answer/`, data),
  submitTest: (attemptId) => api.post(`/mocktest/test-attempts/${attemptId}/submit/`),
  getAttemptAnswers: (attemptId) => api.get(`/mocktest/test-attempts/${attemptId}/answers/`),
  getUnattemptedQuestions: (attemptId) => api.get(`/mocktest/test-attempts/${attemptId}/unattempted/`),
  getExamYears: (examId) => api.get(`/mocktest/exam-years/?exam_id=${examId}`),
  getAvailableQuestionsCount: (params) => api.get('/mocktest/available-questions-count/', { params }),
  generateTest: (data) => api.post('/mocktest/generate-test/', data),
  generateCustomTest: (data) => api.post('/mocktest/custom-test/generate/', data),
  getMistakes: (params) => api.get('/mocktest/mistake-notebook/', { params }),
  updateMistake: (id, data) => api.patch(`/mocktest/mistake-notebook/${id}/`, data),
  generateTestFromMistakes: (data) => api.post('/mocktest/mistake-notebook/generate-test/', data),
  getDailyFocusToday: () => api.get('/mocktest/daily-focus/today/'),
  getDailyFocusMonthly: (params) => api.get('/mocktest/daily-focus/monthly/', { params }),
  getGamificationSummary: () => api.get('/mocktest/gamification/summary/'),
  getTodaysTasks: () => api.get('/mocktest/tasks/'),
  completeTask: (data) => api.post('/mocktest/tasks/complete/', data),
  // Profile APIs
  getProfileOverview: () => api.get('/mocktest/profile/overview/'),
  getProfileBadges: () => api.get('/mocktest/profile/badges/'),
  getActivityHeatmap: (params) => api.get('/mocktest/profile/activity-heatmap/', { params }),
  getProfileAnalytics: () => api.get('/mocktest/profile/analytics/'),
  getPerformanceSummary: () => api.get('/mocktest/performance-summary/'),
  getQuestionsPerformanceOverview: () => api.get('/mocktest/questions-performance-overview/'),
};

// Room (Guild) APIs
export const roomApi = {
  // Room CRUD
  getRooms: (params) => api.get('/mocktest/rooms/', { params }),
  getRoomByCode: (code) => api.get(`/mocktest/rooms/${code}/`),
  createRoom: (data) => api.post('/mocktest/rooms/', data),
  getMyActiveRoom: () => api.get('/mocktest/rooms/my-active-room/'),
  
  // Room actions
  joinRoom: (data) => {
    const { code, password } = data;
    return api.post(`/mocktest/rooms/${code}/join/`, { code, password: password || '' });
  },
  getParticipants: (code) => api.get(`/mocktest/rooms/${code}/participants/`),
  kickParticipant: (code, userId) => api.post(`/mocktest/rooms/${code}/kick/${userId}/`),
  startRoom: (code) => api.post(`/mocktest/rooms/${code}/start/`),
  endRoom: (code) => api.post(`/mocktest/rooms/${code}/end/`),
  getQuestions: (code) => api.get(`/mocktest/rooms/${code}/questions/`),
  getTestSummary: (code, params) => api.get(`/mocktest/rooms/${code}/test-summary/`, { params }),
  previewTestSummary: (params) => api.get('/mocktest/rooms/preview-test-summary/', { params }),
  getLeaderboard: (code) => api.get(`/mocktest/rooms/${code}/leaderboard/`),
  getSubmissionStatus: (code) => api.get(`/mocktest/rooms/${code}/submission-status/`),
  getReview: (code) => api.get(`/mocktest/rooms/${code}/review/`),
  getUnattempted: (code) => api.get(`/mocktest/rooms/${code}/unattempted/`),
  
  // Participant attempts
  submitAnswer: (data) => api.post('/mocktest/participant-attempts/submit/', data),
};

// College Predictor APIs
export const collegePredictorApi = {
  predict: (data) => api.post('/predict-college/', data),
  getExams: () => api.get('/exams/'),
  getCategories: (examId) => api.get(`/get-categories/?type=college${examId ? `&exam_id=${examId}` : ''}`),
};

// Rank Predictor APIs
export const rankPredictorApi = {
  getRankFromScore: (data) => api.post('/get-rank-from-score/', data),
  getExams: () => api.get('/exams/'),
  getCategories: () => api.get('/get-categories/'),
};

// Auth APIs
export const authApi = {
  register: (data) => api.post('/api/auth/register/', data),
  googleLogin: (token, referralCode) => api.post('/api/auth/google-login/', { token, referralCode }),
  updateProfile: (data) => api.post('/api/auth/update-profile/', data),
  getCurrentUser: () => api.get('/api/auth/me/'),
  // Referral APIs
      activateReferral: (referredUserId) => api.post('/api/auth/referral/activate/', { referredUserId }),
      processReferralCode: (referralCode) => api.post('/api/auth/referral/process/', { referral_code: referralCode }),
      getReferralStats: () => api.get('/api/auth/referral/stats/'),
      getReferees: () => api.get('/api/auth/referee/'),
      sendOTP: (phone) => api.post('/api/auth/send-otp/', { phone }),
      verifyOTP: (phone, otp) => api.post('/api/auth/verify-otp/', { phone, otp }),
      // Notification APIs
      getNotifications: (params) => api.get('/api/auth/notifications/', { params }),
      markNotificationRead: (notificationId) => api.post(`/api/auth/notifications/${notificationId}/read/`),
      markAllNotificationsRead: () => api.post('/api/auth/notifications/read-all/'),
};

export default api;

