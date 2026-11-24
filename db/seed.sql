-- =====================================================================
-- Trading Cards Inventory & Exchange Management System
-- Phase 2: Sample data (run after schema.sql)
-- =====================================================================

-- --- Card sets ---
INSERT INTO card_set (set_name, release_year) VALUES
    ('Base Set', 1998),
    ('Fossil', 1999);

-- --- Categories ---
INSERT INTO category (category_name) VALUES
    ('Electric'),
    ('Fire'),
    ('Water'),
    ('Psychic'),
    ('Ghost');

-- --- Cards ---
-- Pikachu: Electric, Base Set, Pokémon subtype
INSERT INTO card (card_name, rarity, set_id, category_id, card_type, hp, evolution_stage)
VALUES ('Pikachu', 'Rare',
        (SELECT set_id FROM card_set WHERE set_name = 'Base Set'),
        (SELECT category_id FROM category WHERE category_name = 'Electric'),
        'POKEMON', 60, 'Basic');

-- Charizard: Fire, Base Set, Pokémon subtype
INSERT INTO card (card_name, rarity, set_id, category_id, card_type, hp, evolution_stage)
VALUES ('Charizard', 'Holo Rare',
        (SELECT set_id FROM card_set WHERE set_name = 'Base Set'),
        (SELECT category_id FROM category WHERE category_name = 'Fire'),
        'POKEMON', 120, 'Stage 2');

-- Blastoise: Water, Base Set, Pokémon subtype
INSERT INTO card (card_name, rarity, set_id, category_id, card_type, hp, evolution_stage)
VALUES ('Blastoise', 'Holo Rare',
        (SELECT set_id FROM card_set WHERE set_name = 'Base Set'),
        (SELECT category_id FROM category WHERE category_name = 'Water'),
        'POKEMON', 100, 'Stage 2');

-- Mewtwo: Psychic, Base Set, Pokémon subtype
INSERT INTO card (card_name, rarity, set_id, category_id, card_type, hp, evolution_stage)
VALUES ('Mewtwo', 'Rare',
        (SELECT set_id FROM card_set WHERE set_name = 'Base Set'),
        (SELECT category_id FROM category WHERE category_name = 'Psychic'),
        'POKEMON', 90, 'Basic');

-- Gengar: Ghost, Fossil, Pokémon subtype
INSERT INTO card (card_name, rarity, set_id, category_id, card_type, hp, evolution_stage)
VALUES ('Gengar', 'Uncommon',
        (SELECT set_id FROM card_set WHERE set_name = 'Fossil'),
        (SELECT category_id FROM category WHERE category_name = 'Ghost'),
        'POKEMON', 80, 'Stage 2');

-- A plain generic card, to prove the system isn't Pokémon-only
INSERT INTO card (card_name, rarity, set_id, category_id, card_type)
VALUES ('Generic Holo Card', 'Rare',
        (SELECT set_id FROM card_set WHERE set_name = 'Fossil'),
        NULL,
        'GENERIC');

-- --- Collectors ---
-- password_hash values below are placeholders, NOT real bcrypt hashes.
-- Replace with real hashes once registration is implemented in Phase 3.
INSERT INTO collector (name, email, password_hash) VALUES
    ('Collector A', 'collector.a@example.com', 'placeholder_hash_a'),
    ('Collector B', 'collector.b@example.com', 'placeholder_hash_b'),
    ('Collector C', 'collector.c@example.com', 'placeholder_hash_c');

-- --- Inventories ---
-- Collector A owns 2 Charizard (Lightly Played), 1 available for trade
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.a@example.com'),
    (SELECT card_id FROM card WHERE card_name = 'Charizard'),
    'Lightly Played', 2, 1
);

-- Collector A also owns 3 Pikachu (Near Mint), 1 available
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.a@example.com'),
    (SELECT card_id FROM card WHERE card_name = 'Pikachu'),
    'Near Mint', 3, 1
);

-- Collector B owns 1 Blastoise (Mint), not currently listed for trade
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.b@example.com'),
    (SELECT card_id FROM card WHERE card_name = 'Blastoise'),
    'Mint', 1, 0
);

-- Collector B also owns 1 Mewtwo (Near Mint), 1 available
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.b@example.com'),
    (SELECT card_id FROM card WHERE card_name = 'Mewtwo'),
    'Near Mint', 1, 1
);

-- Collector C owns 2 Gengar (Heavily Played), both available
INSERT INTO inventory (collector_id, card_id, condition, quantity, available_qty)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.c@example.com'),
    (SELECT card_id FROM card WHERE card_name = 'Gengar'),
    'Heavily Played', 2, 2
);

-- --- A sample pending exchange: Collector A offers Charizard, requests Blastoise from B ---
INSERT INTO exchange (sender_id, receiver_id, status)
VALUES (
    (SELECT collector_id FROM collector WHERE email = 'collector.a@example.com'),
    (SELECT collector_id FROM collector WHERE email = 'collector.b@example.com'),
    'PENDING'
);

INSERT INTO exchange_item (exchange_id, card_id, condition, quantity, direction)
VALUES
    (
        (SELECT MAX(exchange_id) FROM exchange),
        (SELECT card_id FROM card WHERE card_name = 'Charizard'),
        'Lightly Played', 1, 'OFFERED'
    ),
    (
        (SELECT MAX(exchange_id) FROM exchange),
        (SELECT card_id FROM card WHERE card_name = 'Blastoise'),
        'Mint', 1, 'REQUESTED'
    );
