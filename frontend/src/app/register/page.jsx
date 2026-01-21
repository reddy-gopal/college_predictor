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
  const referralCodeFromUrl = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({
    full_name: '',
    phone: prefillPhone,
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
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
      // Referral code will be handled in referral-signup page
      // Send credential to backend without referral code for now
      const result = await authApi.googleLogin(response.credential, '');
      
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

  const handleSendOTP = async () => {
    if (formData.phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setOtpLoading(true);
    setError(null);

    try {
      await authApi.sendOTP(formData.phone);
      setOtpSent(true);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('OTP sent successfully! Use code: 0000', 'success');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.verifyOTP(formData.phone, otp);
      setPhoneVerified(true);
      setOtpSent(false);
      setOtp('');
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Phone number verified successfully!', 'success');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Check if phone is verified
    if (!phoneVerified) {
      setError('Please verify your phone number before registering');
      return;
    }

    setLoading(true);

    try {
      // Call registration API
      const registrationData = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        is_phone_verified: phoneVerified,  // Pass verification status
        // Referral code will be handled in referral-signup page
      };

      const response = await authApi.register(registrationData);
      
      const { user, token, refresh } = response.data;

      // Save token and login user
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_token', token);
        sessionStorage.setItem('refresh_token', refresh);
      }

      // Update auth context
      await login(user, token);

      // Redirect to referral signup page first
      router.push('/referral-signup');
    } catch (err) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Registration failed. Please try again.'
      );
      setLoading(false);
    }
  };

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
              <div className="flex gap-2">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData((prev) => ({ ...prev, phone: newPhone }));
                    // Reset verification if phone changes
                    if (newPhone !== formData.phone) {
                      setPhoneVerified(false);
                      setOtpSent(false);
                      setOtp('');
                    }
                  }}
                  required
                  disabled={phoneVerified}
                  className="input-field flex-1"
                  placeholder="Enter your 10-digit phone number"
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={formData.phone.length !== 10 || otpLoading || phoneVerified}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {otpLoading ? 'Sending...' : phoneVerified ? '✓ Verified' : 'Send OTP'}
                </button>
              </div>
              {phoneVerified && (
                <p className="text-xs text-green-600 mt-1">✓ Phone number verified</p>
              )}
            </div>

            {otpSent && !phoneVerified && (
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Enter OTP *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="input-field flex-1"
                    placeholder="Enter 4-digit OTP"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 4 || loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Verify
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  OTP sent to {formData.phone}. Use code: <strong>0000</strong>
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input-field"
                placeholder="Enter a password (min 6 characters)"
              />
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

