// src/app/inventory/page.js — Inventory (app screen, Hallmark Ultraviolet system)
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import { AddInventoryForm, InventoryContainer, Pagination } from './InventoryClient';

export default async function InventoryPage({ searchParams }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || '1', 10));
  const condition = sp?.condition || null;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Cards available for the add form
  const cardsRes = await pool.query(
    `SELECT c.card_id, c.card_name, c.rarity, s.set_name
       FROM card c
       JOIN card_set s ON s.set_id = c.set_id
      ORDER BY c.card_name ASC`
  );
  const cards = cardsRes.rows;

  // Build filter query
  const whereClauses = ['i.collector_id = $1'];
  const queryParams = [session.collectorId];
  if (condition) {
    queryParams.push(condition);
    whereClauses.push(`i.condition = $${queryParams.length}`);
  }

  // Count total matching items
  const countRes = await pool.query(
    `SELECT COUNT(*) AS total FROM inventory i WHERE ${whereClauses.join(' AND ')}`,
    queryParams
  );
  const total = parseInt(countRes.rows[0].total, 10);
  const pages = Math.ceil(total / limit);

  // Fetch paginated inventory
  queryParams.push(limit, offset);
  const invRes = await pool.query(
    `SELECT i.inventory_id, i.condition, i.quantity, i.available_qty,
            c.card_id, c.card_name, c.rarity, c.card_type, c.hp, c.evolution_stage,
            s.set_name, cat.category_name
       FROM inventory i
       JOIN card c        ON c.card_id = i.card_id
       JOIN card_set s    ON s.set_id  = c.set_id
       LEFT JOIN category cat ON cat.category_id = c.category_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY c.card_name, i.condition
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
    queryParams
  );
  const inventory = invRes.rows;

  const basePath = condition ? `/inventory?condition=${encodeURIComponent(condition)}` : '/inventory';

  return (
    <div className="app">
      <main className="app-main">
        <div className="container">
          <div className="inventory-header">
            <div>
              <h1>my inventory</h1>
              <p className="lead">Manage your trading card binder, track card condition, and mark copies available for trade.</p>
            </div>
            <AddInventoryForm cards={cards} />
          </div>

          <InventoryContainer
            inventory={inventory}
            activeCondition={condition}
          />

          <Pagination pagination={{ page, limit, total, pages }} basePath={basePath} />
        </div>
      </main>
    </div>
  );
}
