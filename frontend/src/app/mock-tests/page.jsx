'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockTestApi } from '@/lib/api';

const TEST_TYPES = [
  { value: 'full_length', label: 'Full Length', icon: '🎯', description: 'Complete exam simulation with predefined tests' },
  { value: 'practice', label: 'Practice', icon: '📝', description: 'Quick practice tests' },
  { value: 'sectional', label: 'Sectional', icon: '📚', description: 'Subject-wise tests' },
  { value: 'custom', label: 'Custom', icon: '⚙️', description: 'Build your own test' },
];

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'very_hard', label: 'Very Hard' },
];

export default function MockTestsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Exam, 2: Year, 3: Test Type, 4: Tests/Customize
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Exams
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Step 2: Years
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Step 3: Test Type
  const [selectedTestType, setSelectedTestType] = useState(null);

  // Step 4: For Full Length - Tests, For Others - Customization
  const [tests, setTests] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState([]);
  const [questionCount, setQuestionCount] = useState(30);
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [availableQuestionCount, setAvailableQuestionCount] = useState(0);
  const [loadingQuestionCount, setLoadingQuestionCount] = useState(false);

  // Calculate total time
  const totalTime = questionCount * timePerQuestion;
  const totalTimeHours = Math.floor(totalTime / 60);
  const totalTimeMins = totalTime % 60;

  // Load exams on mount
  useEffect(() => {
    loadExams();
  }, []);

  // Load years when exam is selected
  useEffect(() => {
    if (selectedExam) {
      loadExamYears();
    }
  }, [selectedExam]);

  // Load tests when Full Length is selected
  useEffect(() => {
    if (selectedExam && selectedYears.length > 0 && selectedTestType === 'full_length') {
      loadFullLengthTests();
    }
  }, [selectedExam, selectedYears, selectedTestType]);

  // Fetch available question count when filters change
  useEffect(() => {
    if (
      selectedExam &&
      selectedYears.length > 0 &&
      selectedTestType &&
      selectedTestType !== 'full_length'
    ) {
      fetchAvailableQuestionCount();
    }
  }, [selectedExam, selectedYears, selectedSubjects, selectedDifficulty, selectedTestType]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await mockTestApi.getExams();
      setExams(response.data?.results || response.data || []);
    } catch (err) {
      setError('Failed to load exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExamYears = async () => {
    if (!selectedExam) return;

    try {
      setLoadingYears(true);
      const response = await mockTestApi.getExamYears(selectedExam.id);
      const years = response.data?.years || [];
      setAvailableYears(years);
      // Clear selected years when exam changes
      setSelectedYears([]);
    } catch (err) {
      setError('Failed to load years. Please try again.');
      setAvailableYears([]);
    } finally {
      setLoadingYears(false);
    }
  };

  const loadFullLengthTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        exam: selectedExam.id,
        test_type: 'full_length',
      };
      const response = await mockTestApi.getAll(params);
      const testsData = response.data?.results || response.data || [];
      setTests(testsData);
      setStep(4);
    } catch (err) {
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestionCount = async () => {
    if (!selectedExam || selectedYears.length === 0) return;

    try {
      setLoadingQuestionCount(true);
      const params = {
        exam_id: selectedExam.id,
        years: selectedYears.join(','),
      };

      if (selectedSubjects.length > 0) {
        params.subjects = selectedSubjects.join(',');
      }

      if (selectedDifficulty.length > 0) {
        params.difficulty = selectedDifficulty.join(',');
      }

      const response = await mockTestApi.getAvailableQuestionsCount(params);
      const count = response.data?.count || 0;
      setAvailableQuestionCount(count);

      // Adjust question count based on available questions
      if (count > 0) {
        // Use the actual available count (capped at 100 for UI purposes)
        const maxCount = Math.min(count, 100);
        // If current count exceeds available, set to available
        if (questionCount > maxCount) {
          setQuestionCount(maxCount);
        }
        // If available count is less than current minimum (10), allow it
        // This handles cases where user has fewer than 10 questions
      } else {
        // No questions available, set to 0 or minimum
        setQuestionCount(0);
      }
    } catch (err) {
      setAvailableQuestionCount(0);
    } finally {
      setLoadingQuestionCount(false);
    }
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setSelectedYears([]);
    setAvailableYears([]);
    setSelectedTestType(null);
    setTests([]);
    setStep(2);
  };

  const handleYearToggle = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleTestTypeSelect = (testType) => {
    setSelectedTestType(testType);
    if (testType === 'full_length') {
      // Will trigger useEffect to load tests
      setStep(3);
    } else {
      // Show customization panel
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setSelectedExam(null);
      setSelectedYears([]);
      setSelectedTestType(null);
      setTests([]);
      setStep(1);
    } else if (step === 3) {
      setSelectedYears([]);
      setSelectedTestType(null);
      setTests([]);
      setStep(2);
    } else if (step === 4) {
      setSelectedTestType(null);
      setTests([]);
      setSelectedSubjects([]);
      setSelectedDifficulty([]);
      setStep(3);
    }
  };

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleDifficultyToggle = (difficulty) => {
    setSelectedDifficulty((prev) =>
      prev.includes(difficulty)
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const handleGenerateTest = async () => {
    // Validate
    if (selectedTestType === 'sectional' || selectedTestType === 'custom') {
      if (selectedSubjects.length === 0) {
        setError('Please select at least one subject for this test type.');
        return;
      }
    }

    if (timePerQuestion > 4) {
      setError('Time per question cannot exceed 4 minutes.');
      return;
    }

    if (questionCount === 0 || questionCount > availableQuestionCount) {
      setError('Please select a valid number of questions.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const response = await mockTestApi.generateTest({
        exam: selectedExam.id,
        years: selectedYears,
        test_type: selectedTestType,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        difficulty: selectedDifficulty.length > 0 ? selectedDifficulty : undefined,
        question_count: questionCount,
        time_per_question: timePerQuestion,
      });
      const { test_id } = response.data;
      router.push(`/mock-tests/${test_id}`);
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || 'Failed to generate test. Please try again.'
      );
      setGenerating(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
        <div className="section-container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Mock Tests</h1>
          <p className="section-subtitle">
            {step === 1 && 'Select an exam to get started'}
            {step === 2 && `Select year(s) for ${selectedExam?.name}`}
            {step === 3 && `Select test type for ${selectedExam?.name}`}
            {step === 4 &&
              selectedTestType === 'full_length' &&
              `Available Full Length tests for ${selectedExam?.name}`}
            {step === 4 &&
              selectedTestType !== 'full_length' &&
              `Customize your ${selectedTestType.replace('_', ' ')} test`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Select Exam */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Exam</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading exams...</p>
              </div>
            ) : exams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => handleExamSelect(exam)}
                    className="card hover:shadow-xl transition-all duration-300 text-left"
                  >
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.name}</h3>
                    <p className="text-gray-600">Click to view tests</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Exams Available</h3>
                <p className="text-gray-600">Check back soon!</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Years - Carousel */}
        {step === 2 && selectedExam && (
          <div>
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 flex items-center gap-2"
              >
                ← Back to Exams
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedExam.name}</h2>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Year(s)</h3>
              <p className="text-gray-600 mb-4">You can select multiple years</p>
              {loadingYears ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading years...</p>
                </div>
              ) : availableYears.length > 0 ? (
                <>
                  {/* Carousel Container */}
                  <div className="relative">
                    <div className="overflow-hidden">
                      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory scroll-smooth">
                        {availableYears.map((year) => (
                          <button
                            key={year}
                            onClick={() => handleYearToggle(year)}
                            className={`flex-shrink-0 snap-center px-8 py-6 rounded-xl border-2 transition-all duration-300 font-semibold text-lg min-w-[140px] shadow-lg hover:scale-105 ${
                              selectedYears.includes(year)
                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-indigo-200 scale-105'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:shadow-indigo-100'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2">📅</div>
                              <div>{year}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Years Summary */}
                  {selectedYears.length > 0 && (
                    <div className="mt-6">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                        <p className="text-indigo-800 font-medium">
                          Selected: {selectedYears.sort((a, b) => b - a).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => setStep(3)}
                        className="btn-primary px-8 py-3 w-full md:w-auto"
                      >
                        Continue to Test Type →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    No years available for this exam. Please ensure questions are added to the database.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Test Type */}
        {step === 3 && selectedExam && selectedYears.length > 0 && (
          <div>
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 flex items-center gap-2"
              >
                ← Back to Years
              </button>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <p className="text-gray-700">
                  <span className="font-semibold">Exam:</span> {selectedExam.name} |{' '}
                  <span className="font-semibold">Years:</span> {selectedYears.join(', ')}
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Test Type</h2>
            {/* Test Type Carousel */}
            <div className="relative">
              <div className="overflow-hidden">
                <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory scroll-smooth">
                  {TEST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleTestTypeSelect(type.value)}
                      className={`flex-shrink-0 snap-center w-72 p-6 rounded-xl border-2 text-left transition-all duration-300 shadow-lg hover:scale-105 ${
                        selectedTestType === type.value
                          ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-indigo-200 scale-105'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-indigo-100'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl">{type.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2 text-lg">{type.label}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                        </div>
                        {selectedTestType === type.value && (
                          <span className="text-indigo-600 text-2xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Full Length Tests or Customization */}
        {step === 4 && selectedExam && selectedYears.length > 0 && selectedTestType && (
          <div>
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 flex items-center gap-2"
              >
                ← Change Test Type
              </button>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <p className="text-gray-700">
                  <span className="font-semibold">Exam:</span> {selectedExam.name} |{' '}
                  <span className="font-semibold">Years:</span> {selectedYears.join(', ')} |{' '}
                  <span className="font-semibold">Type:</span>{' '}
                  {TEST_TYPES.find((t) => t.value === selectedTestType)?.label}
                </p>
              </div>
            </div>

            {/* Full Length: Show Tests */}
            {selectedTestType === 'full_length' && (
              <div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading tests...</p>
                  </div>
                ) : tests.length > 0 ? (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Full Length Tests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tests.map((test) => (
                        <MockTestCard key={test.id} test={test} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-lg p-8">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Full Length Tests Available</h3>
                    <p className="text-gray-600">
                      No predefined full length tests found for this exam.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Practice/Sectional/Custom: Show Customization */}
            {selectedTestType !== 'full_length' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Customize Your Test</h2>

                {/* Subjects (Required for Sectional/Custom) */}
                <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Subjects{' '}
                    {(selectedTestType === 'sectional' || selectedTestType === 'custom') && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {SUBJECTS.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => handleSubjectToggle(subject)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedSubjects.includes(subject)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  {(selectedTestType === 'sectional' || selectedTestType === 'custom') &&
                    selectedSubjects.length === 0 && (
                      <p className="text-red-500 text-sm mt-2">Please select at least one subject</p>
                    )}
                </div>

                {/* Difficulty */}
                <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Difficulty (Optional - Leave empty for all)
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {DIFFICULTY_LEVELS.map((diff) => (
                      <button
                        key={diff.value}
                        type="button"
                        onClick={() => handleDifficultyToggle(diff.value)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedDifficulty.includes(diff.value)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Number of Questions: {questionCount}
                    {availableQuestionCount > 0 && (
                      <span className="text-gray-500 text-sm ml-2">
                        (Available: {availableQuestionCount})
                      </span>
                    )}
                    {loadingQuestionCount && (
                      <span className="text-gray-500 text-sm ml-2">Loading...</span>
                    )}
                  </label>
                  {availableQuestionCount > 0 ? (
                    <>
                      <input
                        type="range"
                        min="1"
                        max={Math.min(availableQuestionCount, 100)}
                        value={Math.min(questionCount, Math.min(availableQuestionCount, 100))}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full"
                        disabled={loadingQuestionCount}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1</span>
                        <span>{Math.min(availableQuestionCount, 100)}</span>
                      </div>
                      {availableQuestionCount < 10 && (
                        <p className="text-amber-600 text-sm mt-2">
                          You have {availableQuestionCount} question{availableQuestionCount !== 1 ? 's' : ''} available. Adjust your filters to see more.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-red-500 text-sm">
                        No questions available for the selected criteria. Please adjust your filters.
                      </p>
                    </div>
                  )}
                </div>

                {/* Time Per Question */}
                <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Time Per Question (minutes): {timePerQuestion}
                    <span className="text-gray-500 text-sm ml-2">(Max: 4 minutes)</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="4"
                    step="0.5"
                    value={timePerQuestion}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val <= 4) {
                        setTimePerQuestion(val);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {timePerQuestion > 4 && (
                    <p className="text-red-500 text-sm mt-2">Maximum time per question is 4 minutes</p>
                  )}
                </div>

                {/* Total Time Display */}
                <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Test Duration</h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {totalTimeHours > 0 && `${totalTimeHours}h `}
                    {totalTimeMins}m
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    ({questionCount} questions × {timePerQuestion} min/question)
                  </p>
                </div>

                {/* Generate Button */}
                <div className="text-center">
                  <button
                    onClick={handleGenerateTest}
                    disabled={
                      generating ||
                      (selectedTestType !== 'practice' && selectedSubjects.length === 0) ||
                      questionCount === 0 ||
                      availableQuestionCount === 0
                    }
                    className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? 'Generating Test...' : 'Generate Test'}
                  </button>
                  {availableQuestionCount === 0 && (
                    <p className="text-red-500 text-sm mt-2">
                      Cannot generate test: No questions available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function MockTestCard({ test }) {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
    very_hard: 'bg-purple-100 text-purple-800',
  };

  const difficulty = test.difficulty_level || test.difficulty?.level || 'medium';
  const durationHours = Math.floor(test.duration_minutes / 60);
  const durationMins = test.duration_minutes % 60;

  return (
    <div className="card hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex-1">{test.title}</h3>
        {test.is_vip && (
          <span className="bg-accent-1 text-white text-xs font-bold px-2 py-1 rounded">VIP</span>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📊</span>
          <span>{test.total_questions || test.questions_count || 0} Questions</span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">⏱️</span>
          <span>
            {durationHours > 0 && `${durationHours}h `}
            {durationMins}m
          </span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📝</span>
          <span>{test.total_marks} Marks</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">🎯</span>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              difficultyColors[difficulty] || difficultyColors.medium
            }`}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        </div>
      </div>

      <Link
        href={`/mock-tests/${test.id}`}
        className="btn-primary w-full text-center block"
      >
        Start Test
      </Link>
    </div>
  );
}
