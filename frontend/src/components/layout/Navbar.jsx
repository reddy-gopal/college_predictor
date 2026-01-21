'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { roomApi } from '@/lib/api';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for active room
  useEffect(() => {
    const checkActiveRoom = async () => {
      if (!user) {
        setActiveRoom(null);
        return;
      }
      
      // Don't show "Return to Room" if already on a room page (lobby, test, or results)
      if (pathname?.match(/\/guild\/[A-Z0-9]+\/(lobby|test|results)/)) {
        setActiveRoom(null);
        return;
      }
      
      try {
        const response = await roomApi.getMyActiveRoom();
        if (response.data.has_active_room && response.data.room) {
          setActiveRoom(response.data.room);
        } else {
          setActiveRoom(null);
        }
      } catch (err) {
        // Silently fail - user might not have an active room
        setActiveRoom(null);
      }
    };

    if (user) {
      checkActiveRoom();
      // Check periodically (every 10 seconds) for active room
      const interval = setInterval(checkActiveRoom, 10000);
      return () => clearInterval(interval);
    } else {
      setActiveRoom(null);
    }
  }, [user, pathname]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileMenuOpen && !event.target.closest('.relative')) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isProfileMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/mock-tests', label: 'Mock Tests' },
    { href: '/guild', label: 'Guild', icon: '🎯' },
    { href: '/predict-college', label: 'College Predictor' },
    { href: '/predict-rank', label: 'Rank Predictor' },
    { href: '/scholarships', label: 'Scholarships' },
  ];

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-md border-b border-gray-200'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <div className="section-container px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-sm sm:text-lg">CP</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">
              College Predictor
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Return to Room Button */}
            {activeRoom && (
              <button
                onClick={() => router.push(`/guild/${activeRoom.code}/lobby`)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5"
                title={`Return to Room ${activeRoom.code}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Room {activeRoom.code}</span>
              </button>
            )}
          </div>

          {/* Login/Profile Button */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span>{user.full_name || user.name || 'Profile'}</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/mistake-notebook"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mistake Notebook
                    </Link>
                    <Link
                      href="/referral"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span>🎁</span>
                      <span>Refer & Earn</span>
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-200 mt-1 pt-2"
                    >
                      Update Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3 sm:py-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all ${
                  pathname === link.href
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            </div>
            {/* Return to Room Button (Mobile) */}
            {activeRoom && (
              <button
                onClick={() => {
                  router.push(`/guild/${activeRoom.code}/lobby`);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
                title={`Return to Room ${activeRoom.code}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Room {activeRoom.code}</span>
              </button>
            )}
            <div className="px-4 pt-2 pb-3 space-y-2 border-t border-gray-200 mt-2">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="btn-secondary w-full text-sm py-2.5 text-center block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/referral"
                    className="btn-secondary w-full text-sm py-2.5 text-center block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Refer & Earn
                  </Link>
                  <Link
                    href="/mistake-notebook"
                    className="btn-secondary w-full text-sm py-2.5 text-center block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mistake Notebook
                  </Link>
                  <Link
                    href="/profile"
                    className="btn-secondary w-full text-sm py-2.5 text-center block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Update Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary w-full text-sm py-2.5"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn-secondary w-full text-sm py-2.5 text-center block"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

