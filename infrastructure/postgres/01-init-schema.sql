-- Enable the UUID extension to generate unique public IDs.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the 'users' table to store core profile information.
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the 'user_credentials' table for sensitive, separated data.
CREATE TABLE user_credentials (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tfa_secret VARCHAR(255)
);

-- --- NEW TABLE DEFINITION ---
-- Create the 'shopping_lists' table
CREATE TABLE shopping_lists (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: Create an index on the user_id for faster list lookups per user.
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);

-- Optional: Create a function to automatically update the 'updated_at' timestamp.
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the 'users' table.
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- --- NEW TRIGGER ATTACHMENT ---
-- Attach the same trigger to the 'shopping_lists' table.
CREATE TRIGGER set_timestamp_shopping_lists
BEFORE UPDATE ON shopping_lists
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();