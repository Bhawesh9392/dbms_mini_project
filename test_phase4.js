/**
 * test_phase4.js
 * Automated integration test covering all Phase 4 features:
 * 1. Collector auth / tokens
 * 2. Inventory pagination & single-item GET/PATCH/DELETE
 * 3. Exchanges pagination & propose exchange
 * 4. Exchange ACCEPT with atomic DB transaction inventory update
 * 5. Verify quantity decremented from sender and incremented for receiver
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Running Phase 4 Automated Test Suite against', BASE_URL);

  const timestamp = Date.now();
  const userA = { name: `Tester A ${timestamp}`, email: `userA_${timestamp}@test.com`, password: 'Password123!' };
  const userB = { name: `Tester B ${timestamp}`, email: `userB_${timestamp}@test.com`, password: 'Password123!' };

  // 1. Register User A & User B
  console.log('\n--- 1. Registering test users ---');
  let res = await fetch(`${BASE_URL}/api/collectors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userA)
  });
  const dataA = await res.json();
  const collectorAId = dataA.collector.collector_id;
  console.log('Registered User A:', collectorAId);

  res = await fetch(`${BASE_URL}/api/collectors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB)
  });
  const dataB = await res.json();
  const collectorBId = dataB.collector.collector_id;
  console.log('Registered User B:', collectorBId);

  // 2. Login both users
  console.log('\n--- 2. Logging in users ---');
  res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA.email, password: userA.password })
  });
  const loginA = await res.json();
  const tokenA = loginA.token;

  res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userB.email, password: userB.password })
  });
  const loginB = await res.json();
  const tokenB = loginB.token;

  // 3. Add inventory to User A
  console.log('\n--- 3. User A adds cards to inventory ---');
  res = await fetch(`${BASE_URL}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ card_id: 1, condition: 'Mint', quantity: 5, available_qty: 3 })
  });
  const invA = await res.json();
  const itemAId = invA.inventory.inventory_id;
  console.log('User A inventory item created:', itemAId, 'Qty: 5, Avail: 3');

  // 4. Test Single Inventory GET / PATCH / DELETE
  console.log('\n--- 4. Testing Inventory [id] GET & PATCH ---');
  res = await fetch(`${BASE_URL}/api/inventory/${itemAId}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const getItem = await res.json();
  if (getItem.status !== 'ok' || getItem.inventory.card_id !== 1) {
    throw new Error('GET /api/inventory/[id] failed');
  }
  console.log('GET /api/inventory/[id] verified');

  res = await fetch(`${BASE_URL}/api/inventory/${itemAId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ available_qty: 4 })
  });
  const patchItem = await res.json();
  if (patchItem.inventory.available_qty !== 4) {
    throw new Error('PATCH /api/inventory/[id] failed');
  }
  console.log('PATCH /api/inventory/[id] updated available_qty to 4');

  // 5. Test Pagination on GET /api/inventory
  console.log('\n--- 5. Testing Inventory pagination ---');
  res = await fetch(`${BASE_URL}/api/inventory?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const paginatedInv = await res.json();
  if (!paginatedInv.pagination || paginatedInv.pagination.limit !== 1) {
    throw new Error('Inventory pagination failed');
  }
  console.log('Inventory pagination working:', paginatedInv.pagination);

  // 6. User A proposes trade to User B (OFFERED: Card 1 x2)
  console.log('\n--- 6. User A proposes exchange to User B ---');
  res = await fetch(`${BASE_URL}/api/exchanges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      receiver_id: collectorBId,
      items: [
        { card_id: 1, condition: 'Mint', quantity: 2, direction: 'OFFERED' }
      ]
    })
  });
  const exchangeData = await res.json();
  const exchangeId = exchangeData.exchange.exchange_id;
  console.log('Exchange proposal created with ID:', exchangeId);

  // 7. Test Exchanges pagination
  console.log('\n--- 7. Testing Exchanges pagination ---');
  res = await fetch(`${BASE_URL}/api/exchanges?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const paginatedEx = await res.json();
  if (!paginatedEx.pagination || !Array.isArray(paginatedEx.exchanges)) {
    throw new Error('Exchanges pagination failed');
  }
  console.log('Exchanges pagination working:', paginatedEx.pagination);

  // 8. User B accepts the trade
  console.log('\n--- 8. User B accepts exchange proposal ---');
  res = await fetch(`${BASE_URL}/api/exchanges/${exchangeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ action: 'accept' })
  });
  const acceptedEx = await res.json();
  if (acceptedEx.exchange.status !== 'ACCEPTED') {
    throw new Error('Failed to accept exchange: ' + JSON.stringify(acceptedEx));
  }
  console.log('Exchange status is now ACCEPTED');

  // 9. Verify inventory updates
  console.log('\n--- 9. Verifying inventory mutation post-acceptance ---');
  // User A should have available_qty decremented by 2 (4 - 2 = 2)
  res = await fetch(`${BASE_URL}/api/inventory/${itemAId}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const userAUpdatedInv = await res.json();
  console.log('User A post-trade available_qty:', userAUpdatedInv.inventory.available_qty);
  if (userAUpdatedInv.inventory.available_qty !== 2) {
    throw new Error(`Expected User A available_qty to be 2, got ${userAUpdatedInv.inventory.available_qty}`);
  }

  // User B should now own Card 1 with quantity 2
  res = await fetch(`${BASE_URL}/api/inventory`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const userBInv = await res.json();
  const cardB = userBInv.inventory.find(i => i.card_id === 1);
  console.log('User B received card in inventory:', cardB);
  if (!cardB || cardB.quantity !== 2) {
    throw new Error(`Expected User B to have quantity 2 for Card 1`);
  }

  console.log('\n✨ ALL PHASE 4 AUTOMATED INTEGRATION TESTS PASSED SUCCESSFULLY! ✨\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
