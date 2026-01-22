'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi, authApi } from '@/lib/api';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleSDKReady, setGoogleSDKReady] = useState(false);
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const googleInitialized = useRef(false);
  const buttonContainerRef = useRef(null);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: Call OTP send API
      // await mockTestApi.sendOTP({ phone });
      // For now, simulate OTP send
      setTimeout(() => {
        setOtpSent(true);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: Call OTP verify API
      // const response = await mockTestApi.verifyOTP({ phone, otp });
      // For now, simulate login - check if user exists
      const existingUser = localStorage.getItem('user');
      if (existingUser) {
        const userData = JSON.parse(existingUser);
        login(userData);
        router.push('/'); // Redirect to home (which will show dashboard)
      } else {
        router.push('/register?phone=' + encodeURIComponent(phone));
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleResponse = useCallback(async (response) => {
    // Get referral code from URL params if present
    const searchParams = new URLSearchParams(window.location.search);
    const referralCode = searchParams.get('ref') || '';
    setError(null);
    setGoogleLoading(true);

    try {
      // Send credential to backend with referral code
      const result = await authApi.googleLogin(response.credential, referralCode);
      
      const { user, token, refresh, is_new_user } = result.data;

      // Save to AuthContext with token
      await loginWithGoogle(user, token);

      // Redirect based on whether user is new
      if (is_new_user) {
        router.push('/referral-signup');
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
      if (typeof window === 'undefined') {
        return false;
      }

      if (!window.google || !window.google.accounts) {
        console.log('Google SDK not loaded yet');
        return false;
      }

      // Check if accounts.id is available
      if (!window.google.accounts.id) {
        console.log('Google accounts.id not available yet');
        return false;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
        return false;
      }

      if (googleInitialized.current) {
        console.log('Google already initialized');
        return true;
      }

      try {
        // Get the button container - try ref first, then getElementById
        let buttonContainer = buttonContainerRef.current;
        if (!buttonContainer) {
          buttonContainer = document.getElementById('google-signin-button');
        }
        
        if (!buttonContainer) {
          console.error('Button container not found. Retrying...');
          // Retry after a short delay
          setTimeout(() => {
            const retryContainer = buttonContainerRef.current || document.getElementById('google-signin-button');
            if (retryContainer) {
              initGoogleSignIn();
            }
          }, 500);
          return false;
        }

        // Check if Google button is already rendered (has iframe or button element)
        const hasGoogleButton = buttonContainer.querySelector('iframe') || 
                               buttonContainer.querySelector('[role="button"]') ||
                               buttonContainer.querySelector('.google-signin-button');
        
        if (hasGoogleButton) {
          console.log('Google button already rendered');
          setGoogleSDKReady(true);
          googleInitialized.current = true;
          return true;
        }

        // Clear any loading text
        buttonContainer.innerHTML = '';

        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        // Render the button
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          type: 'standard',
          text: 'signin_with',
        });

        console.log('Google Sign-In button rendered successfully');
        setGoogleSDKReady(true);
        googleInitialized.current = true;
        return true;
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
        return false;
      }
    };

    // Try to initialize immediately if SDK is ready
    if (window.google && window.google.accounts && window.google.accounts.id) {
      const timer = setTimeout(() => {
        initGoogleSignIn();
      }, 200);
      return () => clearTimeout(timer);
    }

    // Wait for SDK to load
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    
    const checkGoogleSDK = setInterval(() => {
      attempts++;
      
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(checkGoogleSDK);
        // Try multiple times with delays to ensure it works
        setTimeout(() => {
          if (!initGoogleSignIn()) {
            setTimeout(() => initGoogleSignIn(), 300);
          }
        }, 200);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGoogleSDK);
        console.error('Google SDK failed to load after 10 seconds');
        console.log('window.google:', !!window.google);
        console.log('window.google.accounts:', !!window.google?.accounts);
        console.log('window.google.accounts.id:', !!window.google?.accounts?.id);
        console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearInterval(checkGoogleSDK);
    };
  }, [handleGoogleResponse]);


  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 pt-24 pb-6">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">📱</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Enter OTP
              </h1>
              <p className="text-gray-600">
                We sent a 6-digit code to{' '}
                <span className="font-semibold">{phone}</span>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  OTP Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="input-field text-center text-2xl tracking-widest font-bold"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full text-lg py-4"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-sm text-primary hover:text-primary-dark text-center w-full"
              >
                Change phone number
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 pt-24 pb-6">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img 
                src="/niat.png" 
                alt="NIAT Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back!
            </h1>
            <p className="text-gray-600">
              Sign in to continue your preparation journey
            </p>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                className="input-field"
                placeholder="Enter your 10-digit phone number"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Sending OTP...' : 'Continue with Phone'}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div 
            id="google-signin-button" 
            ref={buttonContainerRef}
            className="w-full min-h-[40px]"
          ></div>
          {!googleSDKReady && !googleLoading && (
            <div className="w-full min-h-[40px] flex items-center justify-center mt-2">
              <div className="text-sm text-gray-500">Loading Google Sign-In...</div>
            </div>
          )}
          {googleLoading && (
            <div className="w-full border-2 border-gray-300 rounded-lg px-6 py-3 font-semibold text-gray-700 bg-gray-50 flex items-center justify-center gap-3 mt-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-primary font-semibold hover:text-primary-dark"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

