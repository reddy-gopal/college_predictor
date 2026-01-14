'use client';

import Link from 'next/link';
import { getTodaysTasks } from '@/lib/gamification';

export default function TodaysFocus({ profile, stats, activity }) {
  const tasks = getTodaysTasks(profile, stats, activity);

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
          <FocusTask key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function FocusTask({ task }) {
  const priorityColors = {
    high: 'border-accent-3/30 bg-accent-3/5',
    medium: 'border-accent-1/30 bg-accent-1/5',
    low: 'border-gray-200 bg-gray-50',
  };

  return (
    <Link
      href={task.href}
      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md ${priorityColors[task.priority]}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-primary font-bold">✓</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{task.title}</div>
          <div className="text-sm text-gray-600">{task.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-accent-1">
          +{task.xpReward} XP
        </span>
        <span className="btn-primary text-sm py-2 px-4">{task.cta}</span>
      </div>
    </Link>
  );
}

