import pool from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { status: 'error', message: 'name, email and password are all required' },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO collector (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING collector_id, name, email, joined_at`,
      [name, email, password_hash]
    );

    return Response.json({ status: 'ok', collector: result.rows[0] }, { status: 201 });

  } catch (err) {
    // Postgres unique_violation error code is 23505
    if (err.code === '23505') {
      return Response.json(
        { status: 'error', message: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}