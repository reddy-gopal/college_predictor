'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { mockTestApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ActivityHeatmap() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('Current'); 
  const [availableYears, setAvailableYears] = useState([]);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [totalActiveDays, setTotalActiveDays] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's test attempts to build real-time heatmap
      const response = await mockTestApi.getUserAttempts({});
      const attempts = response.data?.results || response.data || [];
      
      // Filter only completed attempts (submitted tests)
      const completedAttempts = attempts.filter(
        (attempt) => attempt.completed_at && attempt.is_completed
      );

      // Total tests will be calculated after heatmapData is generated based on selected range

      // Extract available years from attempts
      const yearsSet = new Set();
      completedAttempts.forEach((attempt) => {
        if (attempt.completed_at) {
          const year = new Date(attempt.completed_at).getFullYear();
          yearsSet.add(year);
        }
      });
      // Get current year to determine if 2026 should be included
      const currentYear = new Date().getFullYear();
      const years = Array.from(yearsSet).sort((a, b) => b - a).filter(year => {
        // Only exclude 2026 if current year is less than 2026
        // Once 2026 is completed (we're in 2027 or later), include it
        if (year === 2026 && currentYear < 2026) {
          return false;
        }
        return true;
      });
      setAvailableYears(years);

      // Group attempts by date
      const attemptsByDate = {};
      completedAttempts.forEach((attempt) => {
        const dateStr = attempt.completed_at.split('T')[0]; // Get YYYY-MM-DD
        if (!attemptsByDate[dateStr]) {
          attemptsByDate[dateStr] = {
            count: 0,
            total_accuracy: 0,
            total_time: 0,
            attempts: [],
          };
        }
        attemptsByDate[dateStr].count += 1;
        attemptsByDate[dateStr].attempts.push(attempt);
        
        // Calculate average accuracy if available
        if (attempt.percentile !== null && attempt.percentile !== undefined) {
          attemptsByDate[dateStr].total_accuracy += attempt.percentile;
        }
        
        // Calculate total time if available
        if (attempt.duration_minutes) {
          attemptsByDate[dateStr].total_time += attempt.duration_minutes;
        }
      });

      // Helper function to get local date string (YYYY-MM-DD) without timezone issues
      const getLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = getLocalDateStr(today);
      let maxCount = 0;
      let startDate, endDate;

      // Determine date range based on selected year and device type
      if (selectedYear === 'Current') {
        // Default: Show rolling calendar centered around current date
        endDate = new Date(today);
        
        if (isMobile) {
          // Mobile: Show 6 months ending with today
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 5); // 6 months total
          startDate.setDate(1); // Start of the first month
        } else {
          // Desktop: Show full year (12 months) ending with today
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 11); // 12 months total
          startDate.setDate(1); // Start of the first month
        }
      } else {
        // For specific year: show full year on desktop, 6 months on mobile (first half)
        const year = parseInt(selectedYear);
        
        if (isMobile) {
          // Mobile: Show first 6 months (January to June)
          startDate = new Date(year, 0, 1); // January 1
          endDate = new Date(year, 5, 30); // June 30
        } else {
          // Desktop: Always show full year
          startDate = new Date(year, 0, 1); // January 1
          endDate = new Date(year, 11, 31); // December 31
        }
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // Generate heatmap data for the selected range
      const heatmapData = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = getLocalDateStr(currentDate);
        const dayData = attemptsByDate[dateStr] || { count: 0, total_accuracy: 0, total_time: 0, attempts: [] };
        
        const avgAccuracy = dayData.count > 0 && dayData.total_accuracy > 0
          ? dayData.total_accuracy / dayData.count
          : null;

        heatmapData.push({
          date: dateStr,
          count: dayData.count,
          accuracy: avgAccuracy,
          time_spent: dayData.total_time,
        });

        if (dayData.count > maxCount) {
          maxCount = dayData.count;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate total active days (days with submissions) in the selected range
      const activeDays = heatmapData.filter(day => day.count > 0).length;
      setTotalActiveDays(activeDays);

      // Calculate total submissions in the selected range
      const totalSubmissions = heatmapData.reduce((sum, day) => sum + day.count, 0);
      setTotalTests(totalSubmissions);

      // Calculate max streak (date-based, consecutive calendar days)
      const streak = calculateMaxStreak(heatmapData);
      setMaxStreak(streak);

      setData({
        data: heatmapData,
        max_count: maxCount || 1,
        attemptsByDate,
        startDate: getLocalDateStr(startDate),
        endDate: getLocalDateStr(endDate),
      });
    } catch (err) {
      console.error('Error fetching activity heatmap:', err);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, isMobile]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // Refresh when user data changes (e.g., after completing a test)
  useEffect(() => {
    if (user) {
      // Small delay to ensure backend has processed test completion
      const timer = setTimeout(() => {
        fetchHeatmap();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.total_xp, fetchHeatmap]); // Refresh when XP changes (indicates test completion)

  // Refresh when page becomes visible (user returns to tab/window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh data when user returns to the page
        fetchHeatmap();
        refreshUser(); // Also refresh user data
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchHeatmap, refreshUser]);

  // Refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        // Small delay to avoid too frequent refreshes
        setTimeout(() => {
          fetchHeatmap();
          refreshUser();
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchHeatmap, refreshUser]);

  const calculateMaxStreak = (heatmapData) => {
    let maxStreak = 0;
    let currentStreak = 0;

    // Sort by date (oldest first) - already sorted, but ensure
    const sortedData = [...heatmapData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    for (const day of sortedData) {
      if (day.count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  };

  // Generate grid structure as monthly calendar grids
  const gridData = useMemo(() => {
    if (!data) return null;

    // Helper function to get local date string (YYYY-MM-DD) without timezone issues
    const getLocalDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateStr(today);
    
    // Use date range from data (set by fetchHeatmap based on selectedYear)
    let startDate, endDate;
    if (data.startDate && data.endDate) {
      const [startYear, startMonth, startDay] = data.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = data.endDate.split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
      endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
      // Fallback: last 365 days
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Create a map of date strings to data
    const dataMap = new Map();
    data.data.forEach((item) => {
      dataMap.set(item.date, item);
    });

    // Build grid: columns = weeks, rows = days of week (Sun-Sat)
    // Structure: grid[dayOfWeek][weekIndex]
    const grid = Array(7).fill(null).map(() => []);
    const monthLabels = [];
    
    // Find the Sunday of the week containing startDate (to align grid)
    const startDateDay = startDate.getDay(); // 0 = Sunday, 6 = Saturday
    const gridStartDate = new Date(startDate);
    gridStartDate.setDate(startDate.getDate() - startDateDay); // Move to Sunday
    
    // Build grid by iterating through all days from gridStartDate to endDate
    let currentDate = new Date(gridStartDate);
    let weekIndex = 0;
    let currentMonth = -1; // Track current month for labels
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateStr = getLocalDateStr(currentDate);
      const month = currentDate.getMonth();
      
      // Add month label when we encounter the 1st of a month
      if (currentDate.getDate() === 1 || (currentDate >= startDate && month !== currentMonth)) {
        // Check if this is the first day of a month within our range
        if (currentDate >= startDate) {
          monthLabels.push({
            weekIndex: weekIndex,
            label: currentDate.toLocaleDateString('en-US', { month: 'short' }),
            width: 0, // Will be calculated later
          });
          currentMonth = month;
        }
      }
      
      // Get data for this date
      const dayData = dataMap.get(dateStr) || {
        date: dateStr,
        count: 0,
        accuracy: null,
        time_spent: 0,
      };
      
      // Determine if this date is within our range
      const isInRange = currentDate >= startDate && currentDate <= endDate;
      const isToday = dateStr === todayStr && selectedYear === 'Current';
      
      // Ensure grid row has enough cells
      while (grid[dayOfWeek].length <= weekIndex) {
        grid[dayOfWeek].push({
          weekIndex: grid[dayOfWeek].length,
          date: null,
          dayOfWeek: dayOfWeek,
          isToday: false,
          count: 0,
          accuracy: null,
          time_spent: 0,
          isEmpty: true,
        });
      }
      
      // Set cell data
      if (isInRange) {
        grid[dayOfWeek][weekIndex] = {
          weekIndex: weekIndex,
          date: dateStr,
          dayOfWeek: dayOfWeek,
          isToday: isToday,
          ...dayData,
          isEmpty: false,
        };
      } else {
        // Empty cell for dates outside range
        grid[dayOfWeek][weekIndex] = {
          weekIndex: weekIndex,
          date: null,
          dayOfWeek: dayOfWeek,
          isToday: false,
          count: 0,
          accuracy: null,
          time_spent: 0,
          isEmpty: true,
        };
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      
      // If we've completed a week (Sunday), move to next week
      if (dayOfWeek === 6) {
        weekIndex++;
      }
    }
    
    // Ensure all rows have the same length
    const maxWeekIndex = weekIndex;
    for (let dow = 0; dow < 7; dow++) {
      while (grid[dow].length <= maxWeekIndex) {
        grid[dow].push({
          weekIndex: grid[dow].length,
          date: null,
          dayOfWeek: dow,
          isToday: false,
          count: 0,
          accuracy: null,
          time_spent: 0,
          isEmpty: true,
        });
      }
    }

    // Sort month labels by weekIndex to ensure correct order
    monthLabels.sort((a, b) => a.weekIndex - b.weekIndex);

    // Recalculate month label widths based on actual week counts
    // Use consistent sizing: cell width 12px (w-3) + gap 4px (gap-1) for 6 months
    const cellWidth = 12; // Match w-3 (12px)
    const gapWidth = 4; // Match gap-1 (4px)
    
    for (let i = 0; i < monthLabels.length; i++) {
      let weekSpan;
      if (i < monthLabels.length - 1) {
        weekSpan = monthLabels[i + 1].weekIndex - monthLabels[i].weekIndex;
      } else {
        weekSpan = maxWeekIndex + 1 - monthLabels[i].weekIndex;
      }
      // Width = (number of weeks * cell width) + (number of gaps * gap width)
      // For n weeks, there are (n-1) gaps between them
      monthLabels[i].width = (weekSpan * cellWidth) + ((weekSpan - 1) * gapWidth);
    }
    
    // Total weeks is maxWeekIndex + 1
    const totalWeeks = maxWeekIndex + 1;

    return {
      grid,
      monthLabels,
      totalWeeks,
    };
  }, [data, selectedYear]);

  const getIntensity = (count) => {
    // Green if any test submitted, empty otherwise
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    // All submitted days get green, intensity based on count
    if (count === 1) return 'bg-green-400 dark:bg-green-700';
    if (count === 2 || count === 3) return 'bg-green-500 dark:bg-green-600';
    if (count >= 4) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-400 dark:bg-green-700';
  };

  const formatTooltip = (dayData) => {
    if (!dayData.date) return 'No date';
    
    // Parse YYYY-MM-DD format and create date object
    const [year, month, day] = dayData.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const testCount = dayData.count || 0;

    if (testCount === 0) {
      return `${dateStr}: No submissions`;
    }
    return `${dateStr}: ${testCount} ${testCount === 1 ? 'submission' : 'submissions'}`;
  };

  if (loading) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card bg-white dark:bg-gray-800 mb-6">
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchHeatmap} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!gridData) {
    return null;
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card bg-white dark:bg-gray-800 mb-4 md:mb-6">
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Activity Heatmap
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {selectedYear === 'Current' ? (
                <>
                  <span>
                    <span className="font-semibold">{totalTests}</span> submissions in the past {isMobile ? '6 months' : 'year'}
                  </span>
                  <span>
                    Total active days: <span className="font-semibold">{totalActiveDays}</span>
                  </span>
                  <span>
                    Max streak: <span className="font-semibold">{maxStreak}</span> days
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <span className="font-semibold">{totalTests}</span> submissions in this period
                  </span>
                  <span>
                    Total active days: <span className="font-semibold">{totalActiveDays}</span>
                  </span>
                  <span>
                    Max streak: <span className="font-semibold">{maxStreak}</span> days
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 rounded text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value="Current">Current</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display heatmap - full year on desktop, 6 months with scroll on mobile */}
        <div 
          className="w-full overflow-x-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: isMobile ? 'transparent transparent' : '#cbd5e1 transparent'
          }}
        >
          <div className="inline-block min-w-max" style={{
            minWidth: `${(gridData.totalWeeks * 16) + 48}px` // 12px cell + 4px gap = 16px per week, + 48px for day labels
          }}>
            {/* Month labels - positioned above their corresponding weeks */}
            <div className={`flex text-xs text-gray-600 dark:text-gray-400 mb-2 relative min-w-max`} style={{ height: '20px' }}>
              <div className="w-12 flex-shrink-0"></div>
              <div className={`relative min-w-max`} style={{ position: 'relative', minWidth: `${gridData.totalWeeks * 16}px` }}>
                {gridData.monthLabels.map((monthLabel, idx) => {
                  // Calculate the position of this month label to match grid exactly
                  const nextMonth = gridData.monthLabels[idx + 1];
                  
                  // Use consistent cell and gap sizes that match the grid (w-3 = 12px, gap-1 = 4px)
                  const cellWidth = 12; // Match w-3 (12px)
                  const gapWidth = 4; // Match gap-1 (4px)
                  
                  // Calculate left position: weekIndex * (cellWidth + gapWidth)
                  const leftPosition = monthLabel.weekIndex * (cellWidth + gapWidth);
                  
                  // Calculate width based on week span
                  let weekSpan;
                  if (nextMonth) {
                    weekSpan = nextMonth.weekIndex - monthLabel.weekIndex;
                  } else {
                    weekSpan = gridData.totalWeeks - monthLabel.weekIndex;
                  }
                  const labelWidth = (weekSpan * cellWidth) + ((weekSpan - 1) * gapWidth);
                  
                  return (
                    <div
                      key={idx}
                      className="absolute top-0"
                      style={{
                        left: `${leftPosition}px`,
                        width: `${labelWidth}px`,
                        textAlign: 'left',
                      }}
                    >
                      <div className="h-3 flex items-center text-xs font-medium whitespace-nowrap">
                        {monthLabel.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heatmap grid */}
            <div className={`flex min-w-max`}>
              {/* Day labels (left side) - ALL days visible */}
              <div className="w-12 flex-shrink-0 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                {dayLabels.map((label, idx) => (
                  <div key={idx} className="h-3 flex items-center justify-end pr-2">
                    {label}
                  </div>
                ))}
              </div>
              
              {/* Grid cells - columns are weeks */}
              <div className={`flex gap-1 min-w-max`} style={{ minWidth: `${gridData.totalWeeks * 16}px` }}>
                {Array.from({ length: gridData.totalWeeks }, (_, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="flex flex-col gap-1"
                  >
                    {gridData.grid.map((row, dayOfWeek) => {
                      // Get cell at this weekIndex (cells are indexed by weekIndex)
                      const cell = row[weekIndex];
                      
                      // Handle missing cells or empty cells
                      if (!cell || cell.isEmpty) {
                        return (
                          <div
                            key={`${weekIndex}-${dayOfWeek}`}
                            className="w-3 h-3 rounded bg-transparent"
                          />
                        );
                      }

                      const testCount = cell.count || 0;
                      const tooltipText = formatTooltip(cell);

                      return (
                        <div
                          key={`${weekIndex}-${dayOfWeek}`}
                          className={`w-3 h-3 rounded ${getIntensity(testCount)} ${
                            cell.isToday 
                              ? 'border-2 border-blue-600 dark:border-blue-400 shadow-sm' 
                              : 'border border-gray-200 dark:border-gray-700'
                          } cursor-pointer hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 transition-all relative group`}
                          title={tooltipText}
                        >
                          {/* Enhanced tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {tooltipText}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="hidden sm:inline">Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
            <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900"></div>
            <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-700"></div>
            <div className="w-3 h-3 rounded bg-green-600 dark:bg-green-600"></div>
            <div className="w-3 h-3 rounded bg-green-800 dark:bg-green-500"></div>
          </div>
          <span className="hidden sm:inline">More</span>
        </div>
      </div>
    </div>
  );
}
