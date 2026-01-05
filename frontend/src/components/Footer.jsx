import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* About Column */}
                    <div className="footer-col">
                        <h3 className="footer-logo">College Predictor</h3>
                        <p className="footer-desc">
                            Your trusted companion for academic planning. We help students find their ideal colleges and estimate ranks using advanced algorithms and historical data.
                        </p>
                    </div>

                    {/* Quick Links Column */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Quick Links</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/">Predict Rank</Link></li>
                            <li><Link to="/predict-college">Predict College</Link></li>
                            <li><a href="#help">Help Us</a></li>
                        </ul>
                    </div>

                    {/* Social / Contact Column */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Contact Us</h4>
                        <ul className="footer-links">
                            <li><a href="mailto:support@collegepredictor.com">support@collegepredictor.com</a></li>
                            <li><a href="#twitter">Twitter</a></li>
                            <li><a href="#linkedin">LinkedIn</a></li>
                            <li><a href="#instagram">Instagram</a></li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Legal</h4>
                        <ul className="footer-links">
                            <li><a href="#privacy">Privacy Policy</a></li>
                            <li><a href="#terms">Terms of Service</a></li>
                            <li><a href="#cookies">Cookie Policy</a></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} College Predictor. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
