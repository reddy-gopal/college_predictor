import React, { useState } from 'react';
import './FAQ.css';

const FAQ = ({ items }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleItem = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <section className="faq-section">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <div className="faq-container">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`faq-item ${activeIndex === index ? 'active' : ''}`}
                        onClick={() => toggleItem(index)}
                    >
                        <div className="faq-question">
                            <span>{item.question}</span>
                            <span className="faq-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>
                        <div
                            className="faq-answer-wrapper"
                            style={{
                                maxHeight: activeIndex === index ? '200px' : '0'
                            }}
                        >
                            <div className="faq-answer">
                                {item.answer}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FAQ;
