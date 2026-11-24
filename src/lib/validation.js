/**
 * src/lib/validation.js
 * Lightweight schema validation utilities for runtime checks across API endpoints.
 */

export const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];

export function validateInventoryPost(body) {
  const errors = [];
  if (!body) return ['Request body is required'];

  const { card_id, condition, quantity, available_qty = 0 } = body;

  if (card_id == null || typeof card_id !== 'number' || card_id <= 0) {
    errors.push('card_id must be a positive number');
  }

  if (!condition || !CONDITIONS.includes(condition)) {
    errors.push(`condition must be one of: ${CONDITIONS.join(', ')}`);
  }

  if (quantity == null || typeof quantity !== 'number' || quantity < 0) {
    errors.push('quantity must be a non-negative number');
  }

  if (available_qty != null && (typeof available_qty !== 'number' || available_qty < 0)) {
    errors.push('available_qty must be a non-negative number');
  } else if (available_qty > quantity) {
    errors.push('available_qty cannot exceed quantity');
  }

  return errors;
}

export function validateInventoryPatch(body) {
  const errors = [];
  if (!body) return ['Request body is required'];

  const { quantity, available_qty } = body;
  if (quantity == null && available_qty == null) {
    errors.push('Provide at least one of: quantity, available_qty');
  }

  if (quantity != null && (typeof quantity !== 'number' || quantity < 0)) {
    errors.push('quantity must be a non-negative number');
  }

  if (available_qty != null && (typeof available_qty !== 'number' || available_qty < 0)) {
    errors.push('available_qty must be a non-negative number');
  }

  return errors;
}

export function validateExchangePost(body, currentCollectorId) {
  const errors = [];
  if (!body) return ['Request body is required'];

  const { receiver_id, items } = body;

  if (!receiver_id || typeof receiver_id !== 'number') {
    errors.push('receiver_id is required and must be a number');
  } else if (Number(receiver_id) === Number(currentCollectorId)) {
    errors.push('You cannot create an exchange with yourself');
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    items.forEach((item, index) => {
      if (!item.card_id || typeof item.card_id !== 'number') {
        errors.push(`Item ${index + 1}: card_id is required`);
      }
      if (!item.condition || !CONDITIONS.includes(item.condition)) {
        errors.push(`Item ${index + 1}: condition must be one of ${CONDITIONS.join(', ')}`);
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: quantity must be a positive number`);
      }
      if (!['OFFERED', 'REQUESTED'].includes(item.direction)) {
        errors.push(`Item ${index + 1}: direction must be OFFERED or REQUESTED`);
      }
    });
  }

  return errors;
}
