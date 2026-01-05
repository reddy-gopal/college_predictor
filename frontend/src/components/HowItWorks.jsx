import React from 'react';
import './HowItWorks.css';

const HowItWorks = ({ title, steps }) => {
    return (
        <section className="how-it-works">
            <h2 className="hiw-title">{title}</h2>
            <div className="hiw-steps">
                {steps.map((step, index) => (
                    <div key={index} className="hiw-step-card" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="hiw-icon-wrapper">
                            <span className="hiw-icon">{step.icon}</span>
                            {index < steps.length - 1 && <div className="hiw-connector"></div>}
                        </div>
                        <h3 className="hiw-step-title">{step.title}</h3>
                        <p className="hiw-step-desc">{step.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HowItWorks;
