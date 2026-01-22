'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-niat-text text-gray-300 mt-20">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                <img 
                  src="/niat.png" 
                  alt="NIAT Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-lg md:text-xl font-bold text-white leading-tight">
                  <div>Nxtwave of Innovation in</div>
                  <div>Advanced Technologies</div>
                </div>
                <div className="text-sm text-gray-400 mt-1 hidden md:block">
                  NIAT
                </div>
              </div>
            </div>
            <p className="text-gray-400 max-w-md">
              Your comprehensive platform for competitive exam preparation.
              Practice smart, predict your rank, and choose the right college.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/mock-tests"
                  className="hover:text-white transition-colors"
                >
                  Mock Tests
                </Link>
              </li>
              <li>
                <Link
                  href="/predict-college"
                  className="hover:text-white transition-colors"
                >
                  College Predictor
                </Link>
              </li>
              <li>
                <Link
                  href="/predict-rank"
                  className="hover:text-white transition-colors"
                >
                  Rank Predictor
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Help section coming soon!');
                  }}
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Contact section coming soon!');
                  }}
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Privacy policy coming soon!');
                  }}
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-niat-border mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Nxtwave of Innovation in Advanced Technologies (NIAT). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

