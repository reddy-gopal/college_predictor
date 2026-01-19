'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function PublicHome() {
  const router = useRouter();
  const { user } = useAuth();

  const handleAttemptTest = () => {
    if (user) {
      router.push('/mock-tests');
    } else {
      router.push('/login');
    }
  };

  // Scroll to "How it works" section if hash is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#how-it-works') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const element = document.getElementById('how-it-works');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
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
            <button
              onClick={handleAttemptTest}
              className="btn-secondary text-lg px-8 py-4"
            >
              Attempt a Test
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Demo Section */}
      <section id="how-it-works" className="section-container py-16 bg-white">
        <div className="text-center mb-12">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            See how easy it is to improve your exam preparation
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <DemoStep
              step={1}
              icon="📝"
              title="Take Mock Tests"
              description="Practice with comprehensive mock tests that mirror real exam conditions. Get instant feedback on your performance."
            />
            <DemoStep
              step={2}
              icon="📊"
              title="Track Your Progress"
              description="Monitor your scores, percentiles, and improvement over time. Identify weak areas and focus your studies."
            />
            <DemoStep
              step={3}
              icon="🎯"
              title="Achieve Your Goals"
              description="Set targets, track streaks, earn XP, and stay motivated. Get personalized recommendations to reach your dream college."
            />
          </div>

          {/* Demo Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <DemoCard
              title="📊 Real-Time Dashboard"
              features={[
                "Track your latest scores and best percentile",
                "Monitor your rank category progress",
                "View XP points and level progression",
                "See your daily attendance streak"
              ]}
              color="primary"
            />
            <DemoCard
              title="🎮 Gamification System"
              features={[
                "Earn XP points for completing tests",
                "Maintain daily streaks for bonus rewards",
                "Complete weekly goals for extra XP",
                "Level up as you progress"
              ]}
              color="secondary"
            />
          </div>

          {/* CTA in Demo Section */}
          <div className="text-center">
            <button
              onClick={handleAttemptTest}
              className="btn-primary text-lg px-8 py-4"
            >
              Attempt a Test Now
            </button>
            <p className="text-sm text-gray-600 mt-4">
              {user ? 'Continue to mock tests' : 'Sign in to get started'}
            </p>
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
            description="Access comprehensive mock tests designed to mirror real exam conditions with detailed explanations."
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block text-center"
            >
              Get Started Free
            </Link>
            <button
              onClick={handleAttemptTest}
              className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-colors"
            >
              Attempt a Test
            </button>
          </div>
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

function DemoStep({ step, icon, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-2xl mb-4">
        {step}
      </div>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function DemoCard({ title, features, color }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
  };

  return (
    <div className={`card bg-gradient-to-br ${colorClasses[color]} border-2`}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-primary mt-1">✓</span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
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

