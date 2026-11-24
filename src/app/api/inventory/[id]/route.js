import pool from '@/lib/db';
import { getCollectorIdFromRequest } from '@/lib/auth';

// ─── GET /api/inventory/[id] ──────────────────────────────────────────────────
// Returns a single inventory row (with card details). Owner-only.
export async function GET(request, { params }) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const result = await pool.query(
      `SELECT i.inventory_id, i.condition, i.quantity, i.available_qty,
              c.card_id, c.card_name, c.rarity, c.card_type, c.hp, c.evolution_stage,
              s.set_name, cat.category_name
         FROM inventory i
         JOIN card c        ON c.card_id = i.card_id
         JOIN card_set s    ON s.set_id  = c.set_id
         LEFT JOIN category cat ON cat.category_id = c.category_id
        WHERE i.inventory_id = $1
          AND i.collector_id = $2`,
      [id, collectorId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { status: 'error', message: 'Inventory item not found or not owned by you' },
        { status: 404 }
      );
    }

    return Response.json({ status: 'ok', inventory: result.rows[0] });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/inventory/[id] ────────────────────────────────────────────────
// Update quantity and/or available_qty for one inventory row.
// Only the owner (authenticated collector) may update their own rows.
// Body: { quantity?, available_qty? }  — send only the fields you want to change.
export async function PATCH(request, { params }) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  const { id } = await params;  // params is a Promise in Next.js 15+

  try {
    const body = await request.json();
    const { quantity, available_qty } = body;

    if (quantity == null && available_qty == null) {
      return Response.json(
        { status: 'error', message: 'Provide at least one of: quantity, available_qty' },
        { status: 400 }
      );
    }

    // Build a dynamic SET clause with only the supplied fields
    const sets = [];
    const values = [];
    const add = (v) => { values.push(v); return `$${values.length}`; };

    if (quantity != null)       sets.push(`quantity = ${add(quantity)}`);
    if (available_qty != null)  sets.push(`available_qty = ${add(available_qty)}`);

    // Append the WHERE filters last
    values.push(id, collectorId);
    const idPlaceholder         = `$${values.length - 1}`;
    const ownerPlaceholder      = `$${values.length}`;

    const sql = `
      UPDATE inventory
         SET ${sets.join(', ')}
       WHERE inventory_id = ${idPlaceholder}
         AND collector_id = ${ownerPlaceholder}
       RETURNING *`;

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return Response.json(
        { status: 'error', message: 'Inventory row not found or not owned by you' },
        { status: 404 }
      );
    }

    return Response.json({ status: 'ok', inventory: result.rows[0] });
  } catch (err) {
    if (err.code === '23514') {   // check_violation
      return Response.json({ status: 'error', message: err.message }, { status: 400 });
    }
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/inventory/[id] ───────────────────────────────────────────────
// Remove one inventory row. Only the owner may delete their own rows.
export async function DELETE(request, { params }) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const result = await pool.query(
      `DELETE FROM inventory
        WHERE inventory_id = $1
          AND collector_id = $2
        RETURNING inventory_id`,
      [id, collectorId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { status: 'error', message: 'Inventory row not found or not owned by you' },
        { status: 404 }
      );
    }

    return Response.json({ status: 'ok', deleted_id: result.rows[0].inventory_id });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
