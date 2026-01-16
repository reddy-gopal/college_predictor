'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    exam_target: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        exam_target: user.exam_target || '',
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
      // Update profile with new name and exam target
      await authApi.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        exam_target: formData.exam_target,
      });

      // Refresh user data
      await refreshUser();
      
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        exam_target: user.exam_target || '',
      });
    }
    setEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (!user) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
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

  const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-primary"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="card">
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
              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                  {user.google_picture ? (
                    <img
                      src={user.google_picture}
                      alt={fullName}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span>{fullName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {editing ? 'Edit Profile' : fullName}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Enter first name"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">
                        {user.first_name || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Enter last name"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">
                        {user.last_name || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Exam Target */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target Exam
                  </label>
                  {editing ? (
                    <select
                      name="exam_target"
                      value={formData.exam_target}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="">Select target exam</option>
                      <option value="jee_main">JEE Main</option>
                      <option value="jee_advanced">JEE Advanced</option>
                      <option value="neet">NEET</option>
                      <option value="eapcet">EAPCET</option>
                      <option value="bitsat">BITSAT</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 py-2">
                      {user.exam_target
                        ? user.exam_target
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                        : 'Not set'}
                    </p>
                  )}
                </div>

                {/* Read-only fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class Level
                    </label>
                    <p className="text-gray-900 py-2">
                      {user.class_level
                        ? user.class_level
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <p className="text-gray-900 py-2">
                      {user.phone || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Target Rank
                    </label>
                    <p className="text-gray-900 py-2">
                      {user.target_rank || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Total XP
                    </label>
                    <p className="text-gray-900 py-2">
                      {user.total_xp || 0} XP
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {editing && (
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCancel}
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
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

