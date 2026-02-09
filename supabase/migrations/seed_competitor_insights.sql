-- Migration: Seed initial competitor pain points from research
-- Run this AFTER add_competitive_intelligence.sql and ensure competitors exist

-- =====================================================
-- HELPER: Insert pain points for competitors by name
-- This uses a DO block to handle the lookups
-- =====================================================

DO $$
DECLARE
  -- Pain point category IDs
  pp_digital UUID;
  pp_physical UUID;
  pp_side_effects UUID;
  pp_transparency UUID;
  pp_efficacy UUID;
  
  -- White space opportunity IDs
  ws_transparency UUID;
  ws_human UUID;
  ws_roadmap UUID;
  ws_sensory UUID;
  ws_ecosystem UUID;
  
  -- Competitor IDs
  comp_ritual UUID;
  comp_seed UUID;
  comp_ag1 UUID;
  comp_thorne UUID;
  comp_alani UUID;
  comp_bloom UUID;
BEGIN
  -- Get pain point category IDs
  SELECT id INTO pp_digital FROM pain_point_categories WHERE slug = 'digital-delivery-fatigue';
  SELECT id INTO pp_physical FROM pain_point_categories WHERE slug = 'physical-delivery-fatigue';
  SELECT id INTO pp_side_effects FROM pain_point_categories WHERE slug = 'side-effects-sensory';
  SELECT id INTO pp_transparency FROM pain_point_categories WHERE slug = 'transparency-distrust';
  SELECT id INTO pp_efficacy FROM pain_point_categories WHERE slug = 'bioavailability-efficacy';
  
  -- Get white space opportunity IDs
  SELECT id INTO ws_transparency FROM white_space_opportunities WHERE slug = 'radical-transparency';
  SELECT id INTO ws_human FROM white_space_opportunities WHERE slug = 'human-logistics';
  SELECT id INTO ws_roadmap FROM white_space_opportunities WHERE slug = 'biological-roadmap';
  SELECT id INTO ws_sensory FROM white_space_opportunities WHERE slug = 'sensory-neutral';
  SELECT id INTO ws_ecosystem FROM white_space_opportunities WHERE slug = 'ecosystem-integration';
  
  -- Get competitor IDs (these should exist from previous seeding)
  SELECT id INTO comp_ritual FROM competitors WHERE LOWER(name) = 'ritual' LIMIT 1;
  SELECT id INTO comp_seed FROM competitors WHERE LOWER(name) = 'seed' LIMIT 1;
  SELECT id INTO comp_ag1 FROM competitors WHERE LOWER(name) LIKE '%ag1%' OR LOWER(name) LIKE '%athletic greens%' LIMIT 1;
  SELECT id INTO comp_thorne FROM competitors WHERE LOWER(name) = 'thorne' LIMIT 1;
  SELECT id INTO comp_alani FROM competitors WHERE LOWER(name) LIKE '%alani%' LIMIT 1;
  SELECT id INTO comp_bloom FROM competitors WHERE LOWER(name) LIKE '%bloom%' LIMIT 1;
  
  -- =====================================================
  -- RITUAL PAIN POINTS
  -- =====================================================
  IF comp_ritual IS NOT NULL THEN
    -- Digital Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_ritual, pp_digital, 'high', 
      'Automatic renew subscription is very bad system and like a scam... totally misleading!!!',
      'https://nz.trustpilot.com/review/ritual.com?page=2',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- Side Effects
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_ritual, pp_side_effects, 'high',
      'horrible taste of essentials oils that is so potent it burns for hours after taking it',
      'https://nz.trustpilot.com/review/ritual.com?page=2',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for Ritual
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_ritual, ws_transparency, 6, 'Uses some transparency but still has gaps'),
      (comp_ritual, ws_human, 8, 'Subscription complaints suggest poor human support'),
      (comp_ritual, ws_sensory, 9, 'Essential oil taste causes significant complaints'),
      (comp_ritual, ws_roadmap, 5, 'Some education but still hype-focused'),
      (comp_ritual, ws_ecosystem, 7, 'No productivity integration')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
  -- =====================================================
  -- SEED PAIN POINTS
  -- =====================================================
  IF comp_seed IS NOT NULL THEN
    -- Digital Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_seed, pp_digital, 'high',
      'Tons of bots and no feedback! My order wasnt delivered... no answer to tons of ticket emails.',
      'https://www.trustpilot.com/review/seed.com?page=8',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_seed, pp_digital, 'high',
      'no way to cancel a subscription nor does the site allow me to remove the credit card that is charged',
      'https://www.trustpilot.com/review/seed.com?page=8',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- Physical Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_seed, pp_physical, 'medium',
      'Received another [order] and they were delivered in a paper bag! Some of the pills broke open and it looked like green sand!',
      'https://www.trustpilot.com/review/seed.com?page=8',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- Side Effects
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_seed, pp_side_effects, 'medium',
      'Got a terrible rash like hives all over my skin, my face and body',
      'https://www.trustpilot.com/review/seed.com?page=8',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for Seed
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_seed, ws_transparency, 4, 'Generally good transparency practices'),
      (comp_seed, ws_human, 9, 'Major complaints about bot support and subscription management'),
      (comp_seed, ws_sensory, 5, 'Some packaging issues but product itself is neutral'),
      (comp_seed, ws_roadmap, 4, 'Good science communication'),
      (comp_seed, ws_ecosystem, 8, 'No productivity integration features')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
  -- =====================================================
  -- AG1 / ATHLETIC GREENS PAIN POINTS
  -- =====================================================
  IF comp_ag1 IS NOT NULL THEN
    -- Transparency & Blend Distrust
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_ag1, pp_transparency, 'high',
      'the proprietary blend in AG1 has ashwagandha too, in unknown quantities',
      'https://www.reddit.com/r/Supplements/',
      'reddit')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_ag1, pp_transparency, 'high',
      'No dosage amounts for most of the ingredients. Your body cannot actually digest many stated benefits in a powder form.',
      'https://www.reddit.com/r/Supplements/',
      'reddit')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for AG1
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_ag1, ws_transparency, 9, 'Proprietary blends are a major concern'),
      (comp_ag1, ws_human, 5, 'Average support'),
      (comp_ag1, ws_sensory, 3, 'Powder form is generally well-received'),
      (comp_ag1, ws_roadmap, 6, 'Heavy marketing focus'),
      (comp_ag1, ws_ecosystem, 7, 'No productivity integration')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
  -- =====================================================
  -- THORNE PAIN POINTS
  -- =====================================================
  IF comp_thorne IS NOT NULL THEN
    -- Digital Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_thorne, pp_digital, 'medium',
      'Not good they just keep trying to take your money and order for you!!',
      'https://www.trustpilot.com/',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- Physical Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_thorne, pp_physical, 'medium',
      'saw how excessive the dose was and thought it looked like a bad idea',
      'https://www.reddit.com/r/Supplements/',
      'reddit')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for Thorne
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_thorne, ws_transparency, 3, 'Good transparency, third-party tested'),
      (comp_thorne, ws_human, 6, 'Some subscription friction reported'),
      (comp_thorne, ws_sensory, 5, 'Standard pill format'),
      (comp_thorne, ws_roadmap, 4, 'Science-focused brand'),
      (comp_thorne, ws_ecosystem, 8, 'No productivity integration')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
  -- =====================================================
  -- ALANI NU PAIN POINTS
  -- =====================================================
  IF comp_alani IS NOT NULL THEN
    -- Physical Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_alani, pp_physical, 'medium',
      'capsules are kinda big in size (and you have take 4 every day)',
      'https://www.reddit.com/r/Supplements/',
      'reddit')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for Alani Nu
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_alani, ws_transparency, 5, 'Moderate transparency'),
      (comp_alani, ws_human, 5, 'Average support'),
      (comp_alani, ws_sensory, 6, 'Pill burden issues'),
      (comp_alani, ws_roadmap, 7, 'Lifestyle marketing focus'),
      (comp_alani, ws_ecosystem, 8, 'No productivity integration')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
  -- =====================================================
  -- BLOOM PAIN POINTS
  -- =====================================================
  IF comp_bloom IS NOT NULL THEN
    -- Digital Delivery Fatigue
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_bloom, pp_digital, 'high',
      'signed up for the 1.00 intro then got charged almost $40 for a subscription without authorizing it',
      'https://www.trustpilot.com/',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO competitor_pain_points (competitor_id, pain_point_id, severity, evidence, source_url, source_type)
    VALUES (comp_bloom, pp_digital, 'high',
      '4 emails sent so far as I have been trying to cancel a subscription... No response from the company at all!',
      'https://www.trustpilot.com/',
      'trustpilot')
    ON CONFLICT DO NOTHING;
    
    -- White space scores for Bloom
    INSERT INTO competitor_white_space_scores (competitor_id, white_space_id, score, notes)
    VALUES 
      (comp_bloom, ws_transparency, 6, 'Some transparency gaps'),
      (comp_bloom, ws_human, 9, 'Major subscription and support complaints'),
      (comp_bloom, ws_sensory, 4, 'Greens powder format'),
      (comp_bloom, ws_roadmap, 7, 'Influencer-driven marketing'),
      (comp_bloom, ws_ecosystem, 8, 'No productivity integration')
    ON CONFLICT (competitor_id, white_space_id) DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes;
  END IF;
  
