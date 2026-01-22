'use client';

import { useState, useEffect } from 'react';
import { rankPredictorApi } from '@/lib/api';
import HowItWorks from '@/components/predictor/HowItWorks';
import FAQ from '@/components/predictor/FAQ';

export default function PredictRankPage() {
  const [formData, setFormData] = useState({
    exam: '',
    category: '',
    year: new Date().getFullYear(),
    score: '',
    percentile: '',
    inputType: 'score', // 'score' or 'percentile'
  });
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryDisplay, setCategoryDisplay] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExams();
    loadCategories();
  }, []);

  const loadExams = async () => {
    try {
      setLoadingExams(true);
      const response = await rankPredictorApi.getExams();
      const examsData = response.data?.results || response.data || [];
      setExams(Array.isArray(examsData) ? examsData : []);
    } catch (err) {
      console.error('Error loading exams:', err);
      setError('Failed to load exams. Please refresh the page.');
    } finally {
      setLoadingExams(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await rankPredictorApi.getCategories();
      const categoriesData = response.data?.categories || [];
      const displayData = response.data?.category_display || {};
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setCategoryDisplay(displayData);
    } catch (err) {
      console.error('Error loading categories:', err);
      // Fallback to default categories if API fails
      setCategories(['general', 'obc', 'sc', 'st']);
      setCategoryDisplay({
        general: 'General',
        obc: 'OBC',
        sc: 'SC',
        st: 'ST',
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      inputType: type,
      score: type === 'score' ? prev.score : '',
      percentile: type === 'percentile' ? prev.percentile : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    // Validation
    if (!formData.exam) {
      setError('Please select an exam.');
      setLoading(false);
      return;
    }
    if (!formData.category) {
      setError('Please select a category.');
      setLoading(false);
      return;
    }
    if (formData.inputType === 'score' && !formData.score) {
      setError('Please enter your score.');
      setLoading(false);
      return;
    }
    if (formData.inputType === 'percentile' && !formData.percentile) {
      setError('Please enter your percentile.');
      setLoading(false);
      return;
    }
    if (formData.inputType === 'percentile' && parseFloat(formData.percentile) > 100) {
      setError('Percentile must be between 0 and 100.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        exam: parseInt(formData.exam),
        category: formData.category.toLowerCase(),
        year: parseInt(formData.year),
      };

      if (formData.inputType === 'score') {
        payload.score = parseFloat(formData.score);
      } else {
        payload.percentile = parseFloat(formData.percentile);
      }

      const response = await rankPredictorApi.getRankFromScore(payload);
      
      // Backend returns { message: '...', data: { ... } }
      if (response.data?.data) {
        setResult(response.data.data);
      } else if (response.data) {
        // Fallback if structure is different
        setResult(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to predict rank. Please check your inputs and try again.';
      setError(errorMessage);
      setResult(null);
      console.error('Error predicting rank:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Rank Predictor</h1>
          <p className="section-subtitle">
            Get accurate rank estimations from your scores using advanced
            algorithms and historical data
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Form */}
          <form onSubmit={handleSubmit} className="card mb-8">
            {/* Input Type Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Input Type *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleInputTypeChange('score')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.inputType === 'score'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Score
                </button>
                <button
                  type="button"
                  onClick={() => handleInputTypeChange('percentile')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.inputType === 'percentile'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Percentile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Score or Percentile */}
              <div>
                <label
                  htmlFor={formData.inputType}
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {formData.inputType === 'score' ? 'Score' : 'Percentile'} *
                </label>
                <input
                  type="number"
                  id={formData.inputType}
                  name={formData.inputType}
                  value={
                    formData.inputType === 'score'
                      ? formData.score
                      : formData.percentile
                  }
                  onChange={handleChange}
                  required
                  step={formData.inputType === 'percentile' ? '0.01' : '1'}
                  min="0"
                  max={formData.inputType === 'percentile' ? '100' : undefined}
                  className="input-field"
                  placeholder={
                    formData.inputType === 'score'
                      ? 'Enter your score'
                      : 'Enter your percentile'
                  }
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
                  disabled={loadingCategories}
                  className="input-field"
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryDisplay[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Year *
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  min="2020"
                  max={new Date().getFullYear() + 1}
                  className="input-field"
                />
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
              {loading ? 'Predicting...' : 'Predict Rank'}
            </button>
          </form>

          {/* Results */}
          {result && (
            <div>
              <RankResultCard result={result} inputType={formData.inputType} />
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  className="btn-secondary"
                >
                  Predict Another Rank
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How It Works & FAQ - Full Width Below Results */}
      {result && (
        <div className="w-full bg-gray-50 py-12">
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* How It Works */}
            <div className="mb-8">
              <HowItWorks
                title="How Rank Prediction Works"
                steps={[
                  {
                    icon: '📊',
                    title: 'Enter Score or Percentile',
                    description: 'Input your exam score or percentile. You can choose either input type based on what information you have from your exam results.',
                  },
                  {
                    icon: '🎯',
                    title: 'Select Exam & Category',
                    description: 'Choose your exam type, category (General, OBC, SC, ST), and the exam year. The system uses historical data from that year for prediction.',
                  },
                  {
                    icon: '🧮',
                    title: 'IDW Algorithm Processing',
                    description: 'Our advanced Inverse Distance Weighting (IDW) algorithm finds the nearest matching rank bands from historical data. It selects the closest 5 bands and calculates a weighted average rank based on distance from your score/percentile.',
                  },
                  {
                    icon: '📈',
                    title: 'Get Rank Estimate',
                    description: 'Receive an estimated rank range with confidence level. The prediction uses weighted interpolation from multiple data points, providing a more accurate estimate than simple linear interpolation.',
                  },
                ]}
              />
            </div>

            {/* FAQ */}
            <FAQ
              items={[
                {
                  question: 'How accurate is the estimated rank?',
                  answer: 'Our rank estimation uses the Inverse Distance Weighting (IDW) algorithm with historical data from previous years. The accuracy typically falls within ±5% of the actual rank, but actual ranks may vary depending on exam difficulty, number of candidates, and other factors. The confidence level (High/Medium/Low) indicates the reliability based on the rank range.',
                },
                {
                  question: 'What is the difference between Score and Percentile?',
                  answer: 'Score is the raw marks you obtained in the exam, while Percentile indicates the percentage of students who scored equal to or less than you. Different exams primarily use one or the other for ranking. Our system supports both input types and converts them appropriately.',
                },
                {
                  question: 'How does the IDW algorithm work?',
                  answer: 'Inverse Distance Weighting (IDW) finds the nearest 5 rank bands from historical data that match your score/percentile. It then calculates a weighted average rank, giving more weight to bands closer to your input value. This provides more accurate predictions than simple linear interpolation, especially when data points are sparse.',
                },
                {
                  question: 'Can I predict rank for any exam?',
                  answer: 'Currently, we support rank prediction for major competitive exams like JEE Mains, NEET, KCET, and others. Select your exam from the dropdown to see if it\'s supported. We continuously add more exams as data becomes available.',
                },
                {
                  question: 'What if data for my year is not available?',
                  answer: 'If data for your selected year is not available, the system automatically uses the most recent available year\'s data and displays a notification. This ensures you still get a useful estimate based on the closest available historical data.',
                },
                {
                  question: 'Is my data saved when I use the predictor?',
                  answer: 'No, we do not store any of your personal input data. The score/percentile you enter is processed in real-time to generate the prediction and is discarded immediately after. Your privacy is important to us.',
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* How It Works & FAQ - Full Width Below Form if No Results */}
      {!result && (
        <div className="w-full bg-gray-50 py-12">
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* How It Works */}
            <div className="mb-8">
              <HowItWorks
                title="How Rank Prediction Works"
                steps={[
                  {
                    icon: '📊',
                    title: 'Enter Score or Percentile',
                    description: 'Input your exam score or percentile. You can choose either input type based on what information you have from your exam results.',
                  },
                  {
                    icon: '🎯',
                    title: 'Select Exam & Category',
                    description: 'Choose your exam type, category (General, OBC, SC, ST), and the exam year. The system uses historical data from that year for prediction.',
                  },
                  {
                    icon: '🧮',
                    title: 'IDW Algorithm Processing',
                    description: 'Our advanced Inverse Distance Weighting (IDW) algorithm finds the nearest matching rank bands from historical data. It selects the closest 5 bands and calculates a weighted average rank based on distance from your score/percentile.',
                  },
                  {
                    icon: '📈',
                    title: 'Get Rank Estimate',
                    description: 'Receive an estimated rank range with confidence level. The prediction uses weighted interpolation from multiple data points, providing a more accurate estimate than simple linear interpolation.',
                  },
                ]}
              />
            </div>

            {/* FAQ */}
            <FAQ
              items={[
                {
                  question: 'How accurate is the estimated rank?',
                  answer: 'Our rank estimation uses the Inverse Distance Weighting (IDW) algorithm with historical data from previous years. The accuracy typically falls within ±5% of the actual rank, but actual ranks may vary depending on exam difficulty, number of candidates, and other factors. The confidence level (High/Medium/Low) indicates the reliability based on the rank range.',
                },
                {
                  question: 'What is the difference between Score and Percentile?',
                  answer: 'Score is the raw marks you obtained in the exam, while Percentile indicates the percentage of students who scored equal to or less than you. Different exams primarily use one or the other for ranking. Our system supports both input types and converts them appropriately.',
                },
                {
                  question: 'How does the IDW algorithm work?',
                  answer: 'Inverse Distance Weighting (IDW) finds the nearest 5 rank bands from historical data that match your score/percentile. It then calculates a weighted average rank, giving more weight to bands closer to your input value. This provides more accurate predictions than simple linear interpolation, especially when data points are sparse.',
                },
                {
                  question: 'Can I predict rank for any exam?',
                  answer: 'Currently, we support rank prediction for major competitive exams like JEE Mains, NEET, KCET, and others. Select your exam from the dropdown to see if it\'s supported. We continuously add more exams as data becomes available.',
                },
                {
                  question: 'What if data for my year is not available?',
                  answer: 'If data for your selected year is not available, the system automatically uses the most recent available year\'s data and displays a notification. This ensures you still get a useful estimate based on the closest available historical data.',
                },
                {
                  question: 'Is my data saved when I use the predictor?',
                  answer: 'No, we do not store any of your personal input data. The score/percentile you enter is processed in real-time to generate the prediction and is discarded immediately after. Your privacy is important to us.',
                },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RankResultCard({ result, inputType }) {
  const rankLow = result.rank_low ?? 'N/A';
  const rankHigh = result.rank_high ?? 'N/A';
  const estimatedRank = result.estimated_rank ?? null;
  const examName = result.exam || result.exam_name || 'N/A';
  const category = result.category_display || result.category || 'N/A';
  const year = result.year || result.requested_year || 'N/A';
  const inputValue = result.input_value ?? null;
  const fallbackMessage = result.fallback_message || null;
  
  // Calculate confidence based on rank range
  const rankRange = rankHigh !== 'N/A' && rankLow !== 'N/A' ? rankHigh - rankLow : null;
  let confidence = 'Medium';
  if (rankRange !== null) {
    if (rankRange < 1000) confidence = 'High';
    else if (rankRange < 5000) confidence = 'Medium';
    else confidence = 'Low';
  }

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Predicted Rank Range
        </h2>
      </div>

      <div className="space-y-6">
        {/* Fallback Message */}
        {fallbackMessage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
            <p className="text-yellow-800 text-sm">{fallbackMessage}</p>
          </div>
        )}

        {/* Estimated Rank (Primary) */}
        {estimatedRank !== null && (
          <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-8 text-center shadow-lg">
            <div className="text-sm font-semibold mb-2 opacity-90 uppercase tracking-wide">
              Estimated Rank
            </div>
            <div className="text-6xl font-bold mb-2">
              {estimatedRank.toLocaleString()}
            </div>
            <div className="text-sm opacity-75">
              Based on {inputType === 'score' ? 'score' : 'percentile'} of {inputValue?.toFixed(2)}
            </div>
          </div>
        )}

        {/* Rank Range */}
        <div className="bg-white rounded-xl p-6 text-center border-2 border-primary/20">
          <div className="text-sm text-gray-600 mb-2">Rank Range</div>
          <div className="text-4xl font-bold text-primary mb-2">
            {rankLow === rankHigh || rankLow === 'N/A' || rankHigh === 'N/A'
              ? rankLow === 'N/A' ? rankHigh : rankLow
              : `${rankLow.toLocaleString()} - ${rankHigh.toLocaleString()}`}
          </div>
          {rankLow !== rankHigh && rankLow !== 'N/A' && rankHigh !== 'N/A' && (
            <div className="text-sm text-gray-600">
              Range: {(rankHigh - rankLow).toLocaleString()} positions
            </div>
          )}
        </div>

        {/* Confidence Indicator */}
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-700">Confidence Level</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                confidence.toLowerCase() === 'high'
                  ? 'bg-green-100 text-green-800'
                  : confidence.toLowerCase() === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {confidence}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                confidence.toLowerCase() === 'high'
                  ? 'bg-green-500'
                  : confidence.toLowerCase() === 'medium'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{
                width:
                  confidence.toLowerCase() === 'high'
                    ? '90%'
                    : confidence.toLowerCase() === 'medium'
                    ? '70%'
                    : '50%',
              }}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Prediction Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center text-gray-700">
              <span className="mr-3 text-2xl">📝</span>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Exam</div>
                <div className="font-semibold">{examName}</div>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <span className="mr-3 text-2xl">🏷️</span>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Category</div>
                <div className="font-semibold">{category}</div>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <span className="mr-3 text-2xl">📅</span>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Year</div>
                <div className="font-semibold">{year}</div>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <span className="mr-3 text-2xl">📊</span>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Input Type</div>
                <div className="font-semibold capitalize">{result.input_type || inputType}</div>
              </div>
            </div>
          </div>
          {result.bands_used && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Prediction based on {result.bands_used} data band{result.bands_used !== 1 ? 's' : ''} using {result.weighting?.method || 'IDW'} algorithm
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

