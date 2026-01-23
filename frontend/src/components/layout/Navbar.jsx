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
  const [isRoomBannerDismissed, setIsRoomBannerDismissed] = useState(false);
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
          const newRoom = response.data.room;
          // Reset dismissed state if room code changed
          if (activeRoom?.code !== newRoom.code) {
            setIsRoomBannerDismissed(false);
          }
          setActiveRoom(newRoom);
        } else {
          setActiveRoom(null);
          setIsRoomBannerDismissed(false);
        }
      } catch (err) {
        // Silently fail - user might not have an active room
        setActiveRoom(null);
        setIsRoomBannerDismissed(false);
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
    <>
      {/* Active Room Banner */}
      {activeRoom && !isRoomBannerDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-niat-primary text-white py-2 px-4 sm:px-6 lg:px-8">
          <div className="section-container flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span>Active Room: <strong>{activeRoom.code}</strong></span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/guild/${activeRoom.code}/lobby`)}
                className="text-sm sm:text-base font-medium hover:underline underline-offset-2 transition-all"
              >
                Go to Room →
              </button>
              <button
                onClick={() => setIsRoomBannerDismissed(true)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close banner"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <nav
        className={`fixed ${activeRoom && !isRoomBannerDismissed ? 'top-10' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 w-full bg-white shadow-sm`}
      >
        <div className={`w-full pt-4 bg-white ${activeRoom && !isRoomBannerDismissed ? 'pb-8' : 'pb-6'}`}>
          <div className={`bg-niat-navbar rounded-2xl shadow-sm px-4 sm:px-6 lg:px-8 py-4 mx-4 sm:mx-6 lg:mx-8`}>
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0 max-w-[60%] sm:max-w-none">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                  <img 
                    src="/niat.png" 
                    alt="NIAT Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-[#991B1B] hidden sm:block leading-tight">
                  <div>Nxtwave of Innovation in</div>
                  <div>Advanced Technologies</div>
                </div>
                <span className="text-sm text-niat-text sm:hidden">
                  NIAT
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-medium text-sm transition-all duration-200 ${
                  pathname === link.href
                    ? 'text-niat-text'
                    : 'text-niat-text hover:text-niat-primary'
                } ${
                  pathname === link.href
                    ? 'after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-niat-text'
                    : 'after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-niat-text after:transition-all after:duration-200 hover:after:w-full'
                }`}
              >
                {link.label}
              </Link>
            ))}
              </div>

              {/* Login/Profile Button */}
              <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-niat-text hover:bg-niat-section transition-colors"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-niat-border py-2 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-niat-text hover:bg-niat-section"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/mistake-notebook"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-niat-text hover:bg-niat-section"
                    >
                      Mistake Notebook
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-niat-text hover:bg-niat-section flex items-center gap-2"
                    >
                      <span>🔔</span>
                      <span>Notifications</span>
                    </Link>
                    <Link
                      href="/referral"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-niat-text hover:bg-niat-section flex items-center gap-2"
                    >
                      <span>🎁</span>
                      <span>Refer & Earn</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-niat-text hover:bg-niat-section"
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
                className="md:hidden p-2 text-niat-text hover:text-niat-primary transition-colors flex-shrink-0"
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
              <div className="md:hidden mt-4 py-3 sm:py-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="space-y-1 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-all relative rounded-lg ${
                  pathname === link.href
                    ? 'text-niat-text bg-niat-section/50'
                    : 'text-niat-text hover:text-niat-primary hover:bg-niat-section/30'
                }`}
              >
                {link.label}
              </Link>
            ))}
            </div>
            <div className="px-4 pt-2 pb-3 space-y-2 border-t border-niat-border mt-2">
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
                    href="/notifications"
                    className="btn-secondary w-full text-sm py-2.5 text-center block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    🔔 Notifications
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
        </div>
      </nav>
    </>
  );
}

