import pool from '@/lib/db';
import { getCollectorIdFromRequest } from '@/lib/auth';

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Returns the authenticated collector's inventory (paginated).
// Optional query params:
//   condition   filter by condition (e.g. Mint)
//   available   "true" = only rows where available_qty > 0
//   page        page number (default 1)
//   limit       rows per page (default 20, max 100)
export async function GET(request) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  try {
    const p = new URL(request.url).searchParams;
    const where = ['i.collector_id = $1'];
    const values = [collectorId];
    const add = (v) => { values.push(v); return `$${values.length}`; };

    if (p.get('condition')) where.push(`i.condition = ${add(p.get('condition'))}`);
    if (p.get('available') === 'true') where.push('i.available_qty > 0');

    // Pagination
    const page  = Math.max(1, parseInt(p.get('page')  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const whereClause = `WHERE ${where.join(' AND ')}`;

    // Count total rows (same filters, no pagination)
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory i ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    // Paginated data
    values.push(limit, offset);
    const sql = `
      SELECT i.inventory_id, i.condition, i.quantity, i.available_qty,
             c.card_id, c.card_name, c.rarity, c.card_type, c.hp, c.evolution_stage,
             s.set_name, cat.category_name
        FROM inventory i
        JOIN card c        ON c.card_id = i.card_id
        JOIN card_set s    ON s.set_id  = c.set_id
        LEFT JOIN category cat ON cat.category_id = c.category_id
       ${whereClause}
       ORDER BY c.card_name, i.condition
       LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const result = await pool.query(sql, values);
    return Response.json({
      status: 'ok',
      pagination: { page, limit, total, pages },
      inventory: result.rows,
    });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

// ─── POST /api/inventory ──────────────────────────────────────────────────────
// Add a card to the authenticated collector's inventory (or update if the
// (collector, card, condition) row already exists via ON CONFLICT … DO UPDATE).
// Body: { card_id, condition, quantity, available_qty }
export async function POST(request) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  try {
    const { card_id, condition, quantity, available_qty = 0 } = await request.json();

    if (!card_id || !condition || quantity == null) {
      return Response.json(
        { status: 'error', message: 'card_id, condition and quantity are required' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 0) {
      return Response.json(
        { status: 'error', message: 'quantity must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof available_qty !== 'number' || available_qty < 0 || available_qty > quantity) {
      return Response.json(
        { status: 'error', message: 'available_qty must be between 0 and quantity' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT uq_collector_card_condition
       DO UPDATE SET quantity = EXCLUDED.quantity,
                     available_qty = EXCLUDED.available_qty
       RETURNING *`,
      [collectorId, card_id, condition, quantity, available_qty]
    );

    return Response.json({ status: 'ok', inventory: result.rows[0] }, { status: 201 });
  } catch (err) {
    if (err.code === '23503') {   // foreign_key_violation — card_id doesn't exist
      return Response.json({ status: 'error', message: 'card_id does not exist' }, { status: 400 });
    }
    if (err.code === '23514') {   // check_violation (condition enum, available<=qty, etc.)
      return Response.json({ status: 'error', message: err.message }, { status: 400 });
    }
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
