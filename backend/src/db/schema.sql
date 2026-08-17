-- exam-management-system/backend/src/db/schema.sql

DROP TABLE IF EXISTS student_responses, exam_sessions, questions, exam_sections, exams, students, download_audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(3) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_no VARCHAR(20) NOT NULL,
  class VARCHAR(50) NOT NULL,
  batch VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS exams (
  exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  target_batch VARCHAR(50) NOT NULL,
  full_marks INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'CREATED', 'STARTED', 'PAUSED', 'ENDED')),
  scheduled_start TIMESTAMP,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  global_seconds_left INTEGER,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_sections (
  section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  section_marks INTEGER NOT NULL,
  section_type VARCHAR(20) NOT NULL CHECK (section_type IN ('MCQ', 'FITB', 'TF', 'MATCH'))
);

CREATE TABLE IF NOT EXISTS questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES exam_sections(section_id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MCQ', 'FITB', 'TF', 'MATCH')),
  question_text_en TEXT NOT NULL,
  question_text_bn TEXT NOT NULL,
  options_json JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  student_id VARCHAR(3) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('READY', 'LOGGED_IN', 'EXAMINEE', 'PAUSED', 'COMPLETED', 'ABSENT')),
  password_provided VARCHAR(100) NOT NULL,
  tab_violation_count INTEGER NOT NULL DEFAULT 0,
  seconds_left INTEGER,
  last_active_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score DECIMAL(5,2) DEFAULT 0,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_responses (
  session_id UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN,
  awarded_marks DECIMAL(5,2),
  PRIMARY KEY (session_id, question_id)
);

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

CREATE TABLE IF NOT EXISTS exam_batches (
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  batch_name VARCHAR(100) NOT NULL,
  shuffle_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_id, batch_name)
);

CREATE TABLE IF NOT EXISTS exam_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  batch_name VARCHAR(100),
  exam_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  seconds_left INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS exam_session_question_order (
  session_id UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  PRIMARY KEY (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS download_audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(3) NOT NULL,
  exam_id UUID NOT NULL,
  session_id UUID NOT NULL,
  download_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

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
