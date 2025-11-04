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
-- While our current code doesn't use this table yet, creating it now
-- aligns with our final database blueprint.
CREATE TABLE user_credentials (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tfa_secret VARCHAR(255)
);

-- Optional: Create an index on the email column for faster lookups.
CREATE INDEX idx_users_email ON users(email);

-- Optional: Create a function to automatically update the 'updated_at' timestamp.
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the 'users' table.
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();