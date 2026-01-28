'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ScholarshipApi } from '@/lib/api';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const STREAMS = ['Science', 'Commerce', 'Arts', 'Other'];
const BOARDS = ['CBSE', 'ICSE', 'State', 'IB', 'IGCSE', 'Other'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'Other'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const FAMILY_INCOME_RANGES = [
  '₹0 – ₹1,00,000',
  '₹1,00,000 – ₹2,50,000',
  '₹2,50,000 – ₹5,00,000',
  '₹5,00,000 – ₹10,00,000',
  '₹10,00,000+',
];

export default function ScholarshipOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    stream: '',
    board: '',
    state: '',
    category: '',
    family_income_range: '',
    gender: '',
    age: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchOnboardingData();
    }
  }, [user, authLoading, router]);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ScholarshipApi.getOnboarding();
      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        setFormData({
          stream: data.stream || '',
          board: data.board || '',
          state: data.state || '',
          category: data.category || '',
          family_income_range: data.family_income_range || '',
          gender: data.gender || '',
          age: data.age?.toString() || '',
        });
      }
    } catch (err) {
      // If 404, user hasn't created onboarding yet - that's fine
      if (err.response?.status !== 404) {
        console.error('Error fetching onboarding data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.stream || !formData.board || !formData.state || 
        !formData.category || !formData.family_income_range || 
        !formData.gender || !formData.age) {
      setError('Please fill in all fields');
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 100) {
      setError('Please enter a valid age (1-100)');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        age: ageNum,
      };

      // Create or update onboarding (backend handles both)
      await ScholarshipApi.createOrUpdateOnboarding(payload);

      setSuccess(true);
      // Redirect to scholarships page after 2 seconds
      setTimeout(() => {
        router.push('/scholarships');
      }, 2000);
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      setError(err.response?.data?.detail || 'Failed to save onboarding data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-niat-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Scholarship Onboarding
            </h1>
            <p className="text-lg text-gray-600">
              Help us personalize scholarship recommendations for you
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">✓ Onboarding data saved successfully! Redirecting to scholarships...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Stream */}
            <div>
              <label htmlFor="stream" className="block text-sm font-semibold text-gray-700 mb-2">
                Stream <span className="text-red-500">*</span>
              </label>
              <select
                id="stream"
                name="stream"
                value={formData.stream}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Stream</option>
                {STREAMS.map((stream) => (
                  <option key={stream} value={stream}>
                    {stream}
                  </option>
                ))}
              </select>
            </div>

            {/* Board */}
            <div>
              <label htmlFor="board" className="block text-sm font-semibold text-gray-700 mb-2">
                Board <span className="text-red-500">*</span>
              </label>
              <select
                id="board"
                name="board"
                value={formData.board}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Board</option>
                {BOARDS.map((board) => (
                  <option key={board} value={board}>
                    {board}
                  </option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Family Income Range */}
            <div>
              <label htmlFor="family_income_range" className="block text-sm font-semibold text-gray-700 mb-2">
                Family Income Range <span className="text-red-500">*</span>
              </label>
              <select
                id="family_income_range"
                name="family_income_range"
                value={formData.family_income_range}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Income Range</option>
                {FAMILY_INCOME_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Gender</option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                required
                min="1"
                max="100"
                className="input-field"
                placeholder="Enter your age"
              />
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'Saving...' : 'Save & Continue'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/scholarships')}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Skip for Now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

