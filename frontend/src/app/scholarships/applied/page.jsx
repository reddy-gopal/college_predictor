'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ScholarshipApi } from '@/lib/api';

export default function AppliedScholarshipsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchAppliedScholarships();
    }
  }, [user, authLoading, router]);

  const fetchAppliedScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ScholarshipApi.getAppliedScholarships();
      setInteractions(response.data || []);
    } catch (err) {
      console.error('Error fetching applied scholarships:', err);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInteractions = interactions.filter((interaction) => {
    if (!statusFilter) return true;
    return interaction.status === statusFilter;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'bg-gray-100 text-gray-800 border-gray-300',
      viewed: 'bg-blue-100 text-blue-800 border-blue-300',
      redirected: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      applied: 'bg-green-100 text-green-800 border-green-300',
      result_received: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return badges[status] || badges.not_started;
  };

  const getStatusCounts = () => {
    const counts = {
      all: interactions.length,
      not_started: 0,
      viewed: 0,
      redirected: 0,
      applied: 0,
      result_received: 0,
    };

    interactions.forEach((interaction) => {
      if (counts[interaction.status] !== undefined) {
        counts[interaction.status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📋 My Scholarship Applications
              </h1>
              <p className="text-gray-600">
                Track your scholarship applications and their status
              </p>
            </div>
            <Link href="/scholarships" className="btn-primary">
              Browse Scholarships
            </Link>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="card text-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="card text-center bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-2xl font-bold text-blue-900">{statusCounts.viewed}</div>
              <div className="text-sm text-blue-600">Viewed</div>
            </div>
            <div className="card text-center bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="text-2xl font-bold text-yellow-900">{statusCounts.redirected}</div>
              <div className="text-sm text-yellow-600">Redirected</div>
            </div>
            <div className="card text-center bg-gradient-to-br from-green-50 to-green-100">
              <div className="text-2xl font-bold text-green-900">{statusCounts.applied}</div>
              <div className="text-sm text-green-600">Applied</div>
            </div>
            <div className="card text-center bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="text-2xl font-bold text-purple-900">{statusCounts.result_received}</div>
              <div className="text-sm text-purple-600">Result</div>
            </div>
          </div>

          {/* Filter */}
          <div className="card bg-white mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="viewed">Viewed</option>
              <option value="redirected">Redirected</option>
              <option value="applied">Applied</option>
              <option value="result_received">Result Received</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card bg-red-50 border-red-200 text-red-800 mb-6">
            {error}
          </div>
        )}

        {/* Applications List */}
        {filteredInteractions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">
              {interactions.length === 0 ? '📭' : '🔍'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {interactions.length === 0
                ? 'No applications yet'
                : 'No applications match this filter'}
            </h3>
            <p className="text-gray-600 mb-6">
              {interactions.length === 0
                ? 'Start browsing scholarships to track your applications'
                : 'Try selecting a different status filter'}
            </p>
            <Link href="/scholarships" className="btn-primary">
              Browse Scholarships
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInteractions.map((interaction) => {
              const scholarship = interaction.scholarship;
              if (!scholarship) return null;

              return (
                <Link
                  key={interaction.id}
                  href={`/scholarships/${scholarship.slug}`}
                  className="card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Scholarship Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 flex-1">
                          {scholarship.title}
                        </h3>
                        <span
                          className={`px-3 py-1 text-sm font-semibold rounded border whitespace-nowrap ${getStatusBadge(
                            interaction.status
                          )}`}
                        >
                          {interaction.status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{scholarship.provider_name}</p>
                      {scholarship.amount_description && (
                        <p className="text-niat-primary font-semibold">
                          {scholarship.amount_description}
                        </p>
                      )}
                    </div>

                    {/* Application Details */}
                    <div className="md:text-right space-y-1">
                      {interaction.applied_at && (
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Applied:</span>{' '}
                          {formatDate(interaction.applied_at)}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">Last Updated:</span>{' '}
                        {formatDate(interaction.last_interacted_at || interaction.updated_at)}
                      </div>
                      {scholarship.application_deadline && (
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Deadline:</span>{' '}
                          {formatDate(scholarship.application_deadline)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {interaction.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">Notes:</span> {interaction.notes}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

