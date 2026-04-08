-- Unit / squad training groups. Table name is quoted because `groups` is reserved in PostgreSQL.
-- Run in Neon SQL Editor after neon-schema.sql.

CREATE TABLE IF NOT EXISTS "groups" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL DEFAULT 'squad',
  parent_group_id UUID REFERENCES "groups"(id) ON DELETE SET NULL,
  creation_checkout_session_id TEXT,
  aft_test_date DATE,
  weekly_challenge_score INTEGER,
  weekly_challenge_set_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT groups_unit_type_check CHECK (unit_type IN ('squad', 'platoon', 'company'))
);

CREATE UNIQUE INDEX IF NOT EXISTS groups_creation_checkout_session_id_unique
  ON "groups"(creation_checkout_session_id)
  WHERE creation_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS groups_parent_group_id ON "groups"(parent_group_id);
CREATE INDEX IF NOT EXISTS groups_unit_type ON "groups"(unit_type);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_announcements_group_id ON group_announcements(group_id);
