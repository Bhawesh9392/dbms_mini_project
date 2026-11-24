-- =====================================================================
-- Trading Cards Inventory & Exchange Management System
-- =====================================================================
DROP TABLE IF EXISTS exchange_item CASCADE;
DROP TABLE IF EXISTS exchange CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS card CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS card_set CASCADE;
DROP TABLE IF EXISTS collector CASCADE;

-- =====================================================================
-- COLLECTOR
-- The users of the system.
-- =====================================================================
CREATE TABLE collector (
    collector_id    SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- never store plain-text passwords
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- CARD_SET
-- A set a card belongs to, e.g. "Base Set", "Fossil".
-- =====================================================================
CREATE TABLE card_set (
    set_id          SERIAL PRIMARY KEY,
    set_name        VARCHAR(100) NOT NULL UNIQUE,
    release_year    SMALLINT CHECK (release_year BETWEEN 1990 AND 2100)
);

-- =====================================================================
-- CATEGORY
-- The card's category/type, e.g. "Electric", "Fire".
-- Kept generic (not Pokémon-only) since the system supports any TCG.
-- =====================================================================
CREATE TABLE category (
    category_id     SERIAL PRIMARY KEY,
    category_name   VARCHAR(50) NOT NULL UNIQUE
);

-- =====================================================================
-- CARD
-- The catalogue: one row per *kind* of card, shared across all collectors.
--
-- EER NOTE: CARD is generalised; POKEMON_CARD is a subtype shown in the
-- ER diagram via an ISA relationship. Rather than mapping that to a
-- separate subtype table (which would need an extra join on every query
-- for a college-scale project), we use the common "single table with a
-- discriminator column" mapping: card_type tells us which subtype a row
-- represents, and the subtype-only attributes (hp, evolution_stage) are
-- nullable columns that only apply when card_type = 'POKEMON'.
-- This is a standard, defensible way to implement a specialisation —
-- be ready to explain the trade-off (simplicity vs normalisation) in
-- the viva.
-- =====================================================================
CREATE TABLE card (
    card_id         SERIAL PRIMARY KEY,
    card_name       VARCHAR(100) NOT NULL,
    rarity          VARCHAR(30) NOT NULL
                        CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare')),
    set_id          INTEGER NOT NULL REFERENCES card_set(set_id) ON DELETE RESTRICT,
    category_id     INTEGER REFERENCES category(category_id) ON DELETE SET NULL,

    -- --- specialisation discriminator + subtype-only attributes ---
    card_type       VARCHAR(20) NOT NULL DEFAULT 'GENERIC'
                        CHECK (card_type IN ('GENERIC', 'POKEMON')),
    hp              SMALLINT CHECK (hp IS NULL OR hp > 0),
    evolution_stage VARCHAR(30) CHECK (evolution_stage IS NULL
                        OR evolution_stage IN ('Basic', 'Stage 1', 'Stage 2')),

    -- a subtype attribute must only be filled in for a row of that subtype
    CONSTRAINT chk_pokemon_fields_only_on_pokemon CHECK (
        card_type = 'POKEMON' OR (hp IS NULL AND evolution_stage IS NULL)
    )
);

-- =====================================================================
-- INVENTORY
-- Associative entity resolving the COLLECTOR <-> CARD many-to-many
-- relationship. One row = one collector's holding of one card in one
-- condition.
-- =====================================================================
CREATE TABLE inventory (
    inventory_id    SERIAL PRIMARY KEY,
    collector_id    INTEGER NOT NULL REFERENCES collector(collector_id) ON DELETE CASCADE,
    card_id         INTEGER NOT NULL REFERENCES card(card_id) ON DELETE RESTRICT,
    condition       VARCHAR(20) NOT NULL
                        CHECK (condition IN ('Mint', 'Near Mint', 'Lightly Played', 'Heavily Played', 'Damaged')),
    quantity        INTEGER NOT NULL CHECK (quantity >= 0),
    available_qty   INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),

    -- can't offer more copies for trade than you actually own
    CONSTRAINT chk_available_within_quantity CHECK (available_qty <= quantity),

    -- a collector can't have two separate rows for the same card+condition
    CONSTRAINT uq_collector_card_condition UNIQUE (collector_id, card_id, condition)
);

-- =====================================================================
-- EXCHANGE
-- One trade proposal between two collectors.
-- =====================================================================
CREATE TABLE exchange (
    exchange_id     SERIAL PRIMARY KEY,
    sender_id       INTEGER NOT NULL REFERENCES collector(collector_id) ON DELETE CASCADE,
    receiver_id     INTEGER NOT NULL REFERENCES collector(collector_id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,

    -- can't trade with yourself
    CONSTRAINT chk_sender_not_receiver CHECK (sender_id <> receiver_id),

    -- completed_at only makes sense once a decision has been made
    CONSTRAINT chk_completed_at_requires_final_status CHECK (
        (status = 'PENDING' AND completed_at IS NULL) OR
        (status <> 'PENDING' AND completed_at IS NOT NULL)
    )
);

-- =====================================================================
-- EXCHANGE_ITEM
-- Line items of an exchange: which cards, how many, which condition,
-- and whether the SENDER is offering or requesting that card.
-- =====================================================================
CREATE TABLE exchange_item (
    exchange_item_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exchange_id     INTEGER NOT NULL REFERENCES exchange(exchange_id) ON DELETE CASCADE,
    card_id         INTEGER NOT NULL REFERENCES card(card_id) ON DELETE RESTRICT,
    condition       VARCHAR(20) NOT NULL
                        CHECK (condition IN ('Mint', 'Near Mint', 'Lightly Played', 'Heavily Played', 'Damaged')),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    direction       VARCHAR(10) NOT NULL
                        CHECK (direction IN ('OFFERED', 'REQUESTED'))
);

-- =====================================================================
-- Helpful indexes (not required for correctness, but normal practice
-- for columns you will filter/join on constantly)
-- =====================================================================
CREATE INDEX idx_card_set_id       ON card(set_id);
CREATE INDEX idx_card_category_id  ON card(category_id);
CREATE INDEX idx_inventory_collector ON inventory(collector_id);
CREATE INDEX idx_inventory_card      ON inventory(card_id);
CREATE INDEX idx_exchange_sender     ON exchange(sender_id);
CREATE INDEX idx_exchange_receiver   ON exchange(receiver_id);
CREATE INDEX idx_exchange_item_exchange ON exchange_item(exchange_id);
