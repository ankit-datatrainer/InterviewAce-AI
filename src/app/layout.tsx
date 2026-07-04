import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import ChatWidget from '@/components/ChatWidget';
import ToastProvider from '@/components/Toast';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import MaintenanceClientWrapper from '@/components/MaintenanceClientWrapper';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InterviewAce AI — Ace Every Interview With AI',
  description:
    'AI-powered interview preparation platform with mock interviews, ATS resume analysis, personalized coaching, and real-time feedback to help you land your dream job.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isMaintenance = false;
  try {
    const settingsPath = path.join(process.cwd(), 'src/lib/settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      isMaintenance = data.maintenance === true;
    }
  } catch (e) {
    // Ignore error
  }

  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('isAdmin')?.value === 'true';
  // Read the saved theme on the server so the correct theme is applied in the
  // initial HTML (no flash, and no inline <script> in the React tree).
  const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';

  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-bg" />

        <ToastProvider>
          <MaintenanceClientWrapper isMaintenance={isMaintenance} isAdmin={isAdmin}>
            <Navbar />
            <main>{children}</main>
            <ChatWidget />
          </MaintenanceClientWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}
