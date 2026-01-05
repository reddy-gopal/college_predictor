import React from 'react';
import './RankResultCard.css';

const RankResultCard = ({ data }) => {
  if (!data) return null;

  const { estimated_rank, rank_low, rank_high, exam, category, year, requested_year, fallback_message } = data;

  // Calculate confidence percentage (inverse of range width, normalized)
  const rangeWidth = rank_high - rank_low;
  const maxRange = 10000; // Assume max reasonable range
  const confidence = Math.max(10, Math.min(100, 100 - (rangeWidth / maxRange * 100)));

  return (
    <div className="rank-result-card">
      <div className="rank-header">
        <h2 className="rank-title">Your Estimated Rank</h2>
        {fallback_message && (
          <div className="fallback-notice" style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem 1rem', 
            background: 'var(--warning-50)', 
            border: '1px solid var(--warning-500)', 
            borderRadius: '8px', 
            color: 'var(--warning-700)',
            fontSize: '0.9rem'
          }}>
            ⚠️ {fallback_message}
          </div>
        )}
        <div className="rank-badges">
          <span className="info-badge">
            <span className="badge-icon">📝</span>
            {exam}
          </span>
          <span className="info-badge">
            <span className="badge-icon">🏷️</span>
            {category}
          </span>
          <span className="info-badge">
            <span className="badge-icon">📅</span>
            {requested_year || year} {requested_year && requested_year !== year && `(${year} data)`}
          </span>
        </div>
      </div>

      <div className="rank-main-result">
        <div className="estimated-rank">
          <span className="rank-label">Estimated Rank</span>
          <span className="rank-value">{estimated_rank?.toLocaleString() || 'N/A'}</span>
        </div>
        <div className="rank-range">
          <span className="range-label">Rank Range</span>
          <span className="range-value">
            {rank_low?.toLocaleString() || 'N/A'} - {rank_high?.toLocaleString() || 'N/A'}
          </span>
        </div>
      </div>


      {confidence > 0 && (
        <div className="confidence-indicator">
          <div className="confidence-label">
            <span>Prediction Confidence</span>
            <span className="confidence-percentage">{Math.round(confidence)}%</span>
          </div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill" 
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RankResultCard;

