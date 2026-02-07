-- Seed initial competitors data
-- Run this AFTER add_competitors.sql to populate the competitors table

-- Insert competitors from the provided list
INSERT INTO competitors (name, website_url, category, status, discovered_via) VALUES
  ('Thorne', 'https://www.thorne.com/', 'multi', 'active', 'manual'),
  ('StudySupps', 'https://studysupps.com/', 'focus', 'active', 'manual'),
  ('Ritual', 'https://ritual.com/', 'multi', 'active', 'manual'),
  ('Proper Health', 'https://properhealth.com/', 'sleep', 'active', 'manual'),
  ('Gruns', 'https://gruns.co/', 'multi', 'active', 'manual'),
  ('MyDiso', 'https://mydiso.com/', 'multi', 'active', 'manual'),
  ('LMNT', 'https://drinklmnt.com/', 'general', 'active', 'manual'),
  ('Trace Minerals', 'https://www.traceminerals.com/', 'general', 'active', 'manual'),
  ('Magna', 'https://www.drinkmagna.com/', 'calm', 'active', 'manual'),
  ('Supermoon', 'https://drinksupermoon.com/', 'sleep', 'active', 'manual'),
  ('NEAP Foods', 'https://neapfoods.com/', 'multi', 'active', 'manual'),
  ('Bakers Botanics', 'https://bakersbotanics.com/', 'calm', 'active', 'manual'),
  ('Slow Mornings', 'https://tryslowmornings.com/', 'calm', 'active', 'manual'),
  ('Mojo', 'https://grabmojo.com/', 'focus', 'active', 'manual'),
  ('Create', 'https://trycreate.co/', 'focus', 'active', 'manual'),
  ('Bloom Nu', 'https://bloomnu.com/', 'multi', 'active', 'manual'),
  ('Peach Perfect', 'https://peachperfect.com/', 'multi', 'active', 'manual'),
  ('Feelz', 'https://findyourfeelz.com/', 'calm', 'active', 'manual'),
  ('Absorb More', 'https://www.absorbmore.com/', 'multi', 'active', 'manual'),
  ('Juced', 'https://juced.co/', 'focus', 'active', 'manual'),
  ('Seed', 'https://seed.com/', 'multi', 'active', 'manual'),
  ('IM8 Health', 'https://im8health.com/', 'sleep', 'active', 'manual'),
  ('Timeline', 'https://www.timeline.com/', 'multi', 'active', 'manual'),
  ('Biologica', 'https://biologica.com/', 'multi', 'active', 'manual'),
  ('Alani Nu', 'https://www.alaninu.com/', 'multi', 'active', 'manual'),
  ('Transparent Labs', 'https://www.transparentlabs.com/', 'multi', 'active', 'manual'),
  ('BioTrust', 'https://www.biotrust.com/', 'multi', 'active', 'manual'),
  ('Naked Nutrition', 'https://nakednutrition.com/', 'multi', 'active', 'manual'),
  ('HumanN', 'https://humann.com/', 'multi', 'active', 'manual'),
  ('Good Bacteria', 'https://itsgoodbacteria.com/', 'multi', 'active', 'manual'),
  ('Loam Science', 'https://loamscience.com/', 'multi', 'active', 'manual'),
  ('Tru Niagen', 'https://www.truniagen.com/', 'multi', 'active', 'manual'),
  ('Elysium Health', 'https://www.elysiumhealth.com/', 'multi', 'active', 'manual')
ON CONFLICT DO NOTHING;

-- Add competitors mentioned in pain points section
INSERT INTO competitors (name, website_url, category, status, discovered_via, notes) VALUES
  ('AG1 (Athletic Greens)', 'https://drinkag1.com/', 'multi', 'active', 'manual', 'Mentioned in pain points analysis - proprietary blend concerns'),
  ('Moon Juice', 'https://moonjuice.com/', 'calm', 'active', 'manual', 'Mentioned in pain points analysis - efficacy concerns'),
  ('Known Nutrition', 'https://knownnutrition.com/', 'multi', 'active', 'manual', 'Mentioned in pain points analysis - subscription issues')
ON CONFLICT DO NOTHING;
