import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getRankFromScoreApi } from '../api/getRankFromScoreApi';
import { getExamsApi } from '../api/examsApi';
import { getCategoriesApi } from '../api/categoriesApi';
import RankResultCard from './RankResultCard';
import HowItWorks from './HowItWorks';
import FAQ from './FAQ';
import './Form.css';

const PredictRank = ({ setResults, onFormSubmit, rankResults }) => {
    const [loading, setLoading] = useState(false);
    const [exams, setExams] = useState([]);
    const [categories, setCategories] = useState([]);
    const [inputType, setInputType] = useState('');

    useEffect(() => {
        const fetchExams = async () => {
            const response = await getExamsApi();
            setExams(response);
        };
        fetchExams();
        const fetchCategories = async () => {
            const response = await getCategoriesApi();
            setCategories(response.categories);
        };
        fetchCategories();
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        // Find the exam name from the selected exam ID
        const selectedExam = exams.find(exam => exam.id === parseInt(data.exam));

        if (!selectedExam) {
            alert('Please select a valid exam');
            return;
        }

        // Prepare the data to send - ensure all numeric values are numbers, not strings
        const submitData = {
            exam: selectedExam.name, // Send exam name, not ID
            category: data.category,
            year: parseInt(data.year, 10) // Convert to integer to match Postman format
        };

        // Add only the selected input type (score or percentile)
        if (inputType === 'score') {
            submitData.score = parseFloat(data.score); // Ensure it's a number
        } else if (inputType === 'percentile') {
            submitData.percentile = parseFloat(data.percentile); // Ensure it's a number
        }

        setLoading(true);
        if (onFormSubmit) onFormSubmit();
        try {
            const response = await getRankFromScoreApi(submitData);

            // Backend returns { message: "...", data: {...} }
            // Extract the inner data object
            if (response && response.data) {
                setResults(response.data);
            } else {
                setResults(response);
            }
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                const errorMessage = errorData?.message || errorData || 'Unknown error';

                // Handle 404 as "no data found" - this is expected behavior, not a real error
                if (status === 404 && errorMessage.includes('No rank mapping found')) {
                    alert(`No rank mapping found for:\n\nExam: ${submitData.exam}\nCategory: ${submitData.category}\nYear: ${submitData.year}\n${inputType === 'score' ? `Score: ${submitData.score}` : `Percentile: ${submitData.percentile}`}\n\nPlease try different criteria or check if data exists in the database.`);
                } else if (status === 404) {
                    // Actual endpoint not found
                    alert(`Endpoint not found. Please check if the backend is running and the route is correct.\n\nError: ${errorMessage}`);
                } else {
                    // Other errors (400, 500, etc.)
                    alert(`Error (${status}): ${errorMessage}`);
                }
            } else if (error.request) {
                alert('No response from server. Please check if the backend is running.');
            } else {
                alert(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const howItWorksSteps = [
        { title: "Input Score/Percentile", description: "Enter your exam score or percentile", icon: "✍️" },
        { title: "Select Details", description: "Choose your category and exam year", icon: "📋" },
        { title: "Analyse Previous results", description: "Returns ranks based on historical data", icon: "🔍" },
        { title: "View Rank", description: "Get your estimated rank range", icon: "📊" }
    ];

    return (
        <div className="page-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h2>Rank Predictor</h2>
                    <p>Estimate your rank based on your performance</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="modern-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="exam">Exam</label>
                            <select id="exam" {...register('exam', { required: true })}>
                                <option value="">Select Exam</option>
                                {exams.map((exam) => (
                                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                                ))}
                            </select>
                            {errors.exam && <span className="error-message">Required</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="year">Year</label>
                            <select id="year" {...register('year', { required: true, valueAsNumber: true })}>
                                <option value="">Select Year</option>
                                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            {errors.year && <span className="error-message">Required</span>}
                            <div className="info-notice" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
                                ⚠️ Currently, we have data for 2025 only. We are working on adding more years.
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="category">Category</label>
                        <select id="category" {...register('category', { required: true })}>
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        {errors.category && <span className="error-message">Required</span>}
                    </div>

                    <div className="form-group toggle-group">
                        <label>Input Type</label>
                        <div className="toggle-container">
                            <label className={`toggle-btn ${inputType === 'score' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="inputType"
                                    value="score"
                                    checked={inputType === 'score'}
                                    onChange={(e) => setInputType(e.target.value)}
                                />
                                Score
                            </label>
                            <label className={`toggle-btn ${inputType === 'percentile' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="inputType"
                                    value="percentile"
                                    checked={inputType === 'percentile'}
                                    onChange={(e) => setInputType(e.target.value)}
                                />
                                Percentile
                            </label>
                        </div>
                    </div>

                    {inputType === 'score' && (
                        <div className="form-group slide-in">
                            <label htmlFor="score">Score</label>
                            <input
                                type="number"
                                id="score"
                                step="any"
                                placeholder="Enter your score"
                                {...register('score', { required: inputType === 'score', valueAsNumber: true })}
                            />
                            {errors.score && <span className="error-message">Required</span>}
                        </div>
                    )}

                    {inputType === 'percentile' && (
                        <div className="form-group slide-in">
                            <label htmlFor="percentile">Percentile</label>
                            <input
                                type="number"
                                id="percentile"
                                step="any"
                                min="0" max="100"
                                placeholder="Enter your percentile"
                                {...register('percentile', { required: inputType === 'percentile', valueAsNumber: true })}
                            />
                            {errors.percentile && <span className="error-message">Required</span>}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="form-button primary-btn"
                        disabled={loading || !inputType}
                    >
                        {loading ? 'Estimating...' : 'Estimate Rank'}
                    </button>
                </form>
            </div>

            {rankResults && typeof rankResults === 'object' && Object.keys(rankResults).length > 0 && (
                <div className="results-container">
                    <RankResultCard data={rankResults} />
                </div>
            )}

            <HowItWorks title="How Rank Prediction Works" steps={howItWorksSteps} />

            <FAQ items={[
                { question: "How accurate is the estimated rank?", answer: "Our rank estimation is based on historical data from previous years. While it provides a close approximation (typically within +/- 5% range), actual ranks may vary depending on the difficulty level of the exam and the number of candidates appearing this year." },
                { question: "Can I predict rank for any exam?", answer: "Currently, we support rank prediction for major exams like JEE Mains, NEET, and KCET. Select your exam from the dropdown menu to see if it's supported." },
                { question: "What is the difference between Score and Percentile?", answer: "Score is the raw marks you obtained in the exam, while Percentile indicates the percentage of students who scored equal to or less than you. Different exams primarily use one or the other for ranking." },
                { question: "Is my data saved?", answer: "No, we do not store any of your personal input data. The score/percentile you enter is processed in real-time to generate the prediction and is discarded immediately after." }
            ]} />
        </div>
    );
};
export default PredictRank;