import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import ToastContainer from '@/components/common/Toast';
import Script from 'next/script';

export const metadata = {
  title: 'NIAT',
  description: 'Nxtwave of Innovation in Advanced Technologies',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen bg-white text-niat-text antialiased flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-10 md:pt-13 transition-all duration-300">{children}</main>
          <Footer />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
