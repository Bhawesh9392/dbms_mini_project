import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW()');
    return Response.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}