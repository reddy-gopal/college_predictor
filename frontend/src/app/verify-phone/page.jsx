'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const redirectPath = searchParams.get('redirect') || '/';

  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Pre-fill phone if user has one
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user, router]);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setOtpLoading(true);
    setError(null);

    try {
      await authApi.sendOTP(phone);
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
    if (!otp || otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      await authApi.verifyOTP(phone, otp);
      
      // Refresh user data to get updated verification status
      await refreshUser();
      
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Phone number verified successfully!', 'success');
      }
      
      // Redirect to the intended page
      router.push(redirectPath);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">📱</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Verify Your Phone Number
            </h1>
            <p className="text-gray-600">
              Please verify your phone number to access tests and features
            </p>
          </div>

          <div className="space-y-5">
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
                  value={phone}
                  onChange={(e) => {
                    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(newPhone);
                    if (newPhone !== phone) {
                      setOtpSent(false);
                      setOtp('');
                    }
                  }}
                  required
                  disabled={otpSent}
                  className="input-field flex-1"
                  placeholder="Enter your 10-digit phone number"
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={phone.length !== 10 || otpLoading || otpSent}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {otpLoading ? 'Sending...' : otpSent ? 'Sent ✓' : 'Send OTP'}
                </button>
              </div>
            </div>

            {otpSent && (
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
                     disabled={otp.length !== 4 || verifying}
                     className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                   >
                     {verifying ? 'Verifying...' : 'Verify'}
                   </button>
                 </div>
                <p className="text-xs text-gray-500 mt-1">
                  OTP sent to {phone}. Use code: <strong>0000</strong>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

