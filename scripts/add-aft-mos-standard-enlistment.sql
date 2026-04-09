-- Run once in Neon if enlistment_profiles exists without aft_mos_standard.
ALTER TABLE enlistment_profiles
  ADD COLUMN IF NOT EXISTS aft_mos_standard TEXT NOT NULL DEFAULT 'general';
