-- Pre-enlistment profiles and weekly progress. Run in Neon SQL Editor if needed.
-- plan_markdown: optional; stores generated 12-week plan for signed-in users.

CREATE TABLE IF NOT EXISTS enlistment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  branch TEXT NOT NULL DEFAULT 'Army',
  component TEXT NOT NULL DEFAULT 'Active Duty',
  target_date DATE,
  age INTEGER,
  gender TEXT,
  current_pushups INTEGER,
  current_run_minutes INTEGER,
  current_run_seconds INTEGER,
  limitations TEXT,
  plan_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enlistment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS enlistment_profiles_user_id ON enlistment_profiles(user_id);
CREATE INDEX IF NOT EXISTS enlistment_progress_user_id ON enlistment_progress(user_id);
