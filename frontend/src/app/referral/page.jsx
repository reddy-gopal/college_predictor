'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function ReferralPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('refer-earn');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getReferralStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching referral stats:', err);
      setError('Failed to load referral statistics');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    if (navigator.share && stats?.referral_link) {
      navigator.share({
        title: 'Join me on College Predictor!',
        text: `Use my referral code ${stats.referral_code} to get started!`,
        url: stats.referral_link,
      }).catch(() => {
        copyToClipboard(stats.referral_link);
      });
    } else if (stats?.referral_link) {
      copyToClipboard(stats.referral_link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="section-container py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="section-container py-12">
          <div className="card bg-white text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchStats} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = stats?.next_milestone?.referrals_remaining
    ? Math.min(100, ((stats.total_referrals / stats.next_milestone.referrals_needed) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="section-container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#A33131] mb-2">
            Refer & Earn
          </h1>
          <p className="text-niat-text">
            Invite friends and earn room credits to create more guild rooms!
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-niat-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('refer-earn')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'refer-earn'
                  ? 'border-niat-primary text-niat-primary'
                  : 'border-transparent text-niat-text-secondary hover:text-niat-text'
              }`}
            >
              Refer & Earn
            </button>
            <button
              onClick={() => setActiveTab('referees')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'referees'
                  ? 'border-niat-primary text-niat-primary'
                  : 'border-transparent text-niat-text-secondary hover:text-niat-text'
              }`}
            >
              My Referees
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'refer-earn' && (
          <ReferAndEarnTab
            stats={stats}
            copied={copied}
            onCopy={copyToClipboard}
            onShare={shareLink}
            error={error}
            onRetry={fetchStats}
          />
        )}

        {activeTab === 'referees' && <RefereesTab />}

      </div>
    </div>
  );
}

