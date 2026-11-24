import pool from '@/lib/db';
import { getCollectorIdFromRequest } from '@/lib/auth';

// Helper — returns the full exchange row joined with its items and both collectors.
async function fetchExchangeWithItems(client, exchangeId) {
  const ex = await client.query(
    `SELECT e.exchange_id, e.status, e.created_at, e.completed_at,
            s.collector_id AS sender_id,   s.name AS sender_name,
            r.collector_id AS receiver_id, r.name AS receiver_name
       FROM exchange e
       JOIN collector s ON s.collector_id = e.sender_id
       JOIN collector r ON r.collector_id = e.receiver_id
      WHERE e.exchange_id = $1`,
    [exchangeId]
  );
  if (ex.rows.length === 0) return null;

  const items = await client.query(
    `SELECT ei.exchange_item_id, ei.direction, ei.quantity, ei.condition,
            c.card_id, c.card_name, c.rarity
       FROM exchange_item ei
       JOIN card c ON c.card_id = ei.card_id
      WHERE ei.exchange_id = $1
      ORDER BY ei.direction, c.card_name`,
    [exchangeId]
  );

  return { ...ex.rows[0], items: items.rows };
}

// ─── GET /api/exchanges/[id] ──────────────────────────────────────────────────
// Returns one exchange (with its items). Only the sender or receiver may view it.
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
    const exchange = await fetchExchangeWithItems(pool, id);

    if (!exchange) {
      return Response.json({ status: 'error', message: 'Exchange not found' }, { status: 404 });
    }

    if (exchange.sender_id !== collectorId && exchange.receiver_id !== collectorId) {
      return Response.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ status: 'ok', exchange });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/exchanges/[id] ────────────────────────────────────────────────
