-- Auth.js @auth/pg-adapter schema (UUID) + Train to Pass extensions.
-- Run once in Neon SQL Editor if tables don't exist.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  password TEXT,
  stripe_customer_id TEXT,
  google_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  current_rank TEXT DEFAULT 'E-1',
  rank_updated_at TIMESTAMPTZ,
  activity_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  plan_week_12_viewed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_provider_account_id
  ON accounts (provider, "providerAccountId");

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  event_scores JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS score_history_user_id_created_at
  ON score_history (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS general_program_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  training_days INTEGER NOT NULL,
  equipment TEXT NOT NULL,
  fitness_level TEXT NOT NULL,
  limitations TEXT,
  program_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS general_program_history_user_created_at
  ON general_program_history (user_id, created_at DESC);

-- If you created an older `users` table without billing fields, run:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
