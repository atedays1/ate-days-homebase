-- Supabase Setup SQL
-- Run this in your Supabase SQL Editor to set up the database

-- Enable the vector extension
create extension if not exists vector;

-- Create documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  size integer,
  created_at timestamp with time zone default now()
);

-- Create document_chunks table with vector embedding
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  page_number integer,
  created_at timestamp with time zone default now()
);

-- Create index for vector similarity search
create index if not exists document_chunks_embedding_idx 
  on document_chunks 
  using ivfflat (embedding vector_cosine_ops) 
  with (lists = 100);

-- Create function for vector similarity search
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page_number integer,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.page_number,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Grant access to the function
grant execute on function match_document_chunks to anon, authenticated;

-- Create task_metadata table for storing task edits/overrides
-- This stores additional metadata that augments tasks from Google Sheets
create table if not exists task_metadata (
  id uuid primary key default gen_random_uuid(),
  task_id text unique not null,  -- Matches the task ID from timeline parser
  description text,
  status text check (status in ('completed', 'in-progress', 'not-started')),
  start_date date,
  end_date date,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster lookups by task_id
create index if not exists task_metadata_task_id_idx on task_metadata(task_id);

-- Create function to automatically update the updated_at timestamp
create or replace function update_task_metadata_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at
drop trigger if exists task_metadata_updated_at on task_metadata;
create trigger task_metadata_updated_at
  before update on task_metadata
  for each row
  execute function update_task_metadata_updated_at();

-- Create app_settings table for global app configuration
-- This stores settings like the timeline spreadsheet ID that should persist for all users
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster lookups by key
create index if not exists app_settings_key_idx on app_settings(key);

-- Create trigger to auto-update updated_at for app_settings
drop trigger if exists app_settings_updated_at on app_settings;
create trigger app_settings_updated_at
  before update on app_settings
  for each row
  execute function update_task_metadata_updated_at();

-- Create document_summary table for AI-generated document analysis
-- This stores the synthesized summary that appears on the Home page
create table if not exists document_summary (
  id uuid primary key default gen_random_uuid(),
  summary_type text unique not null default 'main',  -- 'main' for the primary summary
  executive_summary text,                             -- 2-3 sentence overview
  key_insights jsonb,                                 -- Array of insight strings
  action_items jsonb,                                 -- Array of {task, source, priority}
  key_themes jsonb,                                   -- Array of theme strings
  important_dates jsonb,                              -- Array of {date, description, source}
  document_count integer,                             -- Number of documents analyzed
  generated_at timestamp with time zone default now()
);

-- Create index for faster lookups by summary_type
create index if not exists document_summary_type_idx on document_summary(summary_type);

-- =====================================================
-- USER ACCESS CONTROL
-- =====================================================

-- Create user_access table for managing who can access the app
-- @atedays.com emails are auto-approved, others need manual approval
create table if not exists user_access (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  status text not null default 'pending' check (status in ('approved', 'pending', 'denied')),
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  requested_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  approved_by text
);

-- Create indexes for faster lookups
create index if not exists user_access_email_idx on user_access(email);
create index if not exists user_access_status_idx on user_access(status);

-- Create trigger to auto-update approved_at when status changes to 'approved'
create or replace function update_user_access_approved_at()
returns trigger as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    new.approved_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_access_approved_at on user_access;
create trigger user_access_approved_at
  before update on user_access
  for each row
  execute function update_user_access_approved_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Note: The API routes use the service role key which bypasses RLS.
-- These policies provide an additional layer of security if someone
-- accesses the database directly with the anon key.

-- Enable RLS on all tables
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table task_metadata enable row level security;
alter table app_settings enable row level security;
alter table document_summary enable row level security;
alter table user_access enable row level security;

-- Documents: Allow read/write for authenticated users (service role bypasses RLS)
create policy "Allow all for service role" on documents
  for all using (true) with check (true);

create policy "Allow all for service role" on document_chunks
  for all using (true) with check (true);

create policy "Allow all for service role" on task_metadata
  for all using (true) with check (true);

create policy "Allow all for service role" on app_settings
  for all using (true) with check (true);

create policy "Allow all for service role" on document_summary
  for all using (true) with check (true);

create policy "Allow all for service role" on user_access
  for all using (true) with check (true);