// Refer & Earn Tab Component
function ReferAndEarnTab({ stats, copied, onCopy, onShare, error, onRetry }) {
  const progressPercentage = stats?.next_milestone?.referrals_remaining
    ? Math.min(100, ((stats.total_referrals / stats.next_milestone.referrals_needed) * 100))
    : 100;

  if (error && !stats) {
    return (
      <div className="card bg-white text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Room Credits"
          value={stats?.room_credits || 0}
          icon="🎁"
          color="primary"
          description="Available credits to create rooms"
        />
        <StatCard
          title="Total Referrals"
          value={stats?.total_referrals || 0}
          icon="👥"
          color="secondary"
          description="Active referrals"
        />
        <StatCard
          title="Next Milestone"
          value={stats?.next_milestone?.referrals_remaining || 0}
          icon="🎯"
          color="accent-1"
          description={`${stats?.next_milestone?.referrals_needed || 0} referrals for ${stats?.next_milestone?.rewards || 0} credits`}
        />
      </div>

      {/* Referral Code Section */}
      <div className="card bg-[#FBEAD1] mb-8">
        <div className="p-6">
          <h2 className="text-xl font-bold text-niat-text mb-4">
            Your Referral Code
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 bg-gray-50 rounded-lg p-4 border-2 border-niat-primary">
              <p className="text-sm text-niat-text-secondary mb-1">Share this code:</p>
              <p className="text-2xl font-bold text-niat-primary font-mono">
                {stats?.referral_code || 'Loading...'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onShare}
                className="btn-primary whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Share Link'}
              </button>
              <button
                onClick={() => onCopy(stats?.referral_code || '')}
                className="btn-secondary whitespace-nowrap"
              >
                Copy Code
              </button>
            </div>
          </div>
          {stats?.referral_link && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-niat-text-secondary mb-1">Referral Link:</p>
              <p className="text-sm text-niat-text break-all font-mono">
                {stats.referral_link}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress to Next Milestone */}
      {stats?.next_milestone && (
        <div className="card bg-[#FAF3F3] mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-niat-text mb-4">
              Progress to Next Milestone
            </h2>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-niat-text-secondary">
                {stats.total_referrals} / {stats.next_milestone.referrals_needed} referrals
              </span>
              <span className="font-semibold text-niat-primary">
                +{stats.next_milestone.additional_credits} credits
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-niat-primary h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-niat-text-secondary mt-2">
              {stats.next_milestone.referrals_remaining} more referrals needed to unlock {stats.next_milestone.rewards} total credits
            </p>
          </div>
        </div>
      )}

      {/* Rewards Table */}
      <div className="card bg-white mb-8">
        <div className="p-6">
          <h2 className="text-xl font-bold text-niat-text mb-4">
            Rewards Structure
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-niat-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-niat-text">
                    Referrals
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-niat-text">
                    Room Credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { refs: '0-2', credits: 0 },
                  { refs: '3', credits: 1 },
                  { refs: '4', credits: 2 },
                  { refs: '5', credits: 5 },
                  { refs: '6-9', credits: 5 },
                  { refs: '10', credits: 7 },
                  { refs: '15', credits: 9 },
                  { refs: '20', credits: 11 },
                  { refs: '25+', credits: '11 + 2 per 5 refs' },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-niat-border ${
                      stats?.total_referrals >= parseInt(row.refs) || (row.refs.includes('-') && stats?.total_referrals >= 2)
                        ? 'bg-niat-primary/5'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-niat-text">
                      {row.refs}
                    </td>
                    <td className="py-3 px-4 text-sm text-niat-text font-semibold">
                      {row.credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reward History */}
      {stats?.reward_history && stats.reward_history.length > 0 && (
        <div className="card bg-white mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-niat-text mb-4">
              Reward History
            </h2>
            <div className="space-y-3">
              {stats.reward_history.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-niat-text">
                      {reward.type === 'first_login' ? 'First Login Bonus' : 'Referral Bonus'}
                    </p>
                    <p className="text-sm text-niat-text-secondary">
                      {new Date(reward.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-niat-primary text-lg">
                      +{reward.credits_awarded} credits
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      {stats?.room_credits < 1 && (
        <div className="card bg-gradient-to-br from-accent-1/10 to-accent-2/10 border-2 border-accent-1 mb-8">
          <div className="p-6 text-center">
            <h3 className="text-xl font-bold text-niat-text mb-2">
              Need More Credits?
            </h3>
            <p className="text-niat-text-secondary mb-4">
              You need at least 1 room credit to create a guild room. Share your referral code to earn credits!
            </p>
            <Link href="/guild/create" className="btn-primary inline-block">
              Create Guild Room
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// Referees Tab Component
function RefereesTab() {
  const { user } = useAuth();
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchReferees();
    }
  }, [user]);

  const fetchReferees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getReferees();
      // Assuming the API returns { data: { referees: [...] } }
      setReferees(response.data?.referees || response.data || []);
    } catch (err) {
      console.error('Error fetching referees:', err);
      setError(err.response?.data?.detail || 'Failed to load referees');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-white">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-white">
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchReferees} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-niat-text">
            My Referees
          </h2>
          <span className="text-sm text-niat-text-secondary">
            {referees.length} {referees.length === 1 ? 'referee' : 'referees'}
          </span>
        </div>

        {referees.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-niat-text-secondary mb-2">
              No referees yet
            </p>
            <p className="text-sm text-niat-text-secondary">
              Share your referral code to start referring students!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {referees.map((referee, index) => (
              <RefereeCard key={referee.id || index} referee={referee} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Referee Card Component
function RefereeCard({ referee }) {
  // Expected referee object structure (adjust based on your backend response):
  // {
  //   id: number,
  //   email: string,
  //   phone: string,
  //   full_name: string,
  //   status: 'pending' | 'active',
  //   joined_at: string (ISO date),
  //   activated_at: string (ISO date, optional)
  // }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-full bg-niat-primary/10 flex items-center justify-center">
          <span className="text-xl">👤</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-niat-text">
            {referee.full_name || referee.name || 'Anonymous User'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {referee.email && (
              <p className="text-sm text-niat-text-secondary">
                {referee.email}
              </p>
            )}
            {referee.phone && (
              <p className="text-sm text-niat-text-secondary">
                {referee.phone}
              </p>
            )}
          </div>
          <p className="text-xs text-niat-text-secondary mt-1">
            Joined: {new Date(referee.joined_at || referee.created_at || Date.now()).toLocaleDateString()}
            {referee.activated_at && (
              <span className="ml-2">
                • Activated: {new Date(referee.activated_at).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge(referee.status)}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, description }) {
  const colorClasses = {
    primary: {
      bg: 'bg-gradient-to-br from-niat-primary/10 to-niat-primary/5',
      border: 'border-2 border-niat-primary/20',
      text: 'text-niat-primary',
    },
    secondary: {
      bg: 'bg-gradient-to-br from-accent-2/10 to-accent-2/5',
      border: 'border-2 border-accent-2/20',
      text: 'text-accent-2',
    },
    'accent-1': {
      bg: 'bg-gradient-to-br from-accent-1/10 to-accent-1/5',
      border: 'border-2 border-accent-1/20',
      text: 'text-accent-1',
    },
  };

  const styles = colorClasses[color] || colorClasses.primary;

  return (
    <div className={`rounded-xl shadow-md p-6 ${styles.bg} ${styles.border} bg-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-3xl font-bold text-niat-text">
          {value}
        </span>
      </div>
      <h3 className="font-semibold text-niat-text mb-1">
        {title}
      </h3>
      <p className="text-xs text-niat-text-secondary">
        {description}
      </p>
    </div>
  );
}

