'use client';

import { useState, useEffect } from 'react';

export default function SimpleLineChart({ data, xKey, yKey, color, xLabel, yLabel }) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 sm:h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  // Responsive width: smaller on mobile
  const width = isMobile ? 600 : 800;
  const height = isMobile ? 250 : 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Extract values
  const xValues = data.map((d) => {
    const val = d[xKey];
    // Handle date strings
    if (typeof val === 'string' && val.includes('-')) {
      return new Date(val).getTime();
    }
    return val;
  });
  const yValues = data.map((d) => d[yKey]);

  // Calculate scales
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin || 1;

  const scaleX = (value) => {
    if (xMax === xMin) return chartWidth / 2;
    return ((value - xMin) / (xMax - xMin)) * chartWidth;
  };

  const scaleY = (value) => {
    return chartHeight - ((value - yMin) / yRange) * chartHeight;
  };

  // Generate path
  const points = data.map((d, i) => ({
    x: scaleX(xValues[i]) + padding.left,
    y: scaleY(yValues[i]) + padding.top,
  }));

  const pathData = points
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ');

  // Get color based on theme
  const getColor = () => {
    const colors = {
      primary: '#6366f1', // indigo-500
      secondary: '#8b5cf6', // violet-500
      'accent-1': '#ec4899', // pink-500
      'accent-2': '#f59e0b', // amber-500
    };
    return colors[color] || colors.primary;
  };

  const strokeColor = getColor();

  // Format x-axis labels
  const formatXLabel = (value) => {
    if (typeof xValues[0] === 'number' && xValues[0] > 1000000000000) {
      // It's a timestamp
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return value;
  };

  // Format date for tooltip
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle mouse events
  const handlePointMouseEnter = (e, index) => {
    const point = points[index];
    setHoveredPoint({
      index,
      data: data[index],
      x: point.x,
      y: point.y
    });
  };

  const handlePointMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-full max-w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <line
              key={ratio}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-200 dark:text-gray-700"
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = yMin + ratio * yRange;
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <text
              key={ratio}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {value.toFixed(0)}
            </text>
          );
        })}

        {/* X-axis labels */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
          .map((d, idx) => {
            const i = idx * Math.ceil(data.length / 6);
            const x = points[i]?.x || 0;
            return (
              <text
                key={i}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {formatXLabel(xValues[i])}
              </text>
            );
          })}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          strokeWidth="2"
          stroke={strokeColor}
        />

        {/* Points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={hoveredPoint?.index === i ? "6" : "4"}
            fill={strokeColor}
            className="cursor-pointer transition-all"
            onMouseEnter={(e) => handlePointMouseEnter(e, i)}
            onMouseLeave={handlePointMouseLeave}
          />
        ))}

        {/* Tooltip */}
        {hoveredPoint && (
          <g>
            {/* Tooltip background */}
            <rect
              x={hoveredPoint.x - 70}
              y={hoveredPoint.y - 55}
              width="140"
              height="45"
              rx="6"
              fill="rgba(0, 0, 0, 0.85)"
              className="pointer-events-none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            />
            {/* Tooltip text - Date */}
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 35}
              textAnchor="middle"
              className="text-xs fill-white pointer-events-none"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {formatDate(hoveredPoint.data[xKey]) || hoveredPoint.data[xKey]}
            </text>
            {/* Tooltip text - Value */}
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 18}
              textAnchor="middle"
              className="text-sm fill-white pointer-events-none font-semibold"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {yLabel}: {typeof hoveredPoint.data[yKey] === 'number' ? hoveredPoint.data[yKey].toFixed(1) : hoveredPoint.data[yKey]}
            </text>
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-600"
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-400 dark:text-gray-600"
        />

        {/* Labels */}
        {yLabel && (
          <text
            x={10}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 10, ${height / 2})`}
            className="text-sm fill-gray-700 dark:fill-gray-300"
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-sm fill-gray-700 dark:fill-gray-300"
          >
            {xLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

