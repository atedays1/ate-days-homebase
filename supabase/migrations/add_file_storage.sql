-- Migration: Add file storage support for document viewing
-- Run this in Supabase SQL Editor to add file storage capability

-- Add file_path column to documents table for Supabase Storage paths
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path text;

-- NOTE: You also need to create a Storage bucket in Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. Public: No (unchecked)
-- 5. Click "Create bucket"
