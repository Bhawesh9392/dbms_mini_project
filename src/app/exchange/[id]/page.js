// src/app/exchange/[id]/page.js — Exchange Detail (app screen, Hallmark Ultraviolet system)
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import Link from 'next/link';
import { ExchangeActionButtons } from '../exchanges/ExchangeClient';

export default async function ExchangeDetailPage({ params }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch exchange header
  const exRes = await pool.query(
    `SELECT e.exchange_id, e.status, e.created_at, e.completed_at,
            s.collector_id AS sender_id, s.name AS sender_name, s.email AS sender_email,
            r.collector_id AS receiver_id, r.name AS receiver_name, r.email AS receiver_email
       FROM exchange e
       JOIN collector s ON s.collector_id = e.sender_id
       JOIN collector r ON r.collector_id = e.receiver_id
      WHERE e.exchange_id = $1`,
    [id]
  );

  if (exRes.rows.length === 0) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-4xl)' }}>
            <h1>Exchange Not Found</h1>
            <p className="lead" style={{ margin: 'var(--space-md) auto' }}>The exchange proposal you requested does not exist.</p>
            <Link href="/exchanges" className="btn btn--quiet">
              back to exchanges
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const exchange = exRes.rows[0];

  // Access check
  if (exchange.sender_id !== session.collectorId && exchange.receiver_id !== session.collectorId) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-4xl)' }}>
            <h1>Access Denied</h1>
            <p className="lead" style={{ margin: 'var(--space-md) auto' }}>You are not a participant in this exchange.</p>
            <Link href="/exchanges" className="btn btn--quiet">
              back to exchanges
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Fetch exchange items
  const itemsRes = await pool.query(
    `SELECT ei.exchange_item_id, ei.direction, ei.quantity, ei.condition,
            c.card_id, c.card_name, c.rarity, c.card_type, s.set_name
       FROM exchange_item ei
       JOIN card c ON c.card_id = ei.card_id
       JOIN card_set s ON s.set_id = c.set_id
      WHERE ei.exchange_id = $1
      ORDER BY ei.direction, c.card_name`,
    [id]
  );
  const items = itemsRes.rows;

  const offeredItems = items.filter(i => i.direction === 'OFFERED');
  const requestedItems = items.filter(i => i.direction === 'REQUESTED');

  const statusColors = {
    PENDING: 'pill-pending',
    ACCEPTED: 'pill-accepted',
    REJECTED: 'pill-rejected',
    CANCELLED: 'pill-cancelled',
  };

  return (
    <div className="app">
      <main className="app-main">
        <div className="container">
          <div className="inventory-header">
            <div>
              <Link href="/exchanges" className="nav-link" style={{ fontSize: 'var(--text-xs)', display: 'inline-block', marginBottom: 'var(--space-xs)' }}>
                ← back to exchanges
              </Link>
              <h1>trade proposal #{exchange.exchange_id}</h1>
              <p className="lead">Review offered and requested cards before accepting the trade.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span className={`pill ${statusColors[exchange.status] || ''}`}>
                {exchange.status}
              </span>
            </div>
          </div>

          <div className="exchange-people">
            <div>
              <h3>sender (proposer)</h3>
              <p><strong>{exchange.sender_name}</strong></p>
              <p className="qty-muted" style={{ fontSize: 'var(--text-xs)' }}>{exchange.sender_email}</p>
            </div>
            <div>
              <h3>receiver (recipient)</h3>
              <p><strong>{exchange.receiver_name}</strong></p>
              <p className="qty-muted" style={{ fontSize: 'var(--text-xs)' }}>{exchange.receiver_email}</p>
            </div>
          </div>

          {/* Facing Binder Board */}
          <div className="binder-board">
            {/* Offered Binder Page */}
            <div className="binder-page">
              <div className="binder-page-header">
                <span className="binder-page-title">cards offered</span>
                <span className="pill pill-accepted">{exchange.sender_name}&apos;s offer</span>
              </div>
              {offeredItems.length === 0 ? (
                <p className="empty" style={{ margin: 'var(--space-xl) 0' }}>No cards offered.</p>
              ) : (
                <div>
                  {offeredItems.map(item => (
                    <div key={item.exchange_item_id} className="binder-card-row">
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.card_name}</div>
                        <div className="qty-muted" style={{ fontSize: 'var(--text-xs)' }}>
                          {item.set_name} • <span className="pill pill-accepted" style={{ padding: '0 8px', minHeight: '18px', fontSize: '0.7rem' }}>{item.condition}</span>
                        </div>
                      </div>
                      <span className="num" style={{ fontWeight: 600, padding: '2px 8px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-pill)' }}>
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requested Binder Page */}
            <div className="binder-page">
              <div className="binder-page-header">
                <span className="binder-page-title">cards requested</span>
                <span className="pill pill-pending">{exchange.receiver_name}&apos;s cards</span>
              </div>
              {requestedItems.length === 0 ? (
                <p className="empty" style={{ margin: 'var(--space-xl) 0' }}>No cards requested.</p>
              ) : (
                <div>
                  {requestedItems.map(item => (
                    <div key={item.exchange_item_id} className="binder-card-row">
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.card_name}</div>
                        <div className="qty-muted" style={{ fontSize: 'var(--text-xs)' }}>
                          {item.set_name} • <span className="pill pill-accepted" style={{ padding: '0 8px', minHeight: '18px', fontSize: '0.7rem' }}>{item.condition}</span>
                        </div>
                      </div>
                      <span className="num" style={{ fontWeight: 600, padding: '2px 8px', background: 'var(--color-paper-2)', borderRadius: 'var(--radius-pill)' }}>
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {exchange.status === 'PENDING' && (
            <div className="exchange-actions">
              <ExchangeActionButtons exchange={exchange} currentUserId={session.collectorId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
