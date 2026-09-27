import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CitChat',
  description: 'Ngobrol langsung di CitChat.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
