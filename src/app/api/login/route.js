import pool from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { status: 'error', message: 'email and password are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT collector_id, name, email, password_hash FROM collector WHERE email = $1`,
      [email]
    );

    const collector = result.rows[0];

    const genericError = () =>
      Response.json({ status: 'error', message: 'Invalid email or password' }, { status: 401 });

    if (!collector) return genericError();

    const passwordMatches = await bcrypt.compare(password, collector.password_hash);
    if (!passwordMatches) return genericError();

    const token = jwt.sign(
      { collector_id: collector.collector_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set an HTTP-only cookie so Server Components can read the session
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return Response.json({
      status: 'ok',
      token,
      collector: { collector_id: collector.collector_id, name: collector.name, email: collector.email }
    });

  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
