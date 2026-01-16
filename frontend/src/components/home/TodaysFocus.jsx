'use client';

import { useRouter } from 'next/navigation';
import { mockTestApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function TodaysFocus({ user, stats, activity }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysTasks();
  }, [user]);

  // Refresh tasks when user data changes (e.g., after completing a test)
  useEffect(() => {
    if (user) {
      // Small delay to ensure backend has processed test completion
      const timer = setTimeout(() => {
        fetchTodaysTasks();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.total_xp]); // Refresh when XP changes (indicates test completion)

  const fetchTodaysTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await mockTestApi.getTodaysTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Focus for Today
        </h2>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Focus for Today
        </h2>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎉</div>
          <p>Great job! You've completed today's tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Your Focus for Today
      </h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <FocusTask 
            key={task.id} 
            task={task} 
            onTaskComplete={fetchTodaysTasks}
          />
        ))}
      </div>
    </div>
  );
}

function FocusTask({ task, onTaskComplete }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [completing, setCompleting] = useState(false);
  
  const priorityColors = {
    high: 'border-accent-3/30 bg-accent-3/5',
    medium: 'border-accent-1/30 bg-accent-1/5',
    low: 'border-gray-200 bg-gray-50',
  };

  const handleTaskClick = async (e) => {
    e.preventDefault();
    
    try {
      setCompleting(true);
      
      // Only mark "review-questions" task as complete manually
      // "take-test" and "weekly-goal" are completed automatically when tests are submitted
      if (task.id === 'review-questions') {
        try {
          await mockTestApi.completeTask({
            task_id: task.id,
          });
          // Refresh user data to get updated XP
          await refreshUser();
          // Refresh tasks to remove completed one
          if (onTaskComplete) {
            await onTaskComplete();
          }
        } catch (error) {
          console.error('Error completing task:', error);
          // Continue navigation even if API call fails
        }
        router.push('/mistake-notebook');
      } else {
        // For "take-test" and "weekly-goal", just navigate
        // XP will be awarded automatically when test is completed
        router.push('/mock-tests');
      }
    } catch (error) {
      console.error('Error:', error);
      // Still navigate even if there's an error
      if (task.id === 'review-questions') {
        router.push('/mistake-notebook');
      } else {
        router.push('/mock-tests');
      }
    } finally {
      setCompleting(false);
    }
  };

  return (
    <button
      onClick={handleTaskClick}
      disabled={completing}
      className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md ${priorityColors[task.priority]} ${
        completing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-primary font-bold">✓</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-900">{task.title}</div>
          <div className="text-sm text-gray-600">{task.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-accent-1">
          +{task.xp_reward || task.xpReward} XP
        </span>
        <span className="btn-primary text-sm py-2 px-4">
          {completing ? 'Loading...' : (task.cta || 'Start')}
        </span>
      </div>
    </button>
  );
}

