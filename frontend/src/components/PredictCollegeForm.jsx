import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { predictCollegeApi } from '../api/predictionApi';
import { getExamsApi } from '../api/examsApi';
import { getCategoriesApi } from '../api/categoriesApi';
import './Form.css';


import HowItWorks from './HowItWorks';
import FAQ from './FAQ';

const PredictCollegeForm = ({ setResults, onFormSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [exams, setExams] = useState([]);
    const [categories, setCategories] = useState([]);

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
        setLoading(true);
        if (onFormSubmit) onFormSubmit();
        try {
            const response = await predictCollegeApi(data);
            setResults(response.predicted_result.colleges);
        } catch (error) {
            console.error('Error predicting colleges:', error);
            alert('Error predicting colleges. Please check the backend.');
        } finally {
            setLoading(false);
        }
    };

    const howItWorksSteps = [
        { title: "Enter Rank", description: "Input your exam rank", icon: "🔢" },
        { title: "Select Filters", description: "Choose exam, category & state", icon: "📑" },
        { title: "Matchmaker", description: "We compare against last year's cutoffs", icon: "🔍" },
        { title: "College List", description: "See eligible colleges for you", icon: "🎓" }
    ];

    return (
        <div className="page-container">
            <div className="form-wrapper">
                <div className="form-header">
                    <h2>College Predictor</h2>
                    <p>Find the best colleges based on your rank</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="modern-form">
                    <div className="form-group slide-in">
                        <label htmlFor="input_rank">Rank</label>
                        <input
                            type="number"
                            id="input_rank"
                            placeholder="Enter your rank"
                            {...register('input_rank', { required: true })}
                        />
                        {errors.input_rank && <span className="error-message">Required</span>}
                    </div>

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
                            <label htmlFor="category">Category</label>
                            <select id="category" {...register('category', { required: true })}>
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            {errors.category && <span className="error-message">Required</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="state">State (Optional)</label>
                        <select id="state" {...register('state', { required: false })}>
                            <option value="">All States</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Jammu & Kashmir">Jammu & Kashmir</option>
                            <option value="Ladakh">Ladakh</option>
                        </select>
                    </div>

                    <button type="submit" className="form-button primary-btn" disabled={loading}>
                        {loading ? 'Predicting...' : 'Predict Colleges'}
                    </button>
                </form>
            </div>

            <HowItWorks title="How College Prediction Works" steps={howItWorksSteps} />

            <FAQ items={[
                { question: "How are colleges predicted?", answer: "We use the previous year's cutoff ranks (closing ranks) for each college, category, and branch. By comparing your input rank with these historical cutoffs, we generate a list of colleges where you have a high probability of admission." },
                { question: "Do these results guarantee admission?", answer: "No, these are predictive results based on past trends. Cutoffs change every year due to factors like the number of applicants, seat availability, and exam difficulty. Use this as a reference guide only." },
                { question: "What does category mean?", answer: "Category refers to reservation categories like GM, OBC, SC, ST etc. Cutoffs vary significantly between categories, so selecting the correct one is crucial for accurate predictions." },
                { question: "Can I filter by specific states?", answer: "Yes! You can use the optional 'State' dropdown to narrow down your college search to a specific region or state according to your preference." }
            ]} />
        </div>
    );
};

export default PredictCollegeForm;