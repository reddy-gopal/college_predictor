'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    exam_target: '',
    target_rank: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        exam_target: user.exam_target || '',
        target_rank: user.target_rank || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        exam_target: formData.exam_target,
        target_rank: formData.target_rank ? parseInt(formData.target_rank) : null,
        phone: formData.phone,
      });

      await refreshUser();
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-niat-text-secondary mb-4">Please log in to edit your profile.</p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-white">
      <div className="section-container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="card bg-white mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-niat-text">Edit Profile</h1>
              <button
                onClick={() => router.push('/profile')}
                className="btn-secondary"
              >
                Back to Profile
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="card bg-white">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-niat-text mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="input-field w-full"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-niat-text mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="input-field w-full"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-niat-text mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Exam Target */}
                <div>
                  <label className="block text-sm font-semibold text-niat-text mb-2">
                    Target Exam
                  </label>
                  <select
                    name="exam_target"
                    value={formData.exam_target}
                    onChange={handleChange}
                    className="input-field w-full"
                  >
                    <option value="">Select target exam</option>
                    <option value="jee_main">JEE Main</option>
                    <option value="jee_advanced">JEE Advanced</option>
                    <option value="neet">NEET</option>
                    <option value="eapcet">EAPCET</option>
                    <option value="bitsat">BITSAT</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Target Rank */}
                <div>
                  <label className="block text-sm font-semibold text-niat-text mb-2">
                    Target Rank
                  </label>
                  <input
                    type="number"
                    name="target_rank"
                    value={formData.target_rank}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="Enter target rank"
                    min="1"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t border-niat-border">
                  <button
                    type="button"
                    onClick={() => router.push('/profile')}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

