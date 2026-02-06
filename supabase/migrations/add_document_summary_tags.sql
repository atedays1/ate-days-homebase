-- Migration: Add document summary and tags
-- Run this in Supabase SQL Editor to add the new features

-- Add summary column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary text;

-- Create document_tags table for categorization
CREATE TABLE IF NOT EXISTS document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(document_id, tag)
);

-- Create indexes for faster tag lookups
CREATE INDEX IF NOT EXISTS document_tags_document_id_idx ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS document_tags_tag_idx ON document_tags(tag);

-- Enable RLS on document_tags
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

-- Allow access (service role bypasses RLS anyway)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'document_tags' AND policyname = 'Allow all for service role'
  ) THEN
    CREATE POLICY "Allow all for service role" ON document_tags
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
