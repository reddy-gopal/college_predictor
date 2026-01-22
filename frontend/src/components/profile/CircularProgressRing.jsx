'use client';

import { useState, useEffect } from 'react';

export default function CircularProgressRing({ total, completed, inProgress, abandoned }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const size = 200;
  const strokeWidth = 16;
  const responsiveSize = isMobile ? 160 : size;
  const radius = (responsiveSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const abandonedPercent = total > 0 ? (abandoned / total) * 100 : 0;

  const completedLength = (completedPercent / 100) * circumference;
  const inProgressLength = (inProgressPercent / 100) * circumference;
  const abandonedLength = (abandonedPercent / 100) * circumference;

  const completedOffset = circumference - completedLength;
  const inProgressStart = completedOffset;
  const abandonedStart = inProgressStart - inProgressLength;

  return (
    <div 
      className="relative mx-auto" 
      style={{ width: responsiveSize, height: responsiveSize }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-niat-text text-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap z-10">
          No of correct answers {completed}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-niat-text rotate-45"></div>
        </div>
      )}
      <svg width={responsiveSize} height={responsiveSize} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={responsiveSize / 2}
          cy={responsiveSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-niat-border"
        />
        
        {/* Completed (Green) */}
        {completed > 0 && (
          <circle
            cx={responsiveSize / 2}
            cy={responsiveSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={completedOffset}
            strokeLinecap="round"
            className="text-green-500 transition-all duration-500"
            style={{
              strokeDashoffset: completedOffset,
            }}
          />
        )}

        {/* In Progress (Blue) */}
        {inProgress > 0 && (
          <circle
            cx={responsiveSize / 2}
            cy={responsiveSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${inProgressLength} ${circumference}`}
            strokeDashoffset={inProgressStart}
            strokeLinecap="round"
            className="text-blue-500 transition-all duration-500"
          />
        )}

        {/* Wrong (Red) */}
        {abandoned > 0 && (
          <circle
            cx={responsiveSize / 2}
            cy={responsiveSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${abandonedLength} ${circumference}`}
            strokeDashoffset={abandonedStart}
            strokeLinecap="round"
            className="text-red-500 transition-all duration-500"
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl sm:text-3xl font-bold text-niat-text">
          {completed.toLocaleString()} / {total.toLocaleString()}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-niat-text-secondary">Correct: {completed}</span>
        </div>
        {abandoned > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-niat-text-secondary">Wrong: {abandoned}</span>
          </div>
        )}
      </div>
    </div>
  );
}
