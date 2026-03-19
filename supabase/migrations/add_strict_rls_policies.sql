-- =====================================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- CRITICAL STRUCTURAL VULNERABILITY:
-- Public tables do not have ownership columns like user_id/author_id.
-- Therefore per-user INSERT/UPDATE/DELETE policies based on auth.uid()
-- cannot be created yet.
--
-- This migration:
-- 1) safely enables RLS on known tables if they exist,
-- 2) replaces broad legacy policies,
-- 3) creates authenticated-only SELECT policies (no client-side writes),
-- 4) revokes anon RPC execute access for vector match functions,
-- 5) enforces storage object policy for the "documents" bucket.
-- =====================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'documents',
    'document_chunks',
    'task_metadata',
    'app_settings',
    'document_summary',
    'user_access',
    'document_tags',
    'competitors',
    'competitor_discoveries',
    'pain_point_categories',
    'white_space_opportunities',
    'competitor_pain_points',
    'competitor_white_space_scores'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- Remove legacy broad policies only when their tables exist.
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.documents';
  END IF;
  IF to_regclass('public.document_chunks') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.document_chunks';
  END IF;
  IF to_regclass('public.task_metadata') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.task_metadata';
  END IF;
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.app_settings';
  END IF;
  IF to_regclass('public.document_summary') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.document_summary';
  END IF;
  IF to_regclass('public.user_access') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.user_access';
  END IF;
  IF to_regclass('public.document_tags') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for service role" ON public.document_tags';
  END IF;
  IF to_regclass('public.competitors') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read competitors" ON public.competitors';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on competitors" ON public.competitors';
  END IF;
  IF to_regclass('public.competitor_discoveries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read discoveries" ON public.competitor_discoveries';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on discoveries" ON public.competitor_discoveries';
  END IF;
  IF to_regclass('public.pain_point_categories') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read pain_point_categories" ON public.pain_point_categories';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on pain_point_categories" ON public.pain_point_categories';
  END IF;
  IF to_regclass('public.white_space_opportunities') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read white_space_opportunities" ON public.white_space_opportunities';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on white_space_opportunities" ON public.white_space_opportunities';
  END IF;
  IF to_regclass('public.competitor_pain_points') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read competitor_pain_points" ON public.competitor_pain_points';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on competitor_pain_points" ON public.competitor_pain_points';
  END IF;
  IF to_regclass('public.competitor_white_space_scores') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read competitor_white_space_scores" ON public.competitor_white_space_scores';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role all on competitor_white_space_scores" ON public.competitor_white_space_scores';
  END IF;
END $$;

-- Authenticated-only read policies (idempotent)
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documents' AND policyname='rls_select_documents'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_documents" ON public.documents FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.document_chunks') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_chunks' AND policyname='rls_select_document_chunks'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_document_chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.task_metadata') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='task_metadata' AND policyname='rls_select_task_metadata'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_task_metadata" ON public.task_metadata FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.app_settings') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_settings' AND policyname='rls_select_app_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.document_summary') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_summary' AND policyname='rls_select_document_summary'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_document_summary" ON public.document_summary FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.user_access') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_access' AND policyname='rls_select_user_access'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_user_access" ON public.user_access FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.document_tags') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_tags' AND policyname='rls_select_document_tags'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_document_tags" ON public.document_tags FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.competitors') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='competitors' AND policyname='rls_select_competitors'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_competitors" ON public.competitors FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.competitor_discoveries') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='competitor_discoveries' AND policyname='rls_select_competitor_discoveries'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_competitor_discoveries" ON public.competitor_discoveries FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.pain_point_categories') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pain_point_categories' AND policyname='rls_select_pain_point_categories'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_pain_point_categories" ON public.pain_point_categories FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.white_space_opportunities') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='white_space_opportunities' AND policyname='rls_select_white_space_opportunities'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_white_space_opportunities" ON public.white_space_opportunities FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.competitor_pain_points') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='competitor_pain_points' AND policyname='rls_select_competitor_pain_points'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_competitor_pain_points" ON public.competitor_pain_points FOR SELECT TO authenticated USING (true)';
  END IF;

  IF to_regclass('public.competitor_white_space_scores') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='competitor_white_space_scores' AND policyname='rls_select_competitor_white_space_scores'
  ) THEN
    EXECUTE 'CREATE POLICY "rls_select_competitor_white_space_scores" ON public.competitor_white_space_scores FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Tighten RPC exposure: anonymous users should not execute these.
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector, float, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks_filtered(vector, uuid[], float, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks_filtered(vector, uuid[], float, int) TO authenticated;

-- Explicit storage policy for private documents bucket.
-- This keeps bucket access bounded to authenticated users and service role.
DROP POLICY IF EXISTS "documents_bucket_authenticated_read" ON storage.objects;
CREATE POLICY "documents_bucket_authenticated_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_service_role_all" ON storage.objects;
CREATE POLICY "documents_bucket_service_role_all"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- NOTE: INSERT/UPDATE/DELETE client policies are intentionally omitted because
-- no ownership columns exist (user_id/author_id/owner_id/created_by).
