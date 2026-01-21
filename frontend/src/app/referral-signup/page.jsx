'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

const referralSources = [
  'Friend/Family Referral',
  'Social Media (Instagram, Facebook, etc.)',
  'Google Search',
  'YouTube',
  'Advertisement',
  'School/College',
  'Other',
];

export default function ReferralSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const referralCodeFromUrl = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({
    referral_source: '',
    referral_code: referralCodeFromUrl,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Auto-fill referral code from URL if present
    if (referralCodeFromUrl) {
      setFormData((prev) => ({ ...prev, referral_code: referralCodeFromUrl.toUpperCase().trim() }));
    }
  }, [user, router, referralCodeFromUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Process referral code if provided
      if (formData.referral_code && formData.referral_code.trim()) {
        try {
          await authApi.processReferralCode(formData.referral_code.trim().toUpperCase());
        } catch (err) {
          // If processing fails, show error but continue
          const errorMsg = err.response?.data?.detail || 'Invalid referral code';
          setError(errorMsg);
          setLoading(false);
          return;
        }
      }

      // Update user profile with referral source (if we have a field for it)
      // For now, we'll just process the referral code
      // You can add referral_source field to user model if needed

      // Refresh user data
      await refreshUser();

      // Redirect to onboarding
      router.push('/onboarding-preferences');
    } catch (err) {
      console.error('Error updating referral info:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        'Failed to save information. Please try again.'
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
              <span className="text-white font-bold text-2xl">🎁</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              How did you find us?
            </h1>
            <p className="text-gray-600">
              Help us understand how you discovered our platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="referral_source"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                How did you find our site? *
              </label>
              <select
                id="referral_source"
                name="referral_source"
                value={formData.referral_source}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select an option</option>
                {referralSources.map((source) => (
                  <option key={source} value={source.toLowerCase().replace(/[^a-z0-9]/g, '_')}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="referral_code"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Referral Code (Optional)
              </label>
              <input
                type="text"
                id="referral_code"
                name="referral_code"
                value={formData.referral_code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    referral_code: e.target.value.toUpperCase().trim(),
                  }))
                }
                className="input-field"
                placeholder="Enter referral code (if you have one)"
                maxLength={20}
              />
              {formData.referral_code && (
                <p className="text-xs text-gray-500 mt-1">
                  🎁 You'll earn rewards when you complete registration!
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                If you were referred by someone, enter their referral code here
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/onboarding-preferences')}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

