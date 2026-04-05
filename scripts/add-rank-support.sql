-- Optional: supports E-4 Corporal (week 1–2 plan viewed) and leaderboard-linked E-9 ranks.
-- Run after add-rank-columns.sql if you use those features.

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_week_12_viewed BOOLEAN DEFAULT FALSE;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
