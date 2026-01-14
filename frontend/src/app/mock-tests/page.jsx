import Link from 'next/link';
import { mockTestApi } from '@/lib/api';

export default async function MockTestsPage() {
  let tests = [];
  let error = null;

  try {
    const response = await mockTestApi.getAll();
    tests = response.data?.results || response.data || [];
  } catch (err) {
    error = 'Failed to load mock tests. Please try again later.';
    console.error('Error fetching mock tests:', err);
  }

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Mock Tests</h1>
          <p className="section-subtitle">
            Practice with comprehensive mock tests designed to mirror real exam
            conditions
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tests Grid */}
        {tests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <MockTestCard key={test.id} test={test} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No Mock Tests Available
            </h3>
            <p className="text-gray-600">
              Check back soon for new mock tests!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MockTestCard({ test }) {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
    very_hard: 'bg-purple-100 text-purple-800',
  };

  const difficulty = test.difficulty_level || test.difficulty?.level || 'medium';
  const durationHours = Math.floor(test.duration_minutes / 60);
  const durationMins = test.duration_minutes % 60;

  return (
    <div className="card hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex-1">
          {test.title}
        </h3>
        {test.is_vip && (
          <span className="bg-accent-1 text-white text-xs font-bold px-2 py-1 rounded">
            VIP
          </span>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📊</span>
          <span>
            {test.total_questions || test.questions_count || 0} Questions
          </span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">⏱️</span>
          <span>
            {durationHours > 0 && `${durationHours}h `}
            {durationMins}m
          </span>
        </div>
        <div className="flex items-center text-gray-600">
          <span className="mr-2">📝</span>
          <span>{test.total_marks} Marks</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">🎯</span>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              difficultyColors[difficulty] || difficultyColors.medium
            }`}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        </div>
        {test.category_name && (
          <div className="flex items-center text-gray-600">
            <span className="mr-2">📁</span>
            <span>{test.category_name}</span>
          </div>
        )}
      </div>

      <Link
        href={`/mock-tests/${test.id}`}
        className="btn-primary w-full text-center block"
      >
        Start Test
      </Link>
    </div>
  );
}

