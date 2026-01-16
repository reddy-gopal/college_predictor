'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setAuthToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const router = useRouter();

  // Fetch current user from backend
  const fetchCurrentUser = useCallback(async (authToken) => {
    try {
      // Set token synchronously before making request
      if (authToken) {
        setAuthToken(authToken); // Set token in API module first
        setToken(authToken); // Also set in state
      }
      
      // Small delay to ensure token is set (safety measure)
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await authApi.getCurrentUser();
      const userData = response.data.user;
      
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching current user:', error);
      // If 401/403, user is not authenticated
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null);
        setToken(null);
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_token');
        }
      }
      throw error;
    }
  }, []); // No dependencies - token is set before calling

  // Initialize: Check for token in memory (from login) and fetch user
  useEffect(() => {
    const initAuth = async () => {
      // Check if we have a token in memory (from recent login)
      // Check for token in sessionStorage (only for page refresh)
      // This is a temporary measure - ideally token should be in httpOnly cookie
      let sessionToken = null;
      if (typeof window !== 'undefined') {
        sessionToken = sessionStorage.getItem('auth_token');
      }

      if (!token && !sessionToken) {
        setLoading(false);
        return;
      }

      const tokenToUse = token || sessionToken;
      setToken(tokenToUse);
      setAuthToken(tokenToUse);

      // Fetch user data from backend
      try {
        await fetchCurrentUser(tokenToUse);
      } catch (error) {
        // User not authenticated or token expired
        setUser(null);
        setToken(null);
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_token');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []); // Only run on mount

  const login = async (userData, authToken) => {
    // Set token FIRST - this must happen before any API calls
    setAuthToken(authToken); // Set token in API module immediately
    setToken(authToken);
    
    // Store in sessionStorage for page refresh (temporary)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_token', authToken);
    }
    
    // Use user data from login response
    setUser(userData);
  };

  const loginWithGoogle = async (userData, authToken) => {
    // Set token FIRST - this must happen before any API calls
    setAuthToken(authToken); // Set token in API module immediately
    setToken(authToken);
    
    // Store in sessionStorage for page refresh (temporary)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_token', authToken);
    }
    
    // Use user data from login response (already includes StudentProfile from backend)
    setUser(userData);
    
    // Don't fetch again immediately - we already have the data from login response
    // The user data from google_login endpoint already includes StudentProfile
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null); // Clear token from API module
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
    }
    router.push('/login');
  };

  const updateUser = async (updates) => {
    // Optimistically update local state
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Fetch fresh data from backend to ensure consistency
    try {
      await fetchCurrentUser(token);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const refreshUser = useCallback(async () => {
    if (token) {
      try {
        await fetchCurrentUser(token);
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  }, [token, fetchCurrentUser]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      token,
      login, 
      loginWithGoogle, 
      logout, 
      updateUser,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