END $$;

-- =====================================================
-- UPDATE AI SUMMARIES FOR SEEDED COMPETITORS
-- =====================================================
UPDATE competitors 
SET ai_summary = 'Known for subscription friction and essential oil taste issues. Positioned as premium women''s vitamins but faces trust challenges.'
WHERE LOWER(name) = 'ritual';

UPDATE competitors 
SET ai_summary = 'Strong science positioning but heavily criticized for bot support, subscription lock-in, and packaging issues.'
WHERE LOWER(name) = 'seed';

UPDATE competitors 
SET ai_summary = 'Market leader in greens powders but proprietary blends raise transparency concerns. Heavy influencer marketing.'
WHERE LOWER(name) LIKE '%ag1%' OR LOWER(name) LIKE '%athletic greens%';

UPDATE competitors 
SET ai_summary = 'Respected for quality and third-party testing but faces some subscription management complaints.'
WHERE LOWER(name) = 'thorne';

UPDATE competitors 
SET ai_summary = 'Popular lifestyle brand but pill burden (4 capsules/day) is a common complaint.'
WHERE LOWER(name) LIKE '%alani%';

UPDATE competitors 
SET ai_summary = 'Fast-growing greens brand with significant subscription dark pattern complaints and support issues.'
WHERE LOWER(name) LIKE '%bloom%';
