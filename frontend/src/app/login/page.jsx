'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi } from '@/lib/api';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login } = useAuth();

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

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    alert('Google login coming soon!');
  };

  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">CP</span>
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

          <button
            onClick={handleGoogleLogin}
            className="w-full border-2 border-gray-300 rounded-lg px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

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

