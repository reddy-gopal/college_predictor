'use client';

import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    {
      title: 'Mock Tests',
      icon: '📝',
      href: '/mock-tests',
      color: 'primary',
    },
    {
      title: 'Rank Predictor',
      icon: '📊',
      href: '/predict-rank',
      color: 'secondary',
    },
    {
      title: 'College Predictor',
      icon: '🎓',
      href: '/predict-college',
      color: 'accent-1',
    },
    {
      title: 'Scholarships',
      icon: '💰',
      href: '/scholarships',
      color: 'accent-2',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {actions.map((action) => (
        <QuickActionCard key={action.href} action={action} />
      ))}
    </div>
  );
}

function QuickActionCard({ action }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/40',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20 hover:border-accent-1/40',
    'accent-2': 'from-accent-2/10 to-accent-2/5 border-accent-2/20 hover:border-accent-2/40',
  };

  return (
    <Link
      href={action.href}
      className={`card bg-gradient-to-br ${colorClasses[action.color]} border-2 text-center transition-all hover:scale-105`}
    >
      <div className="text-4xl mb-3">{action.icon}</div>
      <div className="font-semibold text-gray-900">{action.title}</div>
    </Link>
  );
}

