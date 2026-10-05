import type { Metadata, Viewport } from 'next';
import KeepAlive from './keep-alive';
import './globals.css';

export const metadata: Metadata = {
  title: 'CitChat — Ngobrol Santai, Tanpa Ribet',
  description: 'Ruang ngobrol santai berbasis web dari CitChat. Tanpa login, langsung kenalan dan ngobrol.',
  robots: { index: true, follow: false },
  appleWebApp: { title: 'CitChat', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#101827',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}<KeepAlive /></body>
    </html>
  );
}