// Change the status of an exchange.
// Body: { action: "accept" | "reject" | "cancel" }
//
// Permission rules:
//   accept / reject  → only the RECEIVER of a PENDING exchange
//   cancel           → only the SENDER of a PENDING exchange
//
// On accept:
//   1. Verify each OFFERED item has sufficient available_qty in sender's inventory.
//   2. Decrement sender's available_qty for each OFFERED item.
//   3. Upsert receiver's inventory for each OFFERED item (increment quantity + available_qty).
//   4. Upsert sender's inventory for each REQUESTED item (increment quantity + available_qty).
//   5. Decrement receiver's available_qty for each REQUESTED item.
//   6. Mark exchange ACCEPTED with completed_at = NOW().
export async function PATCH(request, { params }) {
  const collectorId = getCollectorIdFromRequest(request);
  if (!collectorId) {
    return Response.json(
      { status: 'error', message: 'Unauthorised — provide a valid Bearer token' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const { action } = await request.json();

    if (!action || !['accept', 'reject', 'cancel'].includes(action)) {
      return Response.json(
        { status: 'error', message: 'action must be accept, reject or cancel' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the exchange row to prevent concurrent status changes
      const { rows } = await client.query(
        `SELECT exchange_id, sender_id, receiver_id, status
           FROM exchange
          WHERE exchange_id = $1
          FOR UPDATE`,
        [id]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return Response.json({ status: 'error', message: 'Exchange not found' }, { status: 404 });
      }

      const ex = rows[0];

      if (ex.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return Response.json(
          { status: 'error', message: `Exchange is already ${ex.status} and cannot be changed` },
          { status: 409 }
        );
      }

      // Permission check
      if ((action === 'accept' || action === 'reject') && ex.receiver_id !== collectorId) {
        await client.query('ROLLBACK');
        return Response.json(
          { status: 'error', message: 'Only the receiver can accept or reject an exchange' },
          { status: 403 }
        );
      }
      if (action === 'cancel' && ex.sender_id !== collectorId) {
        await client.query('ROLLBACK');
        return Response.json(
          { status: 'error', message: 'Only the sender can cancel an exchange' },
          { status: 403 }
        );
      }

      // ── Accept flow: mutate inventories inside the same transaction ───────
      if (action === 'accept') {
        const { rows: items } = await client.query(
          `SELECT ei.card_id, ei.condition, ei.quantity, ei.direction
             FROM exchange_item ei
            WHERE ei.exchange_id = $1`,
          [id]
        );

        const offered   = items.filter(i => i.direction === 'OFFERED');
        const requested = items.filter(i => i.direction === 'REQUESTED');

        // 1. Check sender has enough available_qty for each OFFERED item
        for (const item of offered) {
          const { rows: inv } = await client.query(
            `SELECT available_qty FROM inventory
              WHERE collector_id = $1 AND card_id = $2 AND condition = $3
              FOR UPDATE`,
            [ex.sender_id, item.card_id, item.condition]
          );
          if (inv.length === 0 || inv[0].available_qty < item.quantity) {
            await client.query('ROLLBACK');
            return Response.json(
              {
                status: 'error',
                message: `Insufficient available_qty for card_id=${item.card_id} (${item.condition}). ` +
                         `Need ${item.quantity}, have ${inv[0]?.available_qty ?? 0}.`,
              },
              { status: 400 }
            );
          }
        }

        // 2. Check receiver has enough available_qty for each REQUESTED item
        for (const item of requested) {
          const { rows: inv } = await client.query(
            `SELECT available_qty FROM inventory
              WHERE collector_id = $1 AND card_id = $2 AND condition = $3
              FOR UPDATE`,
            [ex.receiver_id, item.card_id, item.condition]
          );
          if (inv.length === 0 || inv[0].available_qty < item.quantity) {
            await client.query('ROLLBACK');
            return Response.json(
              {
                status: 'error',
                message: `Receiver has insufficient available_qty for card_id=${item.card_id} (${item.condition}). ` +
                         `Need ${item.quantity}, have ${inv[0]?.available_qty ?? 0}.`,
              },
              { status: 400 }
            );
          }
        }

        // 3. Process OFFERED items: decrement sender, increment receiver
        for (const item of offered) {
          // Decrement sender's available_qty
          await client.query(
            `UPDATE inventory
                SET available_qty = available_qty - $1
              WHERE collector_id = $2 AND card_id = $3 AND condition = $4`,
            [item.quantity, ex.sender_id, item.card_id, item.condition]
          );

          // Upsert into receiver's inventory (add to both quantity and available_qty)
          await client.query(
            `INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT ON CONSTRAINT uq_collector_card_condition
             DO UPDATE SET quantity      = inventory.quantity + EXCLUDED.quantity,
                           available_qty = inventory.available_qty + EXCLUDED.quantity`,
            [ex.receiver_id, item.card_id, item.condition, item.quantity]
          );
        }

        // 4. Process REQUESTED items: decrement receiver, increment sender
        for (const item of requested) {
          // Decrement receiver's available_qty
          await client.query(
            `UPDATE inventory
                SET available_qty = available_qty - $1
              WHERE collector_id = $2 AND card_id = $3 AND condition = $4`,
            [item.quantity, ex.receiver_id, item.card_id, item.condition]
          );

          // Upsert into sender's inventory
          await client.query(
            `INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT ON CONSTRAINT uq_collector_card_condition
             DO UPDATE SET quantity      = inventory.quantity + EXCLUDED.quantity,
                           available_qty = inventory.available_qty + EXCLUDED.quantity`,
            [ex.sender_id, item.card_id, item.condition, item.quantity]
          );
        }
      }

      const newStatus = { accept: 'ACCEPTED', reject: 'REJECTED', cancel: 'CANCELLED' }[action];

      await client.query(
        `UPDATE exchange
            SET status = $1, completed_at = NOW()
          WHERE exchange_id = $2`,
        [newStatus, id]
      );

      await client.query('COMMIT');

      const exchange = await fetchExchangeWithItems(pool, id);
      return Response.json({ status: 'ok', exchange });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
