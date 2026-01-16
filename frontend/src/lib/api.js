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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear token from memory
      authToken = null;
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
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
  googleLogin: (token) => api.post('/api/auth/google-login/', { token }),
  updateProfile: (data) => api.post('/api/auth/update-profile/', data),
  getCurrentUser: () => api.get('/api/auth/me/'),
};

export default api;

