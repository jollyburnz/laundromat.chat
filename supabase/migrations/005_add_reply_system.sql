-- Add reply system to messages table
ALTER TABLE messages
ADD COLUMN reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for performance on reply queries
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);

-- Add constraint to prevent self-replies
ALTER TABLE messages
ADD CONSTRAINT no_self_reply CHECK (reply_to_message_id != id);

-- Optional: Add index for finding replies to a message
CREATE INDEX idx_messages_replies ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;