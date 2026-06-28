-- exam-management-system/backend/src/db/schema.sql

DROP TABLE IF EXISTS student_responses, exam_sessions, questions, exam_sections, exams, students CASCADE;

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
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'CREATED', 'STARTED', 'ENDED')),
  scheduled_start TIMESTAMP,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_sections (
  section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  section_marks INTEGER NOT NULL,
  section_type VARCHAR(20) NOT NULL CHECK (section_type IN ('MCQ', 'FITB', 'TF'))
);

CREATE TABLE IF NOT EXISTS questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES exam_sections(section_id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MCQ', 'FITB', 'TF')),
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
  status VARCHAR(20) NOT NULL CHECK (status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED', 'COMPLETED', 'ABSENT')),
  password_provided VARCHAR(100) NOT NULL,
  tab_violation_count INTEGER NOT NULL DEFAULT 0,
  seconds_left INTEGER,
  last_active_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score INTEGER DEFAULT 0,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_responses (
  session_id UUID NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN,
  PRIMARY KEY (session_id, question_id)
);
