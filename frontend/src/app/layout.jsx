import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import ToastContainer from '@/components/common/Toast';
import Script from 'next/script';

export const metadata = {
  title: 'College Predictor - Practice Smart. Predict Your Rank. Choose the Right College.',
  description: 'Comprehensive platform for competitive exam preparation with mock tests, college prediction, and rank estimation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
