import React from 'react';
import './Tabs.css';

const Tabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs-container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'predict-college' ? 'active' : ''}`}
          onClick={() => onTabChange('predict-college')}
        >
          Predict College
        </button>
        <button
          className={`tab ${activeTab === 'predict-rank' ? 'active' : ''}`}
          onClick={() => onTabChange('predict-rank')}
        >
          Predict Rank
        </button>
      </div>
      <div className="tab-indicator" style={{ left: activeTab === 'predict-college' ? '0%' : '50%' }} />
    </div>
  );
};

export default Tabs;

