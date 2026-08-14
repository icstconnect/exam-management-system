-- Migration: Safe Soft Delete for Examination Sets
-- Preserves all historical exam runs, student sessions, responses, scores, and answer sheets

ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_exams_is_deleted ON exams(is_deleted);
