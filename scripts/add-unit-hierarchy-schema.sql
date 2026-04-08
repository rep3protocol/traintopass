-- Unit hierarchy: Squad / Platoon / Company. Run in Neon after add-groups-schema.sql.

ALTER TABLE "groups"
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'squad';

ALTER TABLE "groups"
  DROP CONSTRAINT IF EXISTS groups_unit_type_check;

ALTER TABLE "groups"
  ADD CONSTRAINT groups_unit_type_check
  CHECK (unit_type IN ('squad', 'platoon', 'company'));

ALTER TABLE "groups"
  ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES "groups"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS groups_parent_group_id ON "groups"(parent_group_id);
CREATE INDEX IF NOT EXISTS groups_unit_type ON "groups"(unit_type);

ALTER TABLE "groups"
  ADD COLUMN IF NOT EXISTS creation_checkout_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS groups_creation_checkout_session_id_unique
  ON "groups"(creation_checkout_session_id)
  WHERE creation_checkout_session_id IS NOT NULL;
