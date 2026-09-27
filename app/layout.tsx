import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatSecrets | Hacker Terminal',
  description: 'Ephemeral room-based chat. No account required.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
