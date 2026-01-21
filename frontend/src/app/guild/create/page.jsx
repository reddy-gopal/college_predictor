'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi, mockTestApi, authApi } from '@/lib/api';
import Link from 'next/link';

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    exam: '',
    subject_mode: 'random',
    subjects: [],
    number_of_questions: 10,
    time_per_question: 2.0,
    time_buffer: 2,
    difficulty: 'mixed',
    question_types: [],
    question_type_mix: 'mixed',
    randomization_mode: 'question_order',
    privacy: 'public',
    password: '',
    participant_limit: 0,
    allow_pause: false,
    start_time: 'now',
    scheduled_time: '',
  });
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [roomCredits, setRoomCredits] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    // Only redirect if auth has finished loading and user is still null
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchExams();
    fetchUserCredits();
  }, [user, authLoading, router]);

  const fetchUserCredits = async () => {
    if (!user) return;
    try {
      const response = await authApi.getCurrentUser();
      setRoomCredits(response.data.user.room_credits || 0);
    } catch (err) {
      console.error('Error fetching user credits:', err);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await mockTestApi.getExams();
      setExams(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubjectToggle = (subject) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const calculateDuration = () => {
    return Math.ceil(formData.number_of_questions * formData.time_per_question);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.exam) {
      newErrors.exam = 'Exam is required';
    }
    if (formData.subject_mode === 'specific' && formData.subjects.length === 0) {
      newErrors.subjects = 'At least one subject is required';
    }
    if (formData.number_of_questions <= 0) {
      newErrors.number_of_questions = 'Number of questions must be greater than 0';
    }
    if (formData.time_per_question <= 0) {
      newErrors.time_per_question = 'Time per question must be greater than 0';
    }
    if (formData.privacy === 'private' && !formData.password) {
      newErrors.password = 'Password is required for private rooms';
    }
    if (formData.start_time === 'scheduled' && !formData.scheduled_time) {
      newErrors.scheduled_time = 'Scheduled time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = async () => {
    if (!validateForm()) return;

    try {
      const params = {
        exam_id: formData.exam,
        subject_mode: formData.subject_mode,
        number_of_questions: formData.number_of_questions,
        time_per_question: formData.time_per_question,
        difficulty: formData.difficulty,
        question_type_mix: formData.question_type_mix,
      };

      if (formData.subject_mode === 'specific') {
        params.subjects = formData.subjects;
      }
      if (formData.question_types.length > 0) {
        params.question_types = formData.question_types;
      }

      const response = await roomApi.previewTestSummary(params);
      setSummary(response.data);
      setShowSummary(true);
    } catch (err) {
      console.error('Error fetching summary:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to generate preview';
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(errorMsg, 'error');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const submitData = {
        exam: parseInt(formData.exam),
        subject_mode: formData.subject_mode,
        number_of_questions: parseInt(formData.number_of_questions),
        time_per_question: parseFloat(formData.time_per_question),
        time_buffer: parseInt(formData.time_buffer),
        difficulty: formData.difficulty,
        question_type_mix: formData.question_type_mix,
        randomization_mode: formData.randomization_mode,
        privacy: formData.privacy,
        participant_limit: parseInt(formData.participant_limit) || 0,
        allow_pause: formData.allow_pause,
        start_time: formData.start_time === 'now' 
          ? new Date().toISOString() 
          : new Date(formData.scheduled_time).toISOString(),
      };

      if (formData.subject_mode === 'specific') {
        submitData.subjects = formData.subjects;
      }
      if (formData.question_types.length > 0) {
        submitData.question_types = formData.question_types;
      }
      if (formData.privacy === 'private') {
        submitData.password = formData.password;
      }

      const response = await roomApi.createRoom(submitData);
      
      console.log('Room creation response:', response);
      
      // Check if response has the room code
      if (!response?.data?.code) {
        console.error('Room creation response missing code:', response);
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('Room created but code not found. Please try again.', 'error');
        }
        return;
      }
      
      const roomCode = response.data.code;
      console.log('Navigating to room lobby:', `/guild/${roomCode}/lobby`);
      
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('Room created successfully!', 'success');
      }
      
      // Navigate to room lobby after a brief delay to ensure toast is shown
      setTimeout(() => {
        router.push(`/guild/${roomCode}/lobby`);
      }, 500);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create room';
      
      // Check if it's a credit error
      if (err.response?.status === 400 && err.response?.data?.room_credits !== undefined) {
        // Show special message for credit error
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('Insufficient room credits. Refer friends to earn credits!', 'error');
        }
        // Optionally redirect to referral page
        setTimeout(() => {
          router.push('/referral');
        }, 2000);
      } else {
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(errorMsg, 'error');
        }
      }
      console.error('Error creating room:', err);
    } finally {
      setLoading(false);
    }
  };

  const commonSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  const questionTypes = [
    { value: 'mcq', label: 'MCQ' },
    { value: 'integer', label: 'Integer Type' },
    { value: 'numerical', label: 'Numerical Type' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="section-container max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/guild"
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← Back to Rooms
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Create Guild Room
          </h1>
          <p className="text-gray-600">
            Set up a tournament-style test room for multiple participants
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Exam Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exam & Subjects</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam *
                </label>
                <select
                  name="exam"
                  value={formData.exam}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.exam ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select an exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
                {errors.exam && (
                  <p className="mt-1 text-sm text-red-600">{errors.exam}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Selection Mode *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subject_mode"
                      value="random"
                      checked={formData.subject_mode === 'random'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Random
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="subject_mode"
                      value="specific"
                      checked={formData.subject_mode === 'specific'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Specific Subjects
                  </label>
                </div>
              </div>

              {formData.subject_mode === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Subjects *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {commonSubjects.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => handleSubjectToggle(subject)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          formData.subjects.includes(subject)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  {errors.subjects && (
                    <p className="mt-1 text-sm text-red-600">{errors.subjects}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Test Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions *
                </label>
                <input
                  type="number"
                  name="number_of_questions"
                  value={formData.number_of_questions}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.number_of_questions ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.number_of_questions && (
                  <p className="mt-1 text-sm text-red-600">{errors.number_of_questions}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time per Question (minutes) *
                </label>
                <input
                  type="number"
                  name="time_per_question"
                  value={formData.time_per_question}
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.time_per_question ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.time_per_question && (
                  <p className="mt-1 text-sm text-red-600">{errors.time_per_question}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Buffer (minutes)
                </label>
                <input
                  type="number"
                  name="time_buffer"
                  value={formData.time_buffer}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Duration
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                  {calculateDuration()} minutes
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type Mix *
                </label>
                <select
                  name="question_type_mix"
                  value={formData.question_type_mix}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="mixed">Mixed</option>
                  <option value="mcq">MCQ Only</option>
                  <option value="integer">Integer Type Only</option>
                  <option value="numerical">Numerical Type Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Randomization & Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Randomization & Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Randomization Mode *
                </label>
                <select
                  name="randomization_mode"
                  value={formData.randomization_mode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="none">No Randomization</option>
                  <option value="question_order">Randomize Question Order</option>
                  <option value="question_and_options">Randomize Questions & Options</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allow_pause"
                  checked={formData.allow_pause}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Allow participants to pause the test
                </label>
              </div>
            </div>
          </div>

          {/* Room Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Room Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="privacy"
                      value="public"
                      checked={formData.privacy === 'public'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Public
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="privacy"
                      value="private"
                      checked={formData.privacy === 'private'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Private
                  </label>
                </div>
              </div>

              {formData.privacy === 'private' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required={formData.privacy === 'private'}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant Limit (0 = unlimited)
                </label>
                <input
                  type="number"
                  name="participant_limit"
                  value={formData.participant_limit}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="start_time"
                      value="now"
                      checked={formData.start_time === 'now'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Start Now
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="start_time"
                      value="scheduled"
                      checked={formData.start_time === 'scheduled'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Scheduled
                  </label>
                </div>
                {formData.start_time === 'scheduled' && (
                  <input
                    type="datetime-local"
                    name="scheduled_time"
                    value={formData.scheduled_time}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.scheduled_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required={formData.start_time === 'scheduled'}
                  />
                )}
                {errors.scheduled_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduled_time}</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary Box */}
          {showSummary && summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Test Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Questions:</span> {summary.summary.total_questions}
                </div>
                <div>
                  <span className="font-medium">Time per Question:</span> {summary.summary.time_per_question} min
                </div>
                <div>
                  <span className="font-medium">Total Duration:</span> {summary.summary.total_duration_minutes} min
                </div>
                <div>
                  <span className="font-medium">Difficulty:</span> {summary.summary.difficulty}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Validation:</span> {summary.validation.message}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePreview}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Preview Summary
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

