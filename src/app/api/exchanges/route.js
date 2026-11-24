import pool from '@/lib/db';
import { getCollectorIdFromRequest } from '@/lib/auth';

// ─── GET /api/exchanges ───────────────────────────────────────────────────────
// Returns all exchanges where the authenticated collector is sender OR receiver.
// Optional query params:
//   role    "sent" | "received"   (default: both)
//   status  PENDING | ACCEPTED | REJECTED | CANCELLED
//   page    page number (default 1)
//   limit   rows per page (default 20, max 100)
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
    const role   = p.get('role');
    const status = p.get('status');

    const where = [];
    const values = [];
    const add = (v) => { values.push(v); return `$${values.length}`; };

    if (role === 'sent') {
      where.push(`e.sender_id = ${add(collectorId)}`);
    } else if (role === 'received') {
      where.push(`e.receiver_id = ${add(collectorId)}`);
    } else {
      values.push(collectorId);
      where.push(`(e.sender_id = $${values.length} OR e.receiver_id = $${values.length})`);
    }

    if (status) where.push(`e.status = ${add(status.toUpperCase())}`);

    const whereClause = `WHERE ${where.join(' AND ')}`;

    // Pagination
    const page  = Math.max(1, parseInt(p.get('page')  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM exchange e ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    values.push(limit, offset);
    const sql = `
      SELECT e.exchange_id, e.status, e.created_at, e.completed_at,
             s.collector_id AS sender_id,   s.name AS sender_name,
             r.collector_id AS receiver_id, r.name AS receiver_name
        FROM exchange e
        JOIN collector s ON s.collector_id = e.sender_id
        JOIN collector r ON r.collector_id = e.receiver_id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const result = await pool.query(sql, values);
    return Response.json({
      status: 'ok',
      pagination: { page, limit, total, pages },
      exchanges: result.rows,
    });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

// ─── POST /api/exchanges ──────────────────────────────────────────────────────
// Create a new trade proposal.
// Body:
//   {
//     receiver_id: number,
//     items: [
//       { card_id, condition, quantity, direction: "OFFERED" | "REQUESTED" },
//       ...
//     ]
//   }
export async function POST(request) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  try {
    const { receiver_id, items } = await request.json();

    if (!receiver_id || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { status: 'error', message: 'receiver_id and a non-empty items array are required' },
        { status: 400 }
      );
    }

    if (Number(receiver_id) === Number(collectorId)) {
      return Response.json(
        { status: 'error', message: 'You cannot create an exchange with yourself' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.card_id || !item.condition || !item.quantity || !item.direction) {
        return Response.json(
          { status: 'error', message: 'Each item needs card_id, condition, quantity and direction' },
          { status: 400 }
        );
      }
      if (!['OFFERED', 'REQUESTED'].includes(item.direction)) {
        return Response.json(
          { status: 'error', message: `direction must be OFFERED or REQUESTED, got: ${item.direction}` },
          { status: 400 }
        );
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const exchangeResult = await client.query(
        `INSERT INTO exchange (sender_id, receiver_id) VALUES ($1, $2) RETURNING *`,
        [collectorId, receiver_id]
      );
      const exchange = exchangeResult.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO exchange_item (exchange_id, card_id, condition, quantity, direction)
           VALUES ($1, $2, $3, $4, $5)`,
          [exchange.exchange_id, item.card_id, item.condition, item.quantity, item.direction]
        );
      }

      await client.query('COMMIT');
      return Response.json({ status: 'ok', exchange }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23503') {
      return Response.json(
        { status: 'error', message: 'receiver_id or a card_id does not exist' },
        { status: 400 }
      );
    }
    if (err.code === '23514') {
      return Response.json({ status: 'error', message: err.message }, { status: 400 });
    }
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
