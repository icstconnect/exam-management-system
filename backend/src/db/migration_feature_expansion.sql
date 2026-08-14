-- Migration: Feature Expansion for ICST Exam Management System
-- Safe, backward-compatible migration preserving all existing data

-- 1. Create Batches table
CREATE TABLE IF NOT EXISTS batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  course_class VARCHAR(100),
  session VARCHAR(100),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial batches from students table and standard list
INSERT INTO batches (name, course_class, status)
SELECT DISTINCT batch, 'General', 'ACTIVE'
FROM students
WHERE batch IS NOT NULL AND batch != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO batches (name, course_class, status)
VALUES 
  ('V,VI Batch 1', 'Class 5, 6', 'ACTIVE'),
  ('V,VI,VII Batch -2', 'Class 5, 6, 7', 'ACTIVE'),
  ('VIII,IX Batch - 1', 'Class 8, 9', 'ACTIVE'),
  ('VII,VIII,IX Batch 2', 'Class 7, 8, 9', 'ACTIVE'),
  ('KIDS III, IV, V', 'Class 3, 4, 5', 'ACTIVE'),
  ('JDX IX,X', 'Class 9, 10', 'ACTIVE'),
  ('CJE (Java)', 'Advanced', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Exam Batches junction table
CREATE TABLE IF NOT EXISTS exam_batches (
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  batch_name VARCHAR(100) NOT NULL,
  shuffle_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_id, batch_name)
);

-- Populate exam_batches from existing target_batch in exams table
INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled)
SELECT exam_id, target_batch, FALSE
FROM exams
WHERE target_batch IS NOT NULL AND target_batch != ''
ON CONFLICT (exam_id, batch_name) DO NOTHING;

-- 3. Create Exam Runs table for attempt tracking & safe reset
CREATE TABLE IF NOT EXISTS exam_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  exam_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- 4. Enhance exam_sessions with run_id
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES exam_runs(run_id) ON DELETE SET NULL;

-- Backfill initial exam_runs for exams that already have sessions
DO $$
DECLARE
  exam_rec RECORD;
  new_run_id UUID;
BEGIN
  FOR exam_rec IN SELECT DISTINCT e.exam_id, e.title, e.scheduled_start, e.status FROM exams e JOIN exam_sessions es ON e.exam_id = es.exam_id WHERE es.run_id IS NULL LOOP
    new_run_id := gen_random_uuid();
    INSERT INTO exam_runs (run_id, exam_id, exam_name, created_at, status)
    VALUES (new_run_id, exam_rec.exam_id, exam_rec.title || ' (Initial Attempt)', COALESCE(exam_rec.scheduled_start, CURRENT_TIMESTAMP), exam_rec.status);
    
    UPDATE exam_sessions SET run_id = new_run_id WHERE exam_id = exam_rec.exam_id AND run_id IS NULL;
  END LOOP;
END $$;

-- Safely update unique constraint on exam_sessions to support multiple historical runs
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_student_id_key;
DROP INDEX IF EXISTS idx_exam_sessions_unique_run;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_sessions_unique_run ON exam_sessions(exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5. Create Question Order table for deterministic shuffling
CREATE TABLE IF NOT EXISTS exam_session_question_order (
  session_id UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  PRIMARY KEY (session_id, question_id)
);

-- 6. Indexes for LAN Performance and Fast Queries
CREATE INDEX IF NOT EXISTS idx_exams_title ON exams(title);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled ON exams(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_exam_runs_name ON exam_runs(exam_name);
CREATE INDEX IF NOT EXISTS idx_exam_runs_created ON exam_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_runs_exam_id ON exam_runs(exam_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
CREATE INDEX IF NOT EXISTS idx_exam_batches_exam ON exam_batches(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_batches_batch ON exam_batches(batch_name);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_run ON exam_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_session_qorder ON exam_session_question_order(session_id, display_order);
