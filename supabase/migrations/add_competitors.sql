-- Migration: Add competitors tracking tables
-- Run this in Supabase SQL Editor

-- =====================================================
-- COMPETITORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  amazon_url TEXT,
  logo_url TEXT,
  
  -- Social media links
  instagram_url TEXT,
  tiktok_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  youtube_url TEXT,
  
  -- Categorization
  category TEXT DEFAULT 'multi', -- 'sleep', 'focus', 'calm', 'multi', 'general'
  tags TEXT[], -- Additional tags like 'subscription', 'dtc', 'gummies', etc.
  
  -- Status tracking
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'watching'
  discovered_via TEXT DEFAULT 'manual', -- 'manual', 'tavily'
  
  -- Notes and metadata
  notes TEXT,
  founded_year INTEGER,
  headquarters TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPETITOR DISCOVERIES TABLE (from Tavily scans)
-- =====================================================
CREATE TABLE IF NOT EXISTS competitor_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  source_url TEXT, -- Where Tavily found this
  relevance_score REAL, -- Tavily's relevance score
  scan_query TEXT, -- The search query that found this
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- 'pending', 'added', 'dismissed'
  dismissed_reason TEXT, -- Why it was dismissed (if applicable)
  added_competitor_id UUID REFERENCES competitors(id), -- Link if added
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_competitors_category ON competitors(category);
CREATE INDEX IF NOT EXISTS idx_competitors_status ON competitors(status);
CREATE INDEX IF NOT EXISTS idx_competitor_discoveries_status ON competitor_discoveries(status);
CREATE INDEX IF NOT EXISTS idx_competitor_discoveries_scan_date ON competitor_discoveries(scan_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_discoveries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read competitors
CREATE POLICY "Allow authenticated read competitors" ON competitors
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to read discoveries  
CREATE POLICY "Allow authenticated read discoveries" ON competitor_discoveries
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access (for API routes)
CREATE POLICY "Allow service role all on competitors" ON competitors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all on discoveries" ON competitor_discoveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
