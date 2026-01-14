'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, saveUserProfile } from '@/lib/gamification';

const steps = [
  {
    question: "What exam are you preparing for?",
    type: 'exam',
    field: 'target_exam',
  },
  {
    question: "What's your target score/rank goal?",
    type: 'number',
    field: 'target_rank',
    placeholder: 'Enter your target rank',
  },
  {
    question: "How many tests do you plan per week?",
    type: 'options',
    field: 'tests_per_week',
    options: ['1-2 tests', '3-5 tests', 'Daily practice'],
  },
];

export default function OnboardingPreferencesPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    target_exam: '',
    target_rank: '',
    tests_per_week: '',
  });
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();

  const currentQuestion = steps[currentStep];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionSelect = (value) => {
    setFormData((prev) => ({ ...prev, [currentQuestion.field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: Save preferences to backend
    // Update user profile with preferences
    const profile = getUserProfile();
    const updatedProfile = {
      ...profile,
      preferences: formData,
      testsPerWeek: formData.tests_per_week,
      targetRank: formData.target_rank,
      targetExam: formData.target_exam,
    };
    saveUserProfile(updatedProfile);
    updateUser(updatedProfile);
    
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  const canProceed = () => {
    return formData[currentQuestion.field] !== '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {currentQuestion.question}
            </h1>
            <p className="text-gray-600 text-sm">
              Help us personalize your experience
            </p>
          </div>

          <div className="space-y-6">
            {currentQuestion.type === 'exam' && (
              <select
                name={currentQuestion.field}
                value={formData[currentQuestion.field]}
                onChange={handleChange}
                className="input-field"
                autoFocus
              >
                <option value="">Select exam</option>
                <option value="jee_main">JEE Main</option>
                <option value="jee_advanced">JEE Advanced</option>
                <option value="neet">NEET</option>
                <option value="eapcet">EAPCET</option>
                <option value="bitsat">BITSAT</option>
              </select>
            )}

            {currentQuestion.type === 'number' && (
              <input
                type="number"
                name={currentQuestion.field}
                value={formData[currentQuestion.field]}
                onChange={handleChange}
                placeholder={currentQuestion.placeholder}
                className="input-field text-center text-2xl"
                min="1"
                autoFocus
              />
            )}

            {currentQuestion.type === 'options' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData[currentQuestion.field] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{option}</span>
                      {formData[currentQuestion.field] === option && (
                        <span className="text-primary">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="btn-secondary flex-1"
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
                  ? 'Setting up...'
                  : currentStep === steps.length - 1
                  ? 'Complete Setup'
                  : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

