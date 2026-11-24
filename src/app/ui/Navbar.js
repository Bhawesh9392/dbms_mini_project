// src/app/ui/Navbar.js — the top nav, Ultraviolet system (cards.css)
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar({ session }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="nav">
      <div className="container">
        <Link href="/" className="wordmark">Trading Cards</Link>
        <div className="nav-links">
          <Link href="/inventory" className="nav-link">My Inventory</Link>
          <Link href="/exchanges" className="nav-link">Exchanges</Link>
          {session ? (
            <button type="button" onClick={handleLogout}>Logout</button>
          ) : (
            <Link href="/login" className="btn btn--primary">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
