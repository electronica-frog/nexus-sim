-- Add versioning and feedback fields to AgentSkill
ALTER TABLE AgentSkill ADD COLUMN precision REAL;
ALTER TABLE AgentSkill ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE AgentSkill ADD COLUMN parentSkillId TEXT;
ALTER TABLE AgentSkill ADD COLUMN changeLog TEXT NOT NULL DEFAULT '';
ALTER TABLE AgentSkill ADD COLUMN lastFeedbackAt DATETIME;
ALTER TABLE AgentSkill ADD COLUMN feedbackScore REAL;
ALTER TABLE AgentSkill ADD COLUMN feedbackCount INTEGER NOT NULL DEFAULT 0;

-- Drop old unique constraint and add new one with version
-- SQLite doesn't support DROP CONSTRAINT, so we handle via Prisma client

-- Add foreign key for self-referential skill versioning
-- SQLite ALTER TABLE doesn't support ADD FOREIGN KEY, so we skip it
-- The relation will work via Prisma client logic
