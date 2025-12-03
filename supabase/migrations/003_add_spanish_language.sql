-- Add Spanish to language constraints

-- Update users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_language_check;
ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IN ('en', 'zh', 'es'));

-- Update message_translations table
ALTER TABLE message_translations DROP CONSTRAINT IF EXISTS message_translations_target_language_check;
ALTER TABLE message_translations ADD CONSTRAINT message_translations_target_language_check CHECK (target_language IN ('en', 'zh', 'es'));

-- Update rooms table to include Spanish names
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS name_es TEXT;

