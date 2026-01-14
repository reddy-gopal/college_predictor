import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'College Predictor - Practice Smart. Predict Your Rank. Choose the Right College.',
  description: 'Comprehensive platform for competitive exam preparation with mock tests, college prediction, and rank estimation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
