'use client';

import Link from 'next/link';
import { getUserProfile } from '@/lib/gamification';

export default function Recommendations({ activity }) {
  const profile = getUserProfile();
  const recentTests = activity?.recentTests || [];
  const testCount = recentTests.length;

  // Recommend next test type based on count
  const getTestRecommendation = () => {
    if (testCount === 0) {
      return {
        type: 'Practice Test',
        description: 'Start with a practice test to assess your current level',
        href: '/mock-tests',
      };
    } else if (testCount < 3) {
      return {
        type: 'Full Length Test',
        description: 'Try a full-length test to simulate the real exam experience',
        href: '/mock-tests',
      };
    } else {
      return {
        type: 'Sectional Test',
        description: 'Focus on specific subjects with sectional tests',
        href: '/mock-tests',
      };
    }
  };

  const testRec = getTestRecommendation();

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Recommendations
      </h2>
      <div className="space-y-4">
        {/* Test Recommendation */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1">
                {testRec.type}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {testRec.description}
              </div>
              <Link href={testRec.href} className="btn-primary text-sm py-2 px-4">
                Explore Tests
              </Link>
            </div>
          </div>
        </div>

        {/* Scholarship Recommendation */}
        {profile && (
          <div className="p-4 bg-accent-1/5 rounded-lg border border-accent-1/20">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💰</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  Explore Scholarships
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  Discover scholarship opportunities that match your profile
                </div>
                <Link
                  href="/scholarships"
                  className="btn-accent text-sm py-2 px-4"
                >
                  View Scholarships
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

