import Link from 'next/link';

export default function ScholarshipsPage() {
  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-gray-50">
      <div className="section-container py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-8xl mb-6">💰</div>
          <h1 className="section-title">Scholarships</h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover scholarship opportunities to fund your education
          </p>

          <div className="card bg-gradient-to-br from-accent-1/10 to-accent-2/10 border-2 border-accent-1/20">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              We're working hard to bring you comprehensive scholarship
              information. This feature will help you discover and apply for
              various scholarship opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-primary">
                Back to Home
              </Link>
              <Link href="/mock-tests" className="btn-secondary">
                Explore Mock Tests
              </Link>
            </div>
          </div>

          {/* Placeholder Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeaturePlaceholder
              icon="🔍"
              title="Search Scholarships"
              description="Find scholarships matching your profile"
            />
            <FeaturePlaceholder
              icon="📋"
              title="Application Tracker"
              description="Track your scholarship applications"
            />
            <FeaturePlaceholder
              icon="📊"
              title="Eligibility Checker"
              description="Check your eligibility instantly"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePlaceholder({ icon, title, description }) {
  return (
    <div className="card text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

