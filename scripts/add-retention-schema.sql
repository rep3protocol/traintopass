-- Retention: daily challenges, referrals, push subscriptions.
-- Referrals.referral_code stores the referrer's public code (same value may repeat per invitee; not globally unique).
-- free_month_period_start: start of the current 30-day complimentary access window (see lib/user-subscription.ts).

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_reps INTEGER,
  target_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  result TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referrer_credited_at TIMESTAMPTZ,
  referred_credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_months_credited INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_month_period_start TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_streak_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_challenge_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_unit_enabled BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS challenge_completions_user_id ON challenge_completions(user_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code ON referrals(referral_code);
