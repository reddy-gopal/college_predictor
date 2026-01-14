import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials removed - not using session-based auth, using default user workaround
});

// Add request interceptor to include auth token if available
api.interceptors.request.use(
  (config) => {
    // Try to get auth token from localStorage
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          // If using token-based auth, add token to headers
          if (userData.token) {
            config.headers.Authorization = `Token ${userData.token}`;
          } else if (userData.access_token) {
            config.headers.Authorization = `Bearer ${userData.access_token}`;
          }
          // For session-based auth, withCredentials is already set
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
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
      // Clear user data and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('userStats');
        localStorage.removeItem('activity');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Mock Test APIs
export const mockTestApi = {
  getAll: () => api.get('/mocktest/mock-tests/'),
  getById: (id) => api.get(`/mocktest/mock-tests/${id}/`),
  getQuestions: (testId) => api.get(`/mocktest/mock-tests/${testId}/questions/`),
  createAttempt: (data) => api.post('/mocktest/test-attempts/', data),
  getAttempt: (id) => api.get(`/mocktest/test-attempts/${id}/`),
  submitAnswer: (attemptId, data) => api.post(`/mocktest/test-attempts/${attemptId}/submit_answer/`, data),
  submitTest: (attemptId) => api.post(`/mocktest/test-attempts/${attemptId}/submit/`),
  getAttemptAnswers: (attemptId) => api.get(`/mocktest/test-attempts/${attemptId}/answers/`),
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

export default api;

