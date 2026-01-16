'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { mockTestApi, rankPredictorApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    latestScore: null,
    bestPercentile: null,
    predictedRank: null,
    xp: 0,
    nextLevelXP: 100,
  });
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      router.push('/login');
      return;
    }

    setUser(authUser);
    loadDashboardData();
  }, [authUser, authLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Load actual data from APIs
      // For now, use mock data
      setStats({
        latestScore: 320,
        bestPercentile: 85.5,
        predictedRank: 'Safe',
        xp: 750,
        nextLevelXP: 1000,
      });

      // Load test attempts
      // const attempts = await mockTestApi.getUserAttempts();
      // setTestHistory(attempts);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const examTarget = user.exam_target || 'JEE Main';
  const daysLeft = 120; // TODO: Calculate from exam date
  const xpPercentage = (stats.xp / stats.nextLevelXP) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pt-20">
      <div className="section-container py-6">
        {/* Top Status Bar */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-white mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Hi, {user.full_name || 'Student'} 👋
              </h1>
              <p className="text-white/90">
                {examTarget} • {daysLeft} days left
              </p>
            </div>
            {stats.predictedRank && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="text-sm opacity-90">Predicted Category</div>
                <div className="text-xl font-bold">{stats.predictedRank}</div>
              </div>
            )}
          </div>
        </div>

        {/* Current Snapshot Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SnapshotCard
            label="Latest Score"
            value={stats.latestScore || 'N/A'}
            icon="📊"
            color="primary"
          />
          <SnapshotCard
            label="Best Percentile"
            value={stats.bestPercentile ? `${stats.bestPercentile}%` : 'N/A'}
            icon="🏆"
            color="secondary"
          />
          <SnapshotCard
            label="Rank Category"
            value={stats.predictedRank || 'N/A'}
            icon="🎯"
            color="accent-1"
          />
          <div className="card bg-gradient-to-br from-accent-2/10 to-accent-3/10 border-2 border-accent-2/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">XP</span>
              <span className="text-xs text-gray-600">
                {stats.xp}/{stats.nextLevelXP}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-accent-2 to-accent-3 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(xpPercentage, 100)}%` }}
              />
            </div>
            <div className="text-lg font-bold text-gray-900">
              Level {Math.floor(stats.xp / 100) + 1}
            </div>
          </div>
        </div>

        {/* Progress Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ProgressCard
            title="Score Trend"
            data={[280, 295, 310, 305, 320]}
            type="line"
          />
          <ProgressCard
            title="Subject Accuracy"
            data={[
              { label: 'Physics', value: 85 },
              { label: 'Chemistry', value: 78 },
              { label: 'Math', value: 92 },
            ]}
            type="bar"
          />
          <ProgressCard
            title="Time per Question"
            data={[2.5, 2.3, 2.1, 2.0, 1.9]}
            type="line"
            unit="min"
          />
        </div>

        {/* Today's Focus */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Your Focus for Today
          </h2>
          <div className="space-y-3">
            <FocusTask
              task="Take a practice test"
              xp="+50 XP"
              href="/mock-tests"
            />
            <FocusTask
              task="Review weak questions"
              xp="+20 XP"
              href="/dashboard/review"
            />
          </div>
          <Link href="/mock-tests" className="btn-primary w-full mt-4">
            Start Now
          </Link>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickLinkCard
            title="Mock Tests"
            icon="📝"
            href="/mock-tests"
            color="primary"
          />
          <QuickLinkCard
            title="Rank Predictor"
            icon="📊"
            href="/predict-rank"
            color="secondary"
          />
          <QuickLinkCard
            title="College Predictor"
            icon="🎓"
            href="/predict-college"
            color="accent-1"
          />
          <QuickLinkCard
            title="Scholarships"
            icon="💰"
            href="/scholarships"
            color="accent-2"
          />
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, icon, color }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20',
  };

  return (
    <div
      className={`card bg-gradient-to-br ${colorClasses[color]} border-2 text-center`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ProgressCard({ title, data, type, unit = '' }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-32 flex items-end justify-between gap-1">
        {type === 'line' &&
          data.map((value, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-primary to-secondary rounded-t"
              style={{ height: `${(value / Math.max(...data)) * 100}%` }}
              title={`${value}${unit}`}
            />
          ))}
        {type === 'bar' &&
          data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-primary to-secondary rounded-t mb-2"
                style={{ height: `${item.value}%` }}
                title={`${item.label}: ${item.value}%`}
              />
              <span className="text-xs text-gray-600 text-center">
                {item.label.slice(0, 3)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function FocusTask({ task, xp, href }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-primary">✓</span>
        </div>
        <span className="font-medium text-gray-900">{task}</span>
      </div>
      <span className="text-sm font-semibold text-accent-1">{xp}</span>
    </Link>
  );
}

function QuickLinkCard({ title, icon, href, color }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/40',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20 hover:border-accent-1/40',
    'accent-2': 'from-accent-2/10 to-accent-2/5 border-accent-2/20 hover:border-accent-2/40',
  };

  return (
    <Link
      href={href}
      className={`card bg-gradient-to-br ${colorClasses[color]} border-2 text-center transition-all hover:scale-105`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-semibold text-gray-900">{title}</div>
    </Link>
  );
}

