'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

const commonBranches = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];

export default function OnboardingPreferencesPage() {
  const router = useRouter();
  const { user, updateUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    phone: '',
    class_level: '',
    exam_target: '',
    target_rank: '',
    tests_per_week: '',
    preferred_branches: [],
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        phone: user.phone || '',
        class_level: user.class_level || '',
        exam_target: user.exam_target || '',
        preferred_branches: user.preferred_branches ?
          (typeof user.preferred_branches === 'string' ? user.preferred_branches.split(',') : user.preferred_branches)
          : [],
      }));
    }
  }, [user]);

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

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare data for backend - include ALL fields
      const backendData = {
        phone: formData.phone,
        class_level: formData.class_level,
        exam_target: formData.exam_target,
        target_rank: formData.target_rank ? parseInt(formData.target_rank) : null,
        tests_per_week: formData.tests_per_week || null,
        preferred_branches: Array.isArray(formData.preferred_branches)
          ? formData.preferred_branches.join(',')
          : formData.preferred_branches,
      };

      // Save to backend - this will create/update StudentProfile
      await authApi.updateProfile(backendData);

      // Refresh user data from backend to get latest StudentProfile
      await refreshUser();

      router.push('/');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Personal Details (Phone, Class)
  const renderStep1 = () => (
    <div className="space-y-5 animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              phone: e.target.value.replace(/\D/g, '').slice(0, 10),
            }))
          }
          className="input-field"
          placeholder="Enter 10-digit number"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Class Level *
        </label>
        <select
          name="class_level"
          value={formData.class_level}
          onChange={handleChange}
          className="input-field"
        >
          <option value="">Select class level</option>
          <option value="class_11">Class 11</option>
          <option value="class_12">Class 12</option>
          <option value="dropper">Dropper</option>
          <option value="graduate">Graduate</option>
        </select>
      </div>
    </div>
  );

  // Render Step 2: Exam & Branches
  const renderStep2 = () => (
    <div className="space-y-5 animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-900">Goals & Preferences</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Target Exam *
        </label>
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
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Preferred Branches (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {commonBranches.map((branch) => (
            <button
              key={branch}
              type="button"
              onClick={() => handleBranchToggle(branch.toLowerCase())}
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-all ${formData.preferred_branches?.includes(branch.toLowerCase())
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {branch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Step 3: Strategy (Gamification)
  const renderStep3 = () => (
    <div className="space-y-5 animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-900">Study Strategy</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Target Rank/Score Goal
        </label>
        <input
          type="number"
          name="target_rank"
          value={formData.target_rank}
          onChange={handleChange}
          placeholder="e.g. 1000"
          className="input-field"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tests Per Week
        </label>
        <div className="space-y-2">
          {['1-2 tests', '3-5 tests', 'Daily practice'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData(p => ({ ...p, tests_per_week: option }))}
              className={`w-full p-3 rounded-lg border text-left transition-all ${formData.tests_per_week === option
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const canProceed = () => {
    if (step === 1) return formData.phone && formData.phone.length === 10 && formData.class_level;
    if (step === 2) return formData.exam_target;
    if (step === 3) return true; // Optional
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(step / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="card min-h-[400px] flex flex-col justify-between">
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Let's get to know you
              </h1>
              <p className="text-gray-600 text-sm">
                Customizing your prep journey...
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </div>

          <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className="btn-primary flex-1"
            >
              {loading
                ? 'Saving...'
                : step === totalSteps
                  ? 'Complete Setup'
                  : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

