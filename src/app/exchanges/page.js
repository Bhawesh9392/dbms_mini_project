// src/app/exchanges/page.js — Exchanges (app screen, Ultraviolet)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import { NewExchangeModal, ExchangeActionButtons } from './ExchangeClient';
import { Pagination } from '../inventory/InventoryClient';

export default async function ExchangesPage({ searchParams }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const collectorsRes = await pool.query(
    `SELECT collector_id, name, email FROM collector WHERE collector_id != $1 ORDER BY name ASC`,
    [session.collectorId]
  );
  const collectors = collectorsRes.rows;

  const cardsRes = await pool.query(
    `SELECT card_id, card_name, rarity FROM card ORDER BY card_name ASC`
  );
  const cards = cardsRes.rows;

  const countRes = await pool.query(
    `SELECT COUNT(*) AS total FROM exchange WHERE sender_id = $1 OR receiver_id = $1`,
    [session.collectorId]
  );
  const total = parseInt(countRes.rows[0].total, 10);
  const pages = Math.ceil(total / limit);

  const exRes = await pool.query(
    `SELECT e.exchange_id, e.status, e.created_at, e.completed_at,
            s.collector_id AS sender_id, s.name AS sender_name,
            r.collector_id AS receiver_id, r.name AS receiver_name
       FROM exchange e
       JOIN collector s ON s.collector_id = e.sender_id
       JOIN collector r ON r.collector_id = e.receiver_id
      WHERE e.sender_id = $1 OR e.receiver_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2 OFFSET $3`,
    [session.collectorId, limit, offset]
  );
  const exchanges = exRes.rows;

  const statusColors = {
    PENDING: 'pill-pending',
    ACCEPTED: 'pill-accepted',
    REJECTED: 'pill-rejected',
    CANCELLED: 'pill-cancelled',
  };

  return (
    <div className="app">
      <main className="app-main">
        <div className="inventory-header">
          <div>
            <h1>exchanges</h1>
            <p className="lead">Track and respond to card trading proposals.</p>
          </div>
          <NewExchangeModal collectors={collectors} cards={cards} />
        </div>

        {exchanges.length === 0 ? (
          <p className="empty">No exchanges found. Propose a new trade to get started!</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>id</th>
                  <th>role</th>
                  <th>partner</th>
                  <th>status</th>
                  <th>created</th>
                  <th className="table-actions">actions</th>
                </tr>
              </thead>
              <tbody>
                {exchanges.map((ex) => {
                  const isSender = ex.sender_id === session.collectorId;
                  const partnerName = isSender ? ex.receiver_name : ex.sender_name;
                  return (
                    <tr key={ex.exchange_id}>
                      <td><Link href={`/exchange/${ex.exchange_id}`} className="num">#{ex.exchange_id}</Link></td>
                      <td className="qty-muted">{isSender ? 'sent' : 'received'}</td>
                      <td>{partnerName}</td>
                      <td><span className={`pill ${statusColors[ex.status] || ''}`}>{ex.status.toLowerCase()}</span></td>
                      <td className="qty-muted">{new Date(ex.created_at).toLocaleDateString()}</td>
                      <td className="table-actions">
                        <Link href={`/exchange/${ex.exchange_id}`} className="btn btn--quiet">details</Link>
                        <ExchangeActionButtons exchange={ex} currentUserId={session.collectorId} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={{ page, limit, total, pages }} basePath="/exchanges" />
      </main>
    </div>
  );
}
