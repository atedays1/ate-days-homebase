-- Add RPC for document-scoped vector similarity search
-- Run in Supabase SQL Editor

create or replace function match_document_chunks_filtered(
  query_embedding vector(1536),
  document_ids uuid[],
  match_threshold float default 0.3,
  match_count int default 10
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
  where document_chunks.document_id = any(document_ids)
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_document_chunks_filtered to authenticated;
