'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { mockTestApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ActivityHeatmap() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('attempts'); // 'attempts', 'accuracy', 'time'
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

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

      // Calculate total tests (including today)
      setTotalTests(completedAttempts.length);

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

      // Generate heatmap data for last 365 days
      const heatmapData = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      // Helper function to get local date string (YYYY-MM-DD) without timezone issues
      const getLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const todayStr = getLocalDateStr(today);
      let maxCount = 0;

      for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateStr(date);
        
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
      }

      // Calculate max streak (date-based, consecutive calendar days)
      const streak = calculateMaxStreak(heatmapData);
      setMaxStreak(streak);

      setData({
        data: heatmapData,
        max_count: maxCount || 1,
        attemptsByDate,
      });
    } catch (err) {
      console.error('Error fetching activity heatmap:', err);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  useEffect(() => {
    if (viewType === 'attempts') {
      fetchHeatmap();
    }
  }, [viewType, fetchHeatmap]);

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
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setHours(0, 0, 0, 0);

    // Create a map of date strings to data
    const dataMap = new Map();
    data.data.forEach((item) => {
      dataMap.set(item.date, item);
    });

    // Group dates by month
    const months = [];
    const currentMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const todayMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let currentDate = new Date(currentMonthStart);
    
    while (currentDate <= todayMonthEnd) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Only include months that overlap with our date range
      if (lastDay >= startDate && firstDay <= today) {
        months.push({
          year,
          month,
          firstDay: new Date(Math.max(firstDay, startDate)),
          lastDay: new Date(Math.min(lastDay, today)),
        });
      }
      
      // Move to next month
      currentDate = new Date(year, month + 1, 1);
    }

    // Build grid: columns = weeks, rows = days of week (Sun-Sat)
    // Structure: grid[dayOfWeek][weekIndex] where weeks are organized by month
    const grid = Array(7).fill(null).map(() => []);
    const monthLabels = [];
    let globalWeekIndex = 0;

    months.forEach((monthInfo, monthIdx) => {
      const { year, month, firstDay, lastDay } = monthInfo;
      
      // Get first day of month and its weekday (0 = Sunday, 6 = Saturday)
      const firstDayOfMonth = new Date(year, month, 1);
      const firstDayWeekday = firstDayOfMonth.getDay();
      
      // Get actual first and last days within our range
      const monthStart = new Date(Math.max(firstDayOfMonth, firstDay));
      const monthEnd = new Date(Math.min(lastDay, today));
      const actualFirstDay = monthStart.getDate();
      const actualLastDay = monthEnd.getDate();
      const daysInMonth = actualLastDay - actualFirstDay + 1;
      
      // Calculate number of weeks needed for this month
      const leadingEmptyCells = firstDayWeekday;
      const lastDayOfMonth = new Date(year, month, actualLastDay);
      const lastDayWeekday = lastDayOfMonth.getDay();
      const trailingEmptyCells = 6 - lastDayWeekday;
      const totalCells = leadingEmptyCells + daysInMonth + trailingEmptyCells;
      const weeksInMonth = Math.ceil(totalCells / 7);

      // Store the starting week index for this month (before adding cells)
      const monthStartWeekIndex = globalWeekIndex;

      // Build calendar grid for this month
      let currentWeekIndex = globalWeekIndex;
      
      // Add leading empty cells (before the 1st day of month)
      for (let emptyCell = 0; emptyCell < leadingEmptyCells; emptyCell++) {
        const dayOfWeek = emptyCell;
        // Ensure all rows have cells up to this week
        for (let dow = 0; dow < 7; dow++) {
          while (grid[dow].length <= currentWeekIndex) {
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
        currentWeekIndex++;
      }

      // Add actual date cells for this month
      for (let day = actualFirstDay; day <= actualLastDay; day++) {
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);
        
        // Skip dates outside our range (safety check)
        if (cellDate < startDate || cellDate > today) continue;
        
        const cellDateStr = getLocalDateStr(cellDate);
        const dayOfWeek = cellDate.getDay();
        
        const dayData = dataMap.get(cellDateStr) || {
          date: cellDateStr,
          count: 0,
          accuracy: null,
          time_spent: 0,
        };

        // Calculate which week this day falls into within the month
        const dayNumber = day - actualFirstDay + 1;
        const weekOffset = Math.floor((leadingEmptyCells + dayNumber - 1) / 7);
        const weekIndex = globalWeekIndex + weekOffset;

        // Ensure grid row has enough cells
        for (let dow = 0; dow < 7; dow++) {
          while (grid[dow].length <= weekIndex) {
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

        // Replace empty cell with actual date data
        grid[dayOfWeek][weekIndex] = {
          weekIndex: weekIndex,
          date: cellDateStr,
          dayOfWeek,
          isToday: cellDateStr === todayStr,
          ...dayData,
          isEmpty: false,
        };
      }

      // Add trailing empty cells (after the last day of month)
      currentWeekIndex = globalWeekIndex + weeksInMonth;
      for (let emptyCell = 0; emptyCell < trailingEmptyCells; emptyCell++) {
        // Ensure all rows have cells up to this week
        for (let dow = 0; dow < 7; dow++) {
          while (grid[dow].length < currentWeekIndex) {
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
      }

      // Update global week index
      globalWeekIndex += weeksInMonth;

      // Add month label after calculating the month's position
      const monthDate = new Date(year, month, 1);
      monthLabels.push({
        weekIndex: monthStartWeekIndex,
        label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        width: weeksInMonth * 11, // Will be recalculated below
      });

      // Add spacer row between months (except after the last month)
      if (monthIdx < months.length - 1) {
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          // Ensure all rows have cells up to this week
          for (let dow = 0; dow < 7; dow++) {
            while (grid[dow].length <= globalWeekIndex) {
              grid[dow].push({
                weekIndex: grid[dow].length,
                date: null,
                dayOfWeek: dow,
                isToday: false,
                count: 0,
                accuracy: null,
                time_spent: 0,
                isEmpty: true,
                isSpacer: true,
              });
            }
          }
        }
        globalWeekIndex++;
      }
    });

    // Sort month labels by weekIndex to ensure correct order
    monthLabels.sort((a, b) => a.weekIndex - b.weekIndex);

    // Recalculate month label widths based on actual week counts
    // Account for: cell width (11px) + gap (4px = gap-1) between weeks
    const cellWidth = 11;
    const gapWidth = 4; // gap-1 in Tailwind = 0.25rem = 4px
    
    for (let i = 0; i < monthLabels.length; i++) {
      let weekSpan;
      if (i < monthLabels.length - 1) {
        weekSpan = monthLabels[i + 1].weekIndex - monthLabels[i].weekIndex;
      } else {
        weekSpan = globalWeekIndex - monthLabels[i].weekIndex;
      }
      // Width = (number of weeks * cell width) + (number of gaps * gap width)
      // For n weeks, there are (n-1) gaps between them
      monthLabels[i].width = (weekSpan * cellWidth) + ((weekSpan - 1) * gapWidth);
    }

    // Find max week index across all rows
    const maxWeekIndex = Math.max(...grid.map(row => row.length > 0 ? Math.max(...row.map(c => c.weekIndex)) : 0), 0);

    return {
      grid,
      monthLabels,
      totalWeeks: maxWeekIndex + 1,
    };
  }, [data]);

  const getIntensity = (value, count) => {
    // For attempts view: green if any test submitted, empty otherwise
    if (viewType === 'attempts') {
      if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
      // All submitted days get green, intensity based on count
      if (count === 1) return 'bg-green-400 dark:bg-green-700';
      if (count === 2 || count === 3) return 'bg-green-500 dark:bg-green-600';
      if (count >= 4) return 'bg-green-600 dark:bg-green-500';
      return 'bg-green-400 dark:bg-green-700';
    }
    
    // For accuracy mode: bucket by percentage
    if (viewType === 'accuracy') {
      if (value === 0 || value === null) return 'bg-gray-100 dark:bg-gray-800';
      if (value < 40) return 'bg-green-200 dark:bg-green-900';
      if (value < 60) return 'bg-green-400 dark:bg-green-700';
      if (value < 80) return 'bg-green-600 dark:bg-green-600';
      return 'bg-green-800 dark:bg-green-500';
    }
    
    // For time mode: bucket by minutes
    if (viewType === 'time') {
      if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
      const maxTime = data?.max_count || 1;
      const intensity = Math.min(value / maxTime, 1);
      if (intensity < 0.25) return 'bg-green-200 dark:bg-green-900';
      if (intensity < 0.5) return 'bg-green-400 dark:bg-green-700';
      if (intensity < 0.75) return 'bg-green-600 dark:bg-green-600';
      return 'bg-green-800 dark:bg-green-500';
    }
    
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const getValue = (dayData) => {
    switch (viewType) {
      case 'accuracy':
        return dayData.accuracy || 0;
      case 'time':
        return dayData.time_spent || 0;
      default:
        return dayData.count || 0;
    }
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

    const value = getValue(dayData);
    const testCount = dayData.count || 0;

    if (viewType === 'attempts') {
      if (testCount === 0) {
        return `${dateStr}: No activity`;
      }
      return `${dateStr}: ${testCount} ${testCount === 1 ? 'test' : 'tests'} submitted`;
    } else if (viewType === 'accuracy') {
      if (value === 0 || value === null) {
        return `${dateStr}: No activity`;
      }
      return `${dateStr}: ${Math.round(value)}% accuracy`;
    } else {
      if (value === 0) {
        return `${dateStr}: No activity`;
      }
      return `${dateStr}: ${Math.round(value)} min`;
    }
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
    <div className="card bg-white dark:bg-gray-800 mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Activity Heatmap
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>
                <span className="font-semibold">{totalTests}</span> tests submitted
              </span>
              <span>
                Max streak: <span className="font-semibold">{maxStreak}</span> days
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {['attempts', 'accuracy', 'time'].map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${
                  viewType === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Month labels - rendered to match grid structure exactly */}
          <div className="flex gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <div className="w-12 flex-shrink-0"></div>
            <div className="flex gap-1">
              {Array.from({ length: gridData.totalWeeks }, (_, weekIndex) => {
                // Find which month this week belongs to
                const monthLabel = gridData.monthLabels.find((month, idx) => {
                  const nextMonth = gridData.monthLabels[idx + 1];
                  if (nextMonth) {
                    return weekIndex >= month.weekIndex && weekIndex < nextMonth.weekIndex;
                  }
                  return weekIndex >= month.weekIndex;
                });

                // Check if this is the first week of a month
                const isFirstWeekOfMonth = monthLabel && weekIndex === monthLabel.weekIndex;

                return (
                  <div
                    key={weekIndex}
                    className="flex flex-col gap-1"
                    style={{ minWidth: '11px' }}
                  >
                    {isFirstWeekOfMonth ? (
                      <div className="h-3 flex items-center text-xs">
                        {monthLabel.label}
                      </div>
                    ) : (
                      <div className="h-3"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {/* Day labels (left side) - ALL days visible */}
            <div className="w-12 flex-shrink-0 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
              {dayLabels.map((label, idx) => (
                <div key={idx} className="h-3 flex items-center justify-end pr-2">
                  {label}
                </div>
              ))}
            </div>
            
            {/* Grid cells - columns are weeks */}
            <div className="flex gap-1">
              {Array.from({ length: gridData.totalWeeks }, (_, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col gap-1"
                  style={{ minWidth: '11px' }}
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

                    const value = getValue(cell);
                    const testCount = cell.count || 0;
                    const tooltipText = formatTooltip(cell);

                    return (
                      <div
                        key={`${weekIndex}-${dayOfWeek}`}
                        className={`w-3 h-3 rounded ${getIntensity(value, testCount)} ${
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

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
            <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900"></div>
            <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-700"></div>
            <div className="w-3 h-3 rounded bg-green-600 dark:bg-green-600"></div>
            <div className="w-3 h-3 rounded bg-green-800 dark:bg-green-500"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
