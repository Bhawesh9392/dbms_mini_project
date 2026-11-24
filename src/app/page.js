// src/app/page.js — Home, the app's front (Conversational FAQ + Counter hero)
import Link from 'next/link';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  const authHref = session ? '/inventory' : '/login';
  const authLabel = session ? 'My Inventory' : 'Sign In';

  return (
    <div className="app">
      <main className="app-main">
        <section className="hero">
          <h1>Trading Cards Inventory &amp; Exchange System</h1>
          <p className="lead">Track card collections, organize card conditions, and trade with fellow collectors seamlessly.</p>
          <div className="lead-actions">
            <Link href={authHref} className="btn btn--primary">{authLabel}</Link>
            <Link href="/register" className="btn btn--quiet">Create Account</Link>
          </div>
        </section>

        <div className="captures">
          <figure data-slot="app-home" data-alt="The app home page with its sign-in">
            <img
              src="/images/trading-home.png"
              srcSet="/images/trading-home.png 1440w, /images/trading-home.png 2880w"
              width="2880" height="1620"
              alt="The app home page with its sign-in"
              style={{ objectPosition: '50% 20%' }}
            />
          </figure>
          <figure data-slot="app-login" data-alt="The Sign In form">
            <img
              src="/images/trading-login.png"
              srcSet="/images/trading-login.png 1440w, /images/trading-login.png 2880w"
              width="2880" height="1620"
              alt="The Sign In form"
            />
          </figure>
          <figure data-slot="app-register" data-alt="The Create Account form">
            <img
              src="/images/trading-register.png"
              srcSet="/images/trading-register.png 1440w, /images/trading-register.png 2880w"
              width="2880" height="1620"
              alt="The Create Account form"
            />
          </figure>
        </div>

        <section className="faq">
          <h2>how it works</h2>
          <div className="faq-item">
            <h3>how do I track my collection?</h3>
            <p>Add each card to your inventory with its condition and quantity — and how much is <span className="fill" data-fill="available">available to trade</span>.</p>
          </div>
          <div className="faq-item">
            <h3>how do I propose a trade?</h3>
            <p>From the Exchanges page, propose cards you offer and cards you want, to a fellow collector.</p>
          </div>
          <div className="faq-item">
            <h3>how do I follow my trade offers?</h3>
            <p>Exchanges page: every proposal you sent or received, with a status you can update.</p>
          </div>
        </section>

        <section className="hero" style={{ minHeight: 'auto', paddingTop: 'var(--space-lg)' }}>
          <p><span className="fill" data-fill="cards">Your card count</span> you have collected. Trading with others is the other half.</p>
        </section>
      </main>
    </div>
  );
}
