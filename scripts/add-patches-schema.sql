-- Achievement patches + public profile flag. Run in Neon SQL Editor if needed.

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS achievement_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patch_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, patch_key)
);

CREATE INDEX IF NOT EXISTS achievement_patches_user_id ON achievement_patches(user_id);
