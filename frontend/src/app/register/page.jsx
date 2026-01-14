'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { initializeUserData } from '@/lib/gamification';
import { mockTestApi } from '@/lib/api';

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
  const [error, setError] = useState(null);
  const { login } = useAuth();

  useEffect(() => {
    if (prefillPhone) {
      setFormData((prev) => ({ ...prev, phone: prefillPhone }));
    }
  }, [prefillPhone]);

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
      // const response = await mockTestApi.register(formData);
      // For now, simulate registration
      const userData = {
        ...formData,
        id: Date.now(), // Temporary ID
        created_at: new Date().toISOString(),
      };
      login(userData);
      
      // Initialize gamification data
      initializeUserData(userData);
      
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
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy
            </p>

            <div className="text-center">
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
          </form>
        </div>
      </div>
    </div>
  );
}

