'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ScholarshipApi } from '@/lib/api';

export default function ScholarshipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [scholarship, setScholarship] = useState(null);
  const [eligibilityRules, setEligibilityRules] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && params.slug) {
      fetchScholarshipData();
    }
  }, [user, authLoading, router, params.slug]);

  const fetchScholarshipData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch scholarship details using slug
      const scholarshipResponse = await ScholarshipApi.getScholarshipBySlug(params.slug);
      setScholarship(scholarshipResponse.data);

      // Fetch eligibility rules using slug
      try {
        const rulesResponse = await ScholarshipApi.getScholarshipEligibilityRules(params.slug);
        setEligibilityRules(rulesResponse.data || []);
      } catch (err) {
        console.error('Error fetching eligibility rules:', err);
        setEligibilityRules([]);
      }

      // Fetch user's interaction with this scholarship using slug
      try {
        const interactionResponse = await ScholarshipApi.getInteraction(params.slug);
        if (interactionResponse.data && interactionResponse.data.length > 0) {
          setInteraction(interactionResponse.data[0]);
        }
      } catch (err) {
        // No interaction yet, that's fine
        setInteraction(null);
      }
    } catch (err) {
      console.error('Error fetching scholarship:', err);
      setError('Failed to load scholarship details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async () => {
    if (!interaction && scholarship) {
      // Create new interaction
      try {
        setUpdating(true);
        const response = await ScholarshipApi.createInteraction({
          scholarship: scholarship.id,
          status: 'viewed',
        });
        setInteraction(response.data);
      } catch (err) {
        console.error('Error creating interaction:', err);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleRedirect = async () => {
    if (scholarship?.official_url) {
      try {
        setUpdating(true);
        
        // Update or create interaction with 'redirected' status
        let updatedInteraction = null;
        if (interaction) {
          // Update existing interaction
          const response = await ScholarshipApi.updateInteraction(interaction.id, {
            status: 'redirected',
          });
          updatedInteraction = response.data;
        } else if (scholarship) {
          // Create new interaction with 'redirected' status
          const response = await ScholarshipApi.createInteraction({
            scholarship: scholarship.id,
            status: 'redirected',
          });
          updatedInteraction = response.data;
        }

        // Update local state with the response data
        if (updatedInteraction) {
          setInteraction(updatedInteraction);
        }

        // Open official URL in new tab after successful status update
        window.open(scholarship.official_url, '_blank');
      } catch (err) {
        console.error('Error updating interaction status:', err);
        // Show error to user
        setError('Failed to update application status. Please try again.');
        // Still open the URL even if status update fails
        window.open(scholarship.official_url, '_blank');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleMarkApplied = async () => {
    if (!scholarship) return;
    
    try {
      setUpdating(true);
      if (interaction) {
        const response = await ScholarshipApi.updateInteraction(interaction.id, {
          status: 'applied',
          applied_at: new Date().toISOString(),
        });
        setInteraction(response.data);
      } else {
        const response = await ScholarshipApi.createInteraction({
          scholarship: scholarship.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
        });
        setInteraction(response.data);
      }
    } catch (err) {
      console.error('Error updating interaction:', err);
      alert('Failed to update application status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

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

  const getInteractionStatusBadge = (status) => {
    const badges = {
      not_started: 'bg-gray-100 text-gray-800',
      viewed: 'bg-blue-100 text-blue-800',
      redirected: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-green-100 text-green-800',
      result_received: 'bg-purple-100 text-purple-800',
    };
    return badges[status] || badges.not_started;
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

  if (error || !scholarship) {
    return (
      <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
        <div className="section-container py-6">
          <div className="card bg-red-50 border-red-200 text-red-800">
            {error || 'Scholarship not found'}
          </div>
          <Link href="/scholarships" className="btn-primary mt-4 inline-block">
            Back to Scholarships
          </Link>
        </div>
      </div>
    );
  }

  const daysUntil = getDaysUntilDeadline(scholarship.application_deadline);
  const isUrgent = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-6">
        {/* Back Button */}
        <Link
          href="/scholarships"
          className="text-niat-primary hover:underline mb-4 inline-block"
        >
          ← Back to Scholarships
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded border ${getStatusBadge(
                        scholarship.status
                      )}`}
                    >
                      {scholarship.status}
                    </span>
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded ${getTypeBadge(
                        scholarship.scholarship_type
                      )}`}
                    >
                      {scholarship.scholarship_type?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {scholarship.title}
                  </h1>
                  <p className="text-lg text-gray-600">{scholarship.provider_name}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-6 p-4 bg-gradient-to-br from-accent-1/10 to-accent-2/10 border-2 border-accent-1/20 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Scholarship Amount</div>
                <div className="text-3xl font-bold text-niat-primary">
                  {formatAmount(scholarship.amount, scholarship.amount_description)}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                <div className="text-gray-700 whitespace-pre-line">
                  {scholarship.description}
                </div>
              </div>

              {/* Eligibility Rules */}
              {eligibilityRules.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Eligibility Requirements
                  </h2>
                  <div className="space-y-2">
                    {eligibilityRules.map((rule, index) => (
                      <div
                        key={rule.id || index}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-niat-primary font-bold mt-0.5">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {rule.rule_type?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                          {rule.description && (
                            <div className="text-gray-700 text-sm mt-1">
                              {rule.description}
                            </div>
                          )}
                          {rule.rule_value && (
                            <div className="text-gray-600 text-sm mt-1">
                              {typeof rule.rule_value === 'object'
                                ? JSON.stringify(rule.rule_value)
                                : rule.rule_value}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Status */}
            {interaction && (
              <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">Your Application Status</h3>
                <div className="mb-3">
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded ${getInteractionStatusBadge(
                      interaction.status
                    )}`}
                  >
                    {interaction.status?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
                {interaction.applied_at && (
                  <div className="text-sm text-gray-600">
                    Applied on:{' '}
                    {new Date(interaction.applied_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Key Information */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Key Information</h3>
              <div className="space-y-4">
                {/* Deadline */}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Application Deadline</div>
                  <div className="font-semibold text-gray-900">
                    {formatDate(scholarship.application_deadline)}
                  </div>
                  {isUrgent && (
                    <div className="text-sm text-red-600 font-semibold mt-1">
                      {daysUntil === 0
                        ? '⚠️ Deadline is today!'
                        : `⚠️ Only ${daysUntil} day${daysUntil !== 1 ? 's' : ''} left!`}
                    </div>
                  )}
                </div>

                {/* Provider */}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Provider</div>
                  <div className="font-semibold text-gray-900">
                    {scholarship.provider_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {scholarship.official_url ? (
                  <button
                    onClick={handleRedirect}
                    disabled={updating}
                    className="btn-primary w-full"
                  >
                    {updating ? 'Loading...' : 'Apply on Official Website'}
                  </button>
                ) : (
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    Official application link not available
                  </div>
                )}

                {interaction?.status !== 'applied' && (
                  <button
                    onClick={handleMarkApplied}
                    disabled={updating}
                    className="btn-secondary w-full"
                  >
                    {updating ? 'Updating...' : 'Mark as Applied'}
                  </button>
                )}

                <Link href="/scholarships" className="btn-secondary w-full text-center block">
                  Back to Scholarships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
