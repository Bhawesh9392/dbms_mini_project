/**
 * src/lib/session.js
 *
 * Reads and verifies the JWT from the browser cookie named "token".
 * Used by Server Components (pages) to identify the logged-in collector.
 *
 * Returns null when not logged in or token is invalid.
 */
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { collectorId: payload.collector_id, token };
  } catch {
    return null;
  }
}
