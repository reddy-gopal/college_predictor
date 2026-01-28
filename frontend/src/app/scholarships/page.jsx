'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ScholarshipApi } from '@/lib/api';

const SCHOLARSHIP_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'merit_based', label: 'Merit Based' },
  { value: 'need_based', label: 'Need Based' },
  { value: 'sports', label: 'Sports' },
  { value: 'minority', label: 'Minority' },
  { value: 'disability', label: 'Disability' },
  { value: 'research', label: 'Research' },
  { value: 'other', label: 'Other' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

export default function ScholarshipsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [hasOnboarding, setHasOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchScholarships();
    }
  }, [user, typeFilter, statusFilter]);

  const checkOnboardingStatus = async () => {
    try {
      setCheckingOnboarding(true);
      const response = await ScholarshipApi.getOnboarding();
      // If we get data back and it has required fields, onboarding is complete
      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        const isComplete = data.stream && data.board && data.state && 
                          data.category && data.family_income_range && 
                          data.gender && data.age;
        setHasOnboarding(isComplete);
      } else {
        setHasOnboarding(false);
      }
    } catch (err) {
      // 404 means no onboarding data exists
      if (err.response?.status === 404) {
        setHasOnboarding(false);
      } else {
        console.error('Error checking onboarding status:', err);
        // On error, assume not completed to show the card
        setHasOnboarding(false);
      }
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.scholarship_type = typeFilter;
      
      const response = await ScholarshipApi.getScholarships(params);
      setScholarships(response.data || []);
    } catch (err) {
      console.error('Error fetching scholarships:', err);
      setError('Failed to load scholarships. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredScholarships = scholarships.filter((scholarship) => {
    const matchesSearch =
      !searchQuery ||
      scholarship.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scholarship.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scholarship.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatAmount = (amount, description) => {
    if (description) return description;
    if (amount) {
      return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
    }
    return 'Amount not specified';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilDeadline = (dateString) => {
    if (!dateString) return null;
    const deadline = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-red-100 text-red-800 border-red-300',
      archived: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return badges[status] || badges.active;
  };

  const getTypeBadge = (type) => {
    const badges = {
      merit_based: 'bg-blue-100 text-blue-800',
      need_based: 'bg-purple-100 text-purple-800',
      sports: 'bg-orange-100 text-orange-800',
      minority: 'bg-pink-100 text-pink-800',
      disability: 'bg-yellow-100 text-yellow-800',
      research: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return badges[type] || badges.other;
  };

  if (authLoading || loading) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-niat-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Scholarships</h1>
              <p className="text-gray-600">
                Discover scholarship opportunities to fund your education
              </p>
            </div>
            <Link href="/scholarships/applied" className="btn-secondary">
              View My Applications
            </Link>
          </div>

          {/* Filters */}
          <div className="card bg-white mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Search scholarships..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input-field"
                >
                  {SCHOLARSHIP_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  {STATUS_FILTERS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card bg-red-50 border-red-200 text-red-800 mb-6">
            {error}
          </div>
        )}

        {/* Onboarding Card */}
        {!checkingOnboarding && !hasOnboarding && (
          <div className="card bg-[#FBEAD1] border-2 border-niat-primary/30 mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🎯</span>
                    <h2 className="text-xl font-bold text-niat-text">
                      Complete the onboarding to personalize the Scholarships
                    </h2>
                  </div>
                  <p className="text-niat-text-secondary">
                    Help us understand your preferences to get personalized scholarship recommendations tailored just for you.
                  </p>
                </div>
                <Link
                  href="/scholarships/onboarding"
                  className="btn-primary whitespace-nowrap"
                >
                  Complete Onboarding →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          {filteredScholarships.length} scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
        </div>

        {/* Scholarships Grid */}
        {filteredScholarships.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No scholarships found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships.map((scholarship) => {
              const daysUntil = getDaysUntilDeadline(scholarship.application_deadline);
              const isUrgent = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

              return (
                <Link
                  key={scholarship.id}
                  href={`/scholarships/${scholarship.slug}`}
                  className="card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                        {scholarship.title}
                      </h3>
                      <p className="text-sm text-gray-600">{scholarship.provider_name}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadge(
                        scholarship.status
                      )}`}
                    >
                      {scholarship.status}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="mb-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${getTypeBadge(
                        scholarship.scholarship_type
                      )}`}
                    >
                      {scholarship.scholarship_type?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                    {scholarship.description}
                  </p>

                  {/* Amount */}
                  <div className="mb-4">
                    <div className="text-lg font-bold text-niat-primary">
                      {formatAmount(scholarship.amount, scholarship.amount_description)}
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Deadline:</span>{' '}
                      {formatDate(scholarship.application_deadline)}
                    </div>
                    {isUrgent && (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        {daysUntil === 0 ? 'Today' : `${daysUntil} days left`}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
