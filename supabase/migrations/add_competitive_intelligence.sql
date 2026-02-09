-- Migration: Add competitive intelligence tables
-- Run this in Supabase SQL Editor

-- =====================================================
-- PAIN POINT CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pain_point_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'alert-circle',
  color TEXT DEFAULT 'red', -- red, orange, yellow for severity visualization
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHITE SPACE OPPORTUNITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS white_space_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  how_atedays_wins TEXT, -- Specific strategy for AteDays
  icon TEXT DEFAULT 'lightbulb',
  priority INTEGER DEFAULT 1, -- 1-5, 1 being highest priority
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPETITOR PAIN POINTS (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS competitor_pain_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  pain_point_id UUID NOT NULL REFERENCES pain_point_categories(id) ON DELETE CASCADE,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  evidence TEXT, -- Direct quote or description
  source_url TEXT, -- Link to Reddit, Trustpilot, etc.
  source_type TEXT, -- 'reddit', 'trustpilot', 'amazon', 'manual', 'ai_detected'
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence REAL, -- 0-1 confidence score if AI generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_id, pain_point_id, evidence) -- Prevent exact duplicates
);

-- =====================================================
-- COMPETITOR WHITE SPACE SCORES
-- =====================================================
CREATE TABLE IF NOT EXISTS competitor_white_space_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  white_space_id UUID NOT NULL REFERENCES white_space_opportunities(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 5 CHECK (score >= 1 AND score <= 10), -- 1-10, 10 = big opportunity gap
  notes TEXT,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_id, white_space_id)
);

-- =====================================================
-- COMPETITOR AI SUMMARY (cached analysis)
-- =====================================================
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS overall_opportunity_score INTEGER; -- 1-100 composite score

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_competitor_pain_points_competitor ON competitor_pain_points(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pain_points_pain_point ON competitor_pain_points(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pain_points_severity ON competitor_pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_competitor_white_space_competitor ON competitor_white_space_scores(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_white_space_score ON competitor_white_space_scores(score);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE pain_point_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_space_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_white_space_scores ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Allow authenticated read pain_point_categories" ON pain_point_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read white_space_opportunities" ON white_space_opportunities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read competitor_pain_points" ON competitor_pain_points
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read competitor_white_space_scores" ON competitor_white_space_scores
  FOR SELECT TO authenticated USING (true);

-- Service role full access
CREATE POLICY "Allow service role all on pain_point_categories" ON pain_point_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all on white_space_opportunities" ON white_space_opportunities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all on competitor_pain_points" ON competitor_pain_points
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all on competitor_white_space_scores" ON competitor_white_space_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_competitor_pain_points_updated_at
  BEFORE UPDATE ON competitor_pain_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_white_space_scores_updated_at
  BEFORE UPDATE ON competitor_white_space_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: PAIN POINT CATEGORIES
-- =====================================================
INSERT INTO pain_point_categories (name, slug, description, icon, color, sort_order) VALUES
(
  'Digital Delivery Fatigue',
  'digital-delivery-fatigue',
  'Subscription management friction, dark patterns, lack of human support, auto-renewal complaints, difficulty canceling',
  'credit-card',
  'red',
  1
),
(
  'Physical Delivery Fatigue',
  'physical-delivery-fatigue',
  'Pill burden (too many/too large capsules), damaged shipments, excessive dosing requirements',
  'pill',
  'orange',
  2
),
(
  'Side Effects & Sensory Issues',
  'side-effects-sensory',
  'Bad taste, smell, burning sensations, nausea, bloating, skin reactions, sleep disturbances',
  'alert-triangle',
  'red',
  3
),
(
  'Transparency & Blend Distrust',
  'transparency-distrust',
  'Proprietary blends hiding doses, undisclosed ingredients, lack of third-party testing, fake/mislabeled products',
  'eye-off',
  'orange',
  4
),
(
  'Bioavailability & Efficacy Doubts',
  'bioavailability-efficacy',
  'No perceived effect, placebo concerns, unrealistic marketing timelines, form factor limiting absorption',
  'trending-down',
  'yellow',
  5
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- =====================================================
-- SEED DATA: WHITE SPACE OPPORTUNITIES
-- =====================================================
INSERT INTO white_space_opportunities (name, slug, description, how_atedays_wins, icon, priority) VALUES
(
  'Radical Dosing Transparency',
  'radical-transparency',
  'Eliminate proprietary blends entirely with milligram-level transparency and QR-accessible batch COAs',
  'Provide complete ingredient disclosure, batch-specific certificates of analysis accessible via QR code, satisfy the 67% of users demanding third-party proof',
  'scan',
  1
),
(
  'Human-in-the-Loop Logistics',
  'human-logistics',
  'Genuine human support and frictionless subscription management to avoid "scam" sentiment',
  'Offer one-click cancellation, easy card removal, real human support (not bots), transparent billing with no dark patterns',
  'users',
  2
),
(
  'Biological Roadmap Marketing',
  'biological-roadmap',
  'Expectation management with education on biological accumulation timelines (2-6 weeks)',
  'Move from hype-based to science-based marketing, educate users on realistic timelines, prevent the 35% early abandonment rate',
  'map',
  3
),
(
  'Sensory Neutrality & Advanced Delivery',
  'sensory-neutral',
  'Neutral sensory profiles or high-bioavailability formats to solve pill fatigue and taste issues',
  'Prioritize neutral taste/smell, explore strips/liquids like MyDiso, smaller/fewer pills, avoid essential oil masking that causes "burn"',
  'zap',
  4
),
(
  'Productivity Ecosystem Integration',
  'ecosystem-integration',
  'Position supplements as data-trackable assets for the "Optimized Life" segment',
  'Target users with Obsidian/Notion workflows, provide tracking integrations, position as part of a productivity system not just a vitamin',
  'layout-grid',
  5
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  how_atedays_wins = EXCLUDED.how_atedays_wins,
  icon = EXCLUDED.icon,
  priority = EXCLUDED.priority;
