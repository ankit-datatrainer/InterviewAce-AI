import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

import ChatWidget from '@/components/ChatWidget';
import ToastProvider from '@/components/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins', // keeping the same variable name so we don't have to change it everywhere
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InterviewAce AI — Ace Every Interview With AI',
  description:
    'AI-powered interview preparation platform with mock interviews, ATS resume analysis, personalized coaching, and real-time feedback to help you land your dream job.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-bg" />

        <ToastProvider>
          <Navbar />
          <main>{children}</main>
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
