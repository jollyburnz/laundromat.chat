-- Add unique constraint to nickname (case-insensitive)
-- This migration adds a unique index on lowercase nickname to ensure uniqueness

-- First, create a unique index on lowercased nickname
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_lower ON users(LOWER(nickname));

-- Add a check constraint to ensure nickname is not empty
ALTER TABLE users ADD CONSTRAINT nickname_not_empty CHECK (nickname IS NOT NULL AND LENGTH(TRIM(nickname)) >= 3);

