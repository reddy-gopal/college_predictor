'use client';

import { useState, useEffect } from 'react';
import { collegePredictorApi } from '@/lib/api';
import CollegeCard from '@/components/CollegeCard';
import HowItWorks from '@/components/predictor/HowItWorks';
import FAQ from '@/components/predictor/FAQ';

export default function PredictCollegePage() {
  const [formData, setFormData] = useState({
    input_rank: '',
    exam: '',
    category: '',
    state: '',
    branch_list: [],
  });
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesCache, setCategoriesCache] = useState({}); // Cache categories by exam_id
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (formData.exam) {
      loadCategories(formData.exam);
    } else {
      // Reset categories when exam is cleared
      setCategories([]);
      setFormData((prev) => ({ ...prev, category: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.exam]);

  const loadExams = async () => {
    try {
      setLoadingExams(true);
      const response = await collegePredictorApi.getExams();
      setExams(response.data?.results || response.data || []);
    } catch (err) {
      setError('Failed to load exams. Please try again.');
      console.error('Error loading exams:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadCategories = async (examId) => {
    // Check cache first
    if (categoriesCache[examId]) {
      console.log('Using cached categories for exam:', examId);
      setCategories(categoriesCache[examId].categories);
      return;
    }

    try {
      setLoadingCategories(true);
      const response = await collegePredictorApi.getCategories(examId);
      // Handle different response formats
      const data = response.data;
      let categoriesList = [];
      let categoryDisplayMap = {};

      if (Array.isArray(data)) {
        // Remove duplicates using Set
        categoriesList = [...new Set(data)];
      } else if (data?.categories && Array.isArray(data.categories)) {
        // Remove duplicates using Set
        categoriesList = [...new Set(data.categories)];
        categoryDisplayMap = data.category_display || {};
      }

      // Cache the result
      setCategoriesCache((prev) => ({
        ...prev,
        [examId]: {
          categories: categoriesList,
          categoryDisplay: categoryDisplayMap,
        },
      }));

      setCategories(categoriesList);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchToggle = (branch) => {
    setFormData((prev) => {
      const branchList = prev.branch_list || [];
      const newBranchList = branchList.includes(branch)
        ? branchList.filter((b) => b !== branch)
        : [...branchList, branch];
      return { ...prev, branch_list: newBranchList };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults([]);

    try {
      const payload = {
        input_rank: parseInt(formData.input_rank),
        exam: parseInt(formData.exam),
        category: formData.category.toLowerCase().trim(),
        state: formData.state?.trim() || undefined,
        branch_list: formData.branch_list?.map(b => b.toLowerCase()) || [],
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key];
        }
      });

      const response = await collegePredictorApi.predict(payload);
      
      // Handle backend response structure
      // Backend returns: { message, prediction_id, predicted_result: { colleges: [...] } }
      const data = response.data;
      let colleges = [];
      
      if (data?.predicted_result?.colleges) {
        colleges = data.predicted_result.colleges;
      } else if (Array.isArray(data)) {
        colleges = data;
      } else if (data?.colleges && Array.isArray(data.colleges)) {
        colleges = data.colleges;
      }
      
      if (colleges.length === 0) {
        setError('No colleges found for the given criteria. Try adjusting your rank or category.');
      } else {
        setResults(colleges);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message ||
                          'Failed to predict colleges. Please check your inputs and try again.';
      setError(errorMessage);
      setResults([]);
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const commonBranches = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-12">
        {/* Header - Only show when no results */}
        {results.length === 0 && (
          <div className="text-center mb-12">
            <h1 className="section-title">College Predictor</h1>
            <p className="section-subtitle">
              Find the best colleges you're eligible for based on your rank,
              category, and preferences
            </p>
          </div>
        )}

        {/* Form */}
        <div className="max-w-3xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rank */}
              <div>
                <label
                  htmlFor="input_rank"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Your Rank *
                </label>
                <input
                  type="number"
                  id="input_rank"
                  name="input_rank"
                  value={formData.input_rank}
                  onChange={handleChange}
                  required
                  min="1"
                  className="input-field"
                  placeholder="Enter your rank"
                  suppressHydrationWarning
                />
              </div>

              {/* Exam */}
              <div>
                <label
                  htmlFor="exam"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Exam *
                </label>
                <select
                  id="exam"
                  name="exam"
                  value={formData.exam}
                  onChange={handleChange}
                  required
                  disabled={loadingExams}
                  className="input-field"
                >
                  <option value="">Select Exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={!formData.exam}
                  className="input-field"
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {Array.isArray(categories) && categories.map((cat) => {
                    const cachedData = categoriesCache[formData.exam];
                    const displayName = cachedData?.categoryDisplay?.[cat] 
                      || cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
                    return (
                      <option key={cat} value={cat}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* State */}
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Home State (Optional)
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Andhra Pradesh"
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Branch Selection */}
            <div className="mt-6">
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
                      formData.branch_list?.includes(branch.toLowerCase())
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 text-lg py-4"
            >
              {loading ? 'Predicting...' : 'Predict Colleges'}
            </button>
          </form>

          {/* No Results */}
          {results.length === 0 && !loading && !error && formData.input_rank && (
            <div className="text-center py-12 bg-white rounded-xl mt-8">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Colleges Found
              </h3>
              <p className="text-gray-600">
                Try adjusting your rank or category to see more results.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results Section - Full Width Below Form */}
      {results.length > 0 && (
        <div className="w-full bg-gray-50 py-12">
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-primary via-secondary to-primary text-white rounded-2xl p-6 md:p-8 mb-8 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                    <span className="text-5xl">🎓</span>
                    <span>Eligible Colleges Found</span>
                  </h2>
                  <p className="text-white/90 text-lg mt-2">
                    Based on your rank: <span className="font-bold text-white">{formData.input_rank}</span>
                    {formData.category && (
                      <span className="ml-3">
                        • Category: <span className="font-bold text-white">{formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 text-center border-2 border-white/30 shadow-lg">
                  <div className="text-4xl md:text-5xl font-bold">{results.length}</div>
                  <div className="text-sm md:text-base text-white/90 mt-1">
                    {results.length === 1 ? 'College' : 'Colleges'} Available
                  </div>
                </div>
              </div>
            </div>

            {/* Results Grid - Full Width with Proper Spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-16">
              {results.map((college, index) => (
                <div key={index} className="h-full">
                  <CollegeCard college={college} index={index} />
                </div>
              ))}
            </div>

            {/* Back to Form */}
            <div className="text-center py-8 bg-white rounded-xl shadow-md mb-8">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn-primary px-8 py-3 text-lg font-semibold hover:scale-105 transition-transform"
              >
                ↑ Back to Form
              </button>
            </div>

          </div>
        </div>
      )}

      {/* How It Works & FAQ - Full Width Below Results */}
      {results.length > 0 && (
        <div className="w-full bg-gray-50 py-12">
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* How It Works */}
            <div className="mb-8">
              <HowItWorks
                title="How College Prediction Works"
                steps={[
                  {
                    icon: '🔢',
                    title: 'Enter Your Rank',
                    description: 'Input your exam rank obtained in the competitive examination. This is the primary factor for college eligibility.',
                  },
                  {
                    icon: '📑',
                    title: 'Select Filters',
                    description: 'Choose your exam type, category (General, OBC, SC, ST, etc.), optional home state, and preferred branches.',
                  },
                  {
                    icon: '🔍',
                    title: 'Rank Matching Algorithm',
                    description: 'Our system matches your rank against historical cutoff data. We find colleges where your rank falls within the opening and closing rank range for that category.',
                  },
                  {
                    icon: '🎓',
                    title: 'Get Eligible Colleges',
                    description: 'Receive a comprehensive list of colleges and courses you\'re eligible for, filtered by your preferences and ranked by historical cutoff trends.',
                  },
                ]}
              />
            </div>

            {/* FAQ */}
            <FAQ
              items={[
                {
                  question: 'How accurate is the college prediction?',
                  answer: 'Our predictions are based on historical cutoff data from previous years. The accuracy depends on how closely the current year\'s trends match historical patterns. We show colleges where your rank falls within the opening and closing rank range for that specific exam, category, and branch combination.',
                },
                {
                  question: 'What if no colleges are found for my rank?',
                  answer: 'If no colleges are found, it means your rank is higher than the closing ranks for available colleges in your selected category. Try adjusting your rank slightly, selecting a different category, or removing state/branch filters to see more options.',
                },
                {
                  question: 'Can I filter by multiple branches?',
                  answer: 'Yes! You can select multiple preferred branches (CSE, ECE, ME, etc.). The system will show colleges that offer any of your selected branches and where your rank qualifies.',
                },
                {
                  question: 'How does the state filter work?',
                  answer: 'The state filter is optional. If you select a specific state, you\'ll only see colleges from that state. If left blank, you\'ll see colleges from all states. Some exams have state-specific quotas, so this filter helps you find colleges in your preferred location.',
                },
                {
                  question: 'Are the results based on current year data?',
                  answer: 'The predictions use the most recent available cutoff data in our database. Cutoff data is typically updated after each exam cycle. The results reflect historical trends and should be used as a guide for college selection.',
                },
                {
                  question: 'Is my data saved when I use the predictor?',
                  answer: 'No, we do not store your personal rank or prediction data. Your inputs are processed in real-time to generate results and are not saved on our servers.',
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* How It Works & FAQ - Full Width Below Form if No Results */}
      {results.length === 0 && (
        <div className="w-full bg-gray-50 py-12">
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* How It Works */}
            <div className="mb-8">
              <HowItWorks
                title="How College Prediction Works"
                steps={[
                  {
                    icon: '🔢',
                    title: 'Enter Your Rank',
                    description: 'Input your exam rank obtained in the competitive examination. This is the primary factor for college eligibility.',
                  },
                  {
                    icon: '📑',
                    title: 'Select Filters',
                    description: 'Choose your exam type, category (General, OBC, SC, ST, etc.), optional home state, and preferred branches.',
                  },
                  {
                    icon: '🔍',
                    title: 'Rank Matching Algorithm',
                    description: 'Our system matches your rank against historical cutoff data. We find colleges where your rank falls within the opening and closing rank range for that category.',
                  },
                  {
                    icon: '🎓',
                    title: 'Get Eligible Colleges',
                    description: 'Receive a comprehensive list of colleges and courses you\'re eligible for, filtered by your preferences and ranked by historical cutoff trends.',
                  },
                ]}
              />
            </div>

            {/* FAQ */}
            <FAQ
              items={[
                {
                  question: 'How accurate is the college prediction?',
                  answer: 'Our predictions are based on historical cutoff data from previous years. The accuracy depends on how closely the current year\'s trends match historical patterns. We show colleges where your rank falls within the opening and closing rank range for that specific exam, category, and branch combination.',
                },
                {
                  question: 'What if no colleges are found for my rank?',
                  answer: 'If no colleges are found, it means your rank is higher than the closing ranks for available colleges in your selected category. Try adjusting your rank slightly, selecting a different category, or removing state/branch filters to see more options.',
                },
                {
                  question: 'Can I filter by multiple branches?',
                  answer: 'Yes! You can select multiple preferred branches (CSE, ECE, ME, etc.). The system will show colleges that offer any of your selected branches and where your rank qualifies.',
                },
                {
                  question: 'How does the state filter work?',
                  answer: 'The state filter is optional. If you select a specific state, you\'ll only see colleges from that state. If left blank, you\'ll see colleges from all states. Some exams have state-specific quotas, so this filter helps you find colleges in your preferred location.',
                },
                {
                  question: 'Are the results based on current year data?',
                  answer: 'The predictions use the most recent available cutoff data in our database. Cutoff data is typically updated after each exam cycle. The results reflect historical trends and should be used as a guide for college selection.',
                },
                {
                  question: 'Is my data saved when I use the predictor?',
                  answer: 'No, we do not store your personal rank or prediction data. Your inputs are processed in real-time to generate results and are not saved on our servers.',
                },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

