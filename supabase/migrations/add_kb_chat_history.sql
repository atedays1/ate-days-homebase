-- Migration: Persist Knowledge Base chat history
-- One conversation per approved user, with ordered messages.

CREATE TABLE IF NOT EXISTS kb_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL UNIQUE,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES kb_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_conversations_user_email_idx ON kb_conversations(user_email);
CREATE INDEX IF NOT EXISTS kb_messages_conversation_id_idx ON kb_messages(conversation_id);
CREATE INDEX IF NOT EXISTS kb_messages_created_at_idx ON kb_messages(created_at);

ALTER TABLE kb_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_messages ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role. We still allow authenticated users to read via direct SQL tools.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kb_conversations' AND policyname = 'kb_conversations_authenticated_read'
  ) THEN
    CREATE POLICY "kb_conversations_authenticated_read"
      ON kb_conversations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'kb_messages' AND policyname = 'kb_messages_authenticated_read'
  ) THEN
    CREATE POLICY "kb_messages_authenticated_read"
      ON kb_messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
