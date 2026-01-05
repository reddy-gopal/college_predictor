import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = ({ title, subtitle, description, features, showTabs = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isRankPage = location.pathname === '/' || location.pathname === '/predict-rank';
  const isCollegePage = location.pathname === '/predict-college';

  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            {title}
            <span className="hero-subtitle">{subtitle}</span>
          </h1>
          <p className="hero-description">
            {description}
          </p>
          <div className="hero-features">
            {features.map((feature, index) => (
              <div className="feature-item" key={index}>
                <span className="feature-icon">{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {showTabs && (
          <div className="hero-cta">
            <div className="cta-tabs">
              <button
                className={`cta-tab ${isRankPage ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <span className="cta-icon">📈</span>
                Predict Rank
              </button>
              <button
                className={`cta-tab ${isCollegePage ? 'active' : ''}`}
                onClick={() => navigate('/predict-college')}
              >
                <span className="cta-icon">🏫</span>
                Predict College
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
