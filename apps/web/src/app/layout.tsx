import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../modules/settings/delivery/ui/AppShell';
import { ThemeProvider } from '../modules/settings/delivery/ui/ThemeProvider';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Clip Factory',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
