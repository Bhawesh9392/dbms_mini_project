import jwt from 'jsonwebtoken';

/**
 * Reads the Authorization header from a request, verifies the JWT,
 * and returns the collector_id encoded inside it.
 *
 * Usage inside any protected route:
 *   const collectorId = getCollectorIdFromRequest(request);
 *   if (!collectorId) return unauthorized response;
 *
 * Throws nothing — returns null if the token is missing or invalid,
 * so callers can decide how to respond (keeps this helper reusable
 * across routes with different error-response shapes).
 */
export function getCollectorIdFromRequest(request) {
  const authHeader = request.headers.get('authorization'); // header names are case-insensitive

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.collector_id;
  } catch (err) {
    // covers: expired token, tampered signature, malformed token
    return null;
  }
}
