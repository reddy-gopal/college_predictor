'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi, authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get('phone') || '';

  const [formData, setFormData] = useState({
    full_name: '',
    phone: prefillPhone,
    class_level: '',
    exam_target: '',
    preferred_branches: [],
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, loginWithGoogle } = useAuth();
  const googleInitialized = useRef(false);
  const buttonContainerRef = useRef(null);

  useEffect(() => {
    if (prefillPhone) {
      setFormData((prev) => ({ ...prev, phone: prefillPhone }));
    }
  }, [prefillPhone]);

  const handleGoogleResponse = useCallback(async (response) => {
    setError(null);
    setGoogleLoading(true);

    try {
      // Send credential to backend
      const result = await authApi.googleLogin(response.credential);
      
      const { user, token, refresh, is_new_user } = result.data;

      // Save to AuthContext with token
      await loginWithGoogle(user, token);

      // Redirect based on whether user is new
      if (is_new_user) {
        router.push('/onboarding-preferences');
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to sign in with Google. Please try again.'
      );
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, router]);

  useEffect(() => {
    // Initialize Google Sign-In when component mounts and SDK is loaded
    const initGoogleSignIn = () => {
      if (typeof window === 'undefined' || !window.google || !window.google.accounts) {
        return;
      }

      // Check if accounts.id is available
      if (!window.google.accounts.id) {
        console.log('Google accounts.id not available yet, waiting...');
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
        return;
      }

      if (googleInitialized.current) {
        return;
      }

      try {
        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        // Render the button using ref or getElementById
        const buttonContainer = buttonContainerRef.current || document.getElementById('google-signin-button-register');
        if (buttonContainer && !buttonContainer.hasChildNodes()) {
          // Only render if container is empty to avoid conflicts
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            type: 'standard',
            text: 'signup_with',
          });
        }

        googleInitialized.current = true;
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    };

    // Check if Google SDK is already loaded
    if (window.google && window.google.accounts) {
      // Give it a small delay to ensure accounts.id is available
      setTimeout(() => {
        initGoogleSignIn();
      }, 100);
    } else {
      // Wait for SDK to load
      const checkGoogleSDK = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogleSDK);
          // Give it a small delay to ensure accounts.id is available
          setTimeout(() => {
            initGoogleSignIn();
          }, 100);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleSDK), 10000);
      
      // Cleanup on unmount
      return () => {
        clearInterval(checkGoogleSDK);
        // Don't try to remove Google's button - let it handle its own cleanup
      };
    }
  }, [handleGoogleResponse]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchToggle = (branch) => {
    setFormData((prev) => {
      const branches = prev.preferred_branches || [];
      const newBranches = branches.includes(branch)
        ? branches.filter((b) => b !== branch)
        : [...branches, branch];
      return { ...prev, preferred_branches: newBranches };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: Call registration API
      // For now, redirect to onboarding since registration API is not implemented
      // The user will complete onboarding which will create their profile
      router.push('/onboarding-preferences');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
      setLoading(false);
    }
  };

  const commonBranches = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">CP</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">
              Let's get you started on your preparation journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Enter your full name"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                required
                className="input-field"
                placeholder="Enter your 10-digit phone number"
              />
            </div>

            <div>
              <label
                htmlFor="class_level"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Class Level *
              </label>
              <select
                id="class_level"
                name="class_level"
                value={formData.class_level}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select class level</option>
                <option value="class_11">Class 11</option>
                <option value="class_12">Class 12</option>
                <option value="dropper">Dropper</option>
                <option value="graduate">Graduate</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="exam_target"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Exam Target *
              </label>
              <select
                id="exam_target"
                name="exam_target"
                value={formData.exam_target}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select your target exam</option>
                <option value="jee_main">JEE Main</option>
                <option value="jee_advanced">JEE Advanced</option>
                <option value="neet">NEET</option>
                <option value="eapcet">EAPCET</option>
                <option value="bitsat">BITSAT</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Preferred Branches (Optional)
              </label>
              <div className="flex flex-wrap gap-3">
                {commonBranches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => handleBranchToggle(branch.toLowerCase())}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.preferred_branches?.includes(
                        branch.toLowerCase()
                      )
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy
            </p>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div 
            id="google-signin-button-register" 
            ref={buttonContainerRef}
            className="w-full min-h-[40px]"
          ></div>
          {googleLoading && (
            <div className="w-full border-2 border-gray-300 rounded-lg px-6 py-3 font-semibold text-gray-700 bg-gray-50 flex items-center justify-center gap-3 mt-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
              <span>Signing up...</span>
            </div>
          )}

          <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:text-primary-dark"
                >
                  Sign in
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}

