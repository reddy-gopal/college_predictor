import React from 'react';
import './CollegeCard.css';

const CollegeCard = ({ college, index }) => {
  return (
    <div className="college-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="college-card-header">
        <div className="college-name-section">
          <h3 className="college-name">{college.college_name}</h3>
          <span className="college-location">
            <span className="location-icon">📍</span>
            {college.location}
          </span>
        </div>
        <div className="eligibility-badge eligible">
          <span className="badge-icon">✓</span>
          Eligible
        </div>
      </div>
      
      <div className="college-card-body">
        <div className="course-info">
          <div className="course-name">{college.course_name}</div>
          <div className="course-details">
            <span className="branch-tag">{college.branch}</span>
            <span className="degree-tag">{college.degree}</span>
          </div>
        </div>
      </div>
      
      <div className="college-card-footer">
        <button className="view-details-btn">
          View Details
          <span className="arrow-icon">→</span>
        </button>
      </div>
    </div>
  );
};

export default CollegeCard;

