-- Enable the UUID extension to generate unique public IDs.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the 'users' table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reset_token_hash VARCHAR(255),
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the 'user_credentials' table
CREATE TABLE user_credentials (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tfa_secret VARCHAR(255)
);

-- Create the 'shopping_lists' table
CREATE TABLE shopping_lists (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the 'stores' table
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    chain VARCHAR(255) NOT NULL
);

-- Create the 'prices' table for time-series price data
CREATE TABLE prices (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    product_gtin VARCHAR(14) NOT NULL, -- This links to the product in MongoDB
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source_type VARCHAR(10) NOT NULL, -- e.g., 'api', 'scrape', 'crowd'
    reported_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY(timestamp, product_gtin, store_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
-- Create a composite index for fast price lookups
CREATE INDEX idx_prices_product_store_time ON prices(product_gtin, store_id, timestamp DESC);

-- Seed some initial store data
INSERT INTO stores (name, chain) VALUES
('ALDI', 'ALDI'),
('Coles', 'Coles'),
('Woolworths', 'Woolworths');

-- Function and Triggers to update timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_shopping_lists
BEFORE UPDATE ON shopping_lists
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();