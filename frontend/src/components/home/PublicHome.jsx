'use client';

import Link from 'next/link';
import { mockTestApi } from '@/lib/api';
import { useState, useEffect } from 'react';

export default function PublicHome() {
  const [mockTestsCount, setMockTestsCount] = useState(0);

  useEffect(() => {
    // Fetch mock tests count
    mockTestApi
      .getAll()
      .then((response) => {
        const count =
          response.data?.results?.length || response.data?.length || 0;
        setMockTestsCount(count);
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  return (
    <div className="pt-16 md:pt-20">
      {/* Hero Section */}
      <section className="section-container py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Practice Smart.{' '}
            <span className="text-gradient">Predict Your Rank.</span>{' '}
            Choose the Right College.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comprehensive platform for competitive exam preparation with mock
            tests, college prediction, and rank estimation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding" className="btn-primary text-lg px-8 py-4">
              Get Started Free
            </Link>
            <Link
              href="/mock-tests"
              className="btn-secondary text-lg px-8 py-4"
            >
              Explore Mock Tests
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-container py-16 bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="section-title">Why Choose Us</h2>
          <p className="section-subtitle">
            Everything you need to excel in competitive exams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="📝"
            title="Mock Tests"
            description={`Access ${mockTestsCount}+ comprehensive mock tests designed to mirror real exam conditions.`}
            href="/mock-tests"
            color="primary"
          />
          <FeatureCard
            icon="🎓"
            title="College Predictor"
            description="Find the best colleges you're eligible for based on your rank, category, and preferences."
            href="/predict-college"
            color="secondary"
          />
          <FeatureCard
            icon="💰"
            title="Scholarships"
            description="Discover scholarship opportunities to fund your education. (Coming Soon)"
            href="/scholarships"
            color="accent-1"
            disabled
          />
        </div>
      </section>

      {/* Social Proof */}
      <section className="section-container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Trusted by Thousands of Students
            </h2>
            <p className="text-gray-600">
              Join students who are achieving their dreams
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Helped me identify the right colleges for my rank!"
              author="Rahul K."
              exam="JEE Main"
            />
            <TestimonialCard
              quote="Mock tests are exactly like the real exam. Great practice!"
              author="Priya S."
              exam="NEET"
            />
            <TestimonialCard
              quote="The rank predictor is incredibly accurate. Highly recommend!"
              author="Amit M."
              exam="JEE Advanced"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-container py-16 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl my-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of students who are already using our platform to
            achieve their dreams.
          </p>
          <Link
            href="/onboarding"
            className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, href, color, disabled }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
    'accent-1': 'from-accent-1/10 to-accent-1/5 border-accent-1/20',
  };

  const content = (
    <div
      className={`card bg-gradient-to-br ${colorClasses[color]} border-2 h-full ${
        disabled ? 'opacity-60' : 'hover:scale-105 cursor-pointer'
      }`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function TestimonialCard({ quote, author, exam }) {
  return (
    <div className="card text-center">
      <div className="text-4xl mb-4">⭐</div>
      <p className="text-gray-700 mb-4 italic">&quot;{quote}&quot;</p>
      <div className="text-sm">
        <div className="font-semibold text-gray-900">{author}</div>
        <div className="text-gray-600">{exam} Aspirant</div>
      </div>
    </div>
  );
}

