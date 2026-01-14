'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const onboardingScreens = [
  {
    title: 'Prepare Smarter, Not Harder',
    subtitle:
      'Personalized mock tests, rank prediction, college guidance & scholarships — all in one place.',
    icon: '🎯',
    cta: 'Next',
  },
  {
    title: 'Track Your Progress',
    subtitle:
      'Daily goals, score analytics & trends to help you improve faster.',
    icon: '📊',
    cta: 'Next',
  },
  {
    title: 'Earn XP & Stay Motivated',
    subtitle:
      'Get rewards, see progress badges, and climb the leaderboards.',
    icon: '🏆',
    cta: 'Get Started',
  },
];

export default function OnboardingCarousel() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      router.push('/login');
    }
  };

  const handleSkip = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex flex-col">
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Carousel Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Screen Content */}
          <div className="text-center mb-12">
            <div className="text-7xl mb-6 animate-bounce">
              {onboardingScreens[currentScreen].icon}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {onboardingScreens[currentScreen].title}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {onboardingScreens[currentScreen].subtitle}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {onboardingScreens.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentScreen(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentScreen
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-gray-300'
                }`}
                aria-label={`Go to screen ${index + 1}`}
              />
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleNext}
            className="btn-primary w-full text-lg py-4"
          >
            {onboardingScreens[currentScreen].cta}
          </button>
        </div>
      </div>
    </div>
  );
}

