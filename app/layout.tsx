import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskMom',
  description: 'T1D supply tracker and SMS reminders for busy moms',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-blue-50">{children}</body>
    </html>
  );
}
