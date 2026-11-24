import pool from '@/lib/db';

// GET /api/cards  — public card catalogue (no login needed)
// Optional query params (combine freely):
//   q          search by card name (partial, case-insensitive)
//   set        set name, exact (e.g. Base Set)
//   category   category name, exact (e.g. Fire)
//   rarity     exact (e.g. Holo Rare)
//   type       card_type: POKEMON or GENERIC
//   condition  only cards some collector holds in this condition
//   available  "true" = only cards some collector has marked available for trade
export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams;
    const where = [];
    const values = [];
    // push a value and return its $n placeholder (keeps every query parameterized)
    const add = (v) => {
      values.push(v);
      return `$${values.length}`;
    };

    if (p.get('q')) where.push(`c.card_name ILIKE ${add('%' + p.get('q') + '%')}`);
    if (p.get('set')) where.push(`s.set_name = ${add(p.get('set'))}`);
    if (p.get('category')) where.push(`cat.category_name = ${add(p.get('category'))}`);
    if (p.get('rarity')) where.push(`c.rarity = ${add(p.get('rarity'))}`);
    if (p.get('type')) where.push(`c.card_type = ${add(p.get('type').toUpperCase())}`);

    // condition / availability live on INVENTORY, so use one EXISTS subquery
    const inv = [];
    if (p.get('condition')) inv.push(`i.condition = ${add(p.get('condition'))}`);
    if (p.get('available') === 'true') inv.push('i.available_qty > 0');
    if (inv.length) {
      where.push(
        `EXISTS (SELECT 1 FROM inventory i WHERE i.card_id = c.card_id AND ${inv.join(' AND ')})`
      );
    }

    const sql = `
      SELECT c.card_id, c.card_name, c.rarity, c.card_type, c.hp, c.evolution_stage,
             s.set_name, cat.category_name
        FROM card c
        JOIN card_set s        ON s.set_id = c.set_id
        LEFT JOIN category cat ON cat.category_id = c.category_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY c.card_name`;

    const result = await pool.query(sql, values);
    return Response.json({ status: 'ok', count: result.rows.length, cards: result.rows });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
