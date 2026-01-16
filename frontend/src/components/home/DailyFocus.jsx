'use client';

import { useState, useEffect } from 'react';
import { mockTestApi } from '@/lib/api';

export default function DailyFocus() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyFocus();
  }, []);

  const fetchDailyFocus = async () => {
    try {
      setLoading(true);
      const [todayResponse, monthlyResponse] = await Promise.all([
        mockTestApi.getDailyFocusToday(),
        mockTestApi.getDailyFocusMonthly({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        }),
      ]);
      
      setTodayStatus(todayResponse.data);
      setMonthlyData(monthlyResponse.data);
    } catch (error) {
      console.error('Error fetching daily focus:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current and max streak
  const calculateStreaks = () => {
    if (!monthlyData?.calendar) return { current: 0, max: 0 };
    
    const calendar = [...monthlyData.calendar].reverse(); // Start from oldest
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate current streak (from today backwards)
    for (let i = calendar.length - 1; i >= 0; i--) {
      const day = calendar[i];
      const isPresent = day.status === 'present' || day.status === 'partial';
      
      if (day.date <= today) {
        if (isPresent) {
          if (day.date === today || currentStreak > 0) {
            currentStreak++;
          }
        } else {
          if (day.date < today) {
            currentStreak = 0;
          }
        }
      }
    }
    
    // Calculate max streak
    for (const day of calendar) {
      const isPresent = day.status === 'present' || day.status === 'partial';
      if (isPresent) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    return { current: currentStreak, max: maxStreak };
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="card animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];
  const isPresent = todayStatus?.status === 'present' || todayStatus?.status === 'partial';
  
  // Get focus message
  const getFocusMessage = () => {
    if (!isPresent) return 'Rest Day';
    const source = todayStatus?.source;
    if (source === 'mock_test') return 'Mock Test';
    if (source === 'custom_test') return 'Practice Test';
    return 'Study Day';
  };

  const getFocusEmoji = () => {
    if (!isPresent) return '😴';
    const source = todayStatus?.source;
    if (source === 'mock_test') return '📘';
    if (source === 'custom_test') return '🔥';
    return '📚';
  };

  // Calculate stats
  const presentDays = monthlyData?.calendar?.filter(
    day => day.status === 'present' || day.status === 'partial'
  ).length || 0;
  const totalDays = monthlyData?.calendar?.length || 0;
  const presentPercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const streaks = calculateStreaks();

  return (
    <div className="mb-6">
      {/* Attendance Widget - Full Width */}
      <div className="card bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Attendance</h3>
          <div className={`w-2 h-2 rounded-full ${
            isPresent ? 'bg-green-500' : 'bg-gray-300'
          }`} title={isPresent ? 'Present today' : 'Not attempted today'}></div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${presentPercentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">This Month</span>
            <span className="font-semibold text-gray-900">{presentDays} / {totalDays}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Max Streak</span>
            <span className="font-semibold text-gray-900">{streaks.max} days</span>
          </div>
        </div>

         {/* Compact Calendar with Day Names */}
         {monthlyData && (
           <div className="border-t border-gray-100 pt-3">
             {/* Day Name Headers */}
             <div className="grid grid-cols-7 gap-1 mb-1">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                 <div key={dayName} className="text-center text-xs font-medium text-gray-500">
                   {dayName}
                 </div>
               ))}
             </div>
             
             {/* Calendar Grid */}
             <div className="grid grid-cols-7 gap-1">
               {(() => {
                 const firstDay = new Date(monthlyData.calendar[0]?.date);
                 const firstDayOfWeek = firstDay.getDay();
                 const emptyCells = Array.from({ length: firstDayOfWeek }).map((_, i) => (
                   <div key={`empty-${i}`} className="w-8 h-8"></div>
                 ));
                 
                 const dayCells = monthlyData.calendar.map((day) => {
                   const isToday = day.date === todayDateStr;
                   const isPresentDay = day.status === 'present' || day.status === 'partial';
                   const dayNumber = new Date(day.date).getDate();
                   
                   return (
                     <div
                       key={day.date}
                       className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                         isToday
                           ? 'bg-primary text-white border-2 border-primary'
                           : isPresentDay
                           ? 'bg-green-100 text-green-700 border border-green-300'
                           : 'bg-gray-100 text-gray-500 border border-gray-200'
                       }`}
                       title={`${dayNumber} - ${day.status_display || 'Rest Day'}`}
                     >
                       {dayNumber}
                     </div>
                   );
                 });
                 
                 return [...emptyCells, ...dayCells];
               })()}
             </div>
           </div>
         )}
      </div>
    </div>
  );
}
