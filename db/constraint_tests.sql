-- =====================================================================
-- Phase 2: Manual constraint tests
-- Run these ONE AT A TIME in pgAdmin's query tool, after schema.sql
-- and seed.sql. Each one is EXPECTED TO FAIL with an error. If any of
-- these succeed instead, that constraint is broken — fix schema.sql.
-- =====================================================================

-- TEST 1: Negative quantity should be rejected
-- Expected: ERROR - violates check constraint "inventory_quantity_check"
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (1, 1, 'Mint', -5, 0);

-- TEST 2: available_qty greater than quantity should be rejected
-- Expected: ERROR - violates check constraint "chk_available_within_quantity"
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (1, 2, 'Mint', 1, 5);

-- TEST 3: Duplicate (collector, card, condition) should be rejected
-- Expected: ERROR - duplicate key value violates unique constraint "uq_collector_card_condition"
-- (run this only after seed.sql, since collector 1 + Charizard + 'Lightly Played' already exists)
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (1, (SELECT card_id FROM card WHERE card_name = 'Charizard'), 'Lightly Played', 1, 0);

-- TEST 4: A collector can't exchange with themselves
-- Expected: ERROR - violates check constraint "chk_sender_not_receiver"
INSERT INTO exchange (sender_id, receiver_id, status) VALUES (1, 1, 'PENDING');

-- TEST 5: Invalid exchange status should be rejected
-- Expected: ERROR - violates check constraint "exchange_status_check"
INSERT INTO exchange (sender_id, receiver_id, status) VALUES (1, 2, 'MAYBE');

-- TEST 6: A non-POKEMON card should not be allowed to carry Pokémon-only fields
-- Expected: ERROR - violates check constraint "chk_pokemon_fields_only_on_pokemon"
INSERT INTO card (card_name, rarity, set_id, card_type, hp)
VALUES ('Bad Generic Card', 'Common', 1, 'GENERIC', 50);

-- TEST 7: An invalid card condition should be rejected
-- Expected: ERROR - violates check constraint on "condition"
INSERT INTO exchange_item (exchange_id, card_id, condition, quantity, direction)
VALUES (1, 1, 'Brand New', 1, 'OFFERED');

-- TEST 8: An ACCEPTED exchange without completed_at should be rejected
-- Expected: ERROR - violates check constraint "chk_completed_at_requires_final_status"
INSERT INTO exchange (sender_id, receiver_id, status, completed_at)
VALUES (1, 2, 'ACCEPTED', NULL);

-- =====================================================================
-- Sanity check queries (these SHOULD succeed and return rows)
-- =====================================================================

-- See every collector's full inventory with card details
SELECT c.name AS collector, cd.card_name, i.condition, i.quantity, i.available_qty
FROM inventory i
JOIN collector c ON c.collector_id = i.collector_id
JOIN card cd ON cd.card_id = i.card_id
ORDER BY c.name, cd.card_name;

-- See the sample pending exchange with its offered/requested items
SELECT e.exchange_id, s.name AS sender, r.name AS receiver, e.status,
       ei.direction, cd.card_name, ei.quantity, ei.condition
FROM exchange e
JOIN collector s ON s.collector_id = e.sender_id
JOIN collector r ON r.collector_id = e.receiver_id
JOIN exchange_item ei ON ei.exchange_id = e.exchange_id
JOIN card cd ON cd.card_id = ei.card_id
ORDER BY e.exchange_id, ei.direction;
