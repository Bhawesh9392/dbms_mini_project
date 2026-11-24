// src/app/ui/Footer.js — index columns (layout.md § 7)
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div>
          <Link href="/" className="wordmark">Trading Cards</Link>
        </div>
        <div>
          <h3>cards</h3>
          <ul className="footer-links">
            <li><Link href="/inventory">inventory</Link></li>
            <li><Link href="/exchanges">exchanges</Link></li>
            <li><Link href="/register">create account</Link></li>
          </ul>
        </div>
        <div>
          <h3>collecting</h3>
          <ul className="footer-links">
            <li><Link href="/login">sign in</Link></li>
            <li><Link href="/exchanges">propose a trade</Link></li>
          </ul>
        </div>
        <div className="footer-line">
          Trading Cards Inventory &amp; Exchange System
        </div>
      </div>
    </footer>
  );
}
