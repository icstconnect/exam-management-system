import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import pool from './db';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For local LAN testing, allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Initialize DB schema additions if needed on boot
(async function initSchema() {
  try {
    await pool.query(`
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

      ALTER TABLE exam_runs ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100);
      ALTER TABLE exam_runs ADD COLUMN IF NOT EXISTS seconds_left INTEGER;
      ALTER TABLE exam_runs ADD COLUMN IF NOT EXISTS fullscreen_enforced BOOLEAN DEFAULT TRUE;
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES exam_runs(run_id) ON DELETE SET NULL;
      ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_student_id_key;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_sessions_unique_run ON exam_sessions(exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid));

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
    `);
  } catch (err) {
    console.error('Database schema init notice:', err);
  }
})();

export interface ActiveTimerState {
  timer: NodeJS.Timeout;
  secondsLeft: number;
  lastTick: number;
}

const activeExamTimers = new Map<string, ActiveTimerState>();

// Health Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// ==========================================
// 1. BATCH MANAGEMENT REST APIs
// ==========================================

app.get('/api/batches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, COALESCE(sc.student_count, 0)::int as student_count
      FROM batches b
      LEFT JOIN (
        SELECT batch, COUNT(*) as student_count 
        FROM students 
        WHERE batch IS NOT NULL AND batch != ''
        GROUP BY batch
      ) sc ON b.name = sc.batch
      ORDER BY b.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

app.post('/api/batches', async (req, res) => {
  try {
    const { name, course_class, session, description, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Batch name is required' });
    }
    const result = await pool.query(
      `INSERT INTO batches (name, course_class, session, description, status) 
       VALUES ($1, $2, $3, $4, COALESCE($5, 'ACTIVE')) 
       RETURNING *`,
      [name.trim(), course_class || '', session || '', description || '', status || 'ACTIVE']
    );
    res.json({ success: true, batch: result.rows[0] });
  } catch (err: any) {
    console.error('Error creating batch:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A batch with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

app.put('/api/batches/:id', async (req, res) => {
  try {
    const batch_id = req.params.id;
    const { name, course_class, session, description, status } = req.body;

    const oldBatchRes = await pool.query("SELECT name FROM batches WHERE batch_id = $1", [batch_id]);
    if (oldBatchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const oldName = oldBatchRes.rows[0].name;

    const result = await pool.query(
      `UPDATE batches 
       SET name = $1, course_class = $2, session = $3, description = $4, status = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE batch_id = $6 
       RETURNING *`,
      [name.trim(), course_class, session, description, status, batch_id]
    );

    // If batch name changed, update students & exam_batches
    if (name.trim() !== oldName) {
      await pool.query("UPDATE students SET batch = $1 WHERE batch = $2", [name.trim(), oldName]);
      await pool.query("UPDATE exam_batches SET batch_name = $1 WHERE batch_name = $2", [name.trim(), oldName]);
      await pool.query("UPDATE exams SET target_batch = $1 WHERE target_batch = $2", [name.trim(), oldName]);
    }

    res.json({ success: true, batch: result.rows[0] });
  } catch (err: any) {
    console.error('Error updating batch:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A batch with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

app.delete('/api/batches/:id', async (req, res) => {
  try {
    const batch_id = req.params.id;
    const batchRes = await pool.query("SELECT name FROM batches WHERE batch_id = $1", [batch_id]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const batchName = batchRes.rows[0].name;

    const countRes = await pool.query("SELECT COUNT(*) FROM students WHERE batch = $1", [batchName]);
    const studentCount = parseInt(countRes.rows[0].count, 10);
    if (studentCount > 0) {
      return res.status(400).json({ error: `Cannot delete batch '${batchName}' because it has ${studentCount} assigned student(s). Please move students first.` });
    }

    await pool.query("DELETE FROM exam_batches WHERE batch_name = $1", [batchName]);
    await pool.query("DELETE FROM batches WHERE batch_id = $1", [batch_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting batch:', err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

app.get('/api/batches/:id/students', async (req, res) => {
  try {
    const batch_id = req.params.id;
    const batchRes = await pool.query("SELECT name FROM batches WHERE batch_id = $1", [batch_id]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const batchName = batchRes.rows[0].name;

    const studentsRes = await pool.query("SELECT * FROM students WHERE batch = $1 ORDER BY student_id ASC", [batchName]);
    res.json({ batch_name: batchName, students: studentsRes.rows });
  } catch (err) {
    console.error('Error fetching batch students:', err);
    res.status(500).json({ error: 'Failed to fetch batch students' });
  }
});

app.post('/api/batches/move-students', async (req, res) => {
  try {
    const { student_ids, target_batch } = req.body;
    if (!Array.isArray(student_ids) || student_ids.length === 0 || !target_batch) {
      return res.status(400).json({ error: 'student_ids array and target_batch are required' });
    }
    await pool.query("UPDATE students SET batch = $1 WHERE student_id = ANY($2)", [target_batch, student_ids]);
    res.json({ success: true, moved_count: student_ids.length });
  } catch (err) {
    console.error('Error moving students:', err);
    res.status(500).json({ error: 'Failed to move students' });
  }
});

// ==========================================
// 2. STUDENT MANAGEMENT REST APIs
// ==========================================

app.post('/api/students', async (req, res) => {
  try {
    const { student_id, name, phone_no, student_class, batch } = req.body;
    await pool.query(
      "INSERT INTO students (student_id, name, phone_no, class, batch) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id) DO UPDATE SET name = EXCLUDED.name, phone_no = EXCLUDED.phone_no, class = EXCLUDED.class, batch = EXCLUDED.batch",
      [student_id, name, phone_no, student_class, batch]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register student' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY student_id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const student_id = req.params.id;
    await pool.query("DELETE FROM students WHERE student_id = $1", [student_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ==========================================
// 3. EXAM MANAGEMENT & MULTI-BATCH ASSIGNMENT
// ==========================================

app.post('/api/exams', async (req, res) => {
  try {
    const { title, duration_minutes, target_batch, full_marks, batches } = req.body;
    const initialTargetBatch = Array.isArray(batches) && batches.length > 0 ? (typeof batches[0] === 'string' ? batches[0] : batches[0].batch_name) : (target_batch || '');
    
    const result = await pool.query(
      "INSERT INTO exams (title, duration_minutes, target_batch, full_marks, status) VALUES ($1, $2, $3, $4, 'DRAFT') RETURNING *",
      [title, duration_minutes, initialTargetBatch, full_marks || 100]
    );
    const newExam = result.rows[0];

    // Assign batches if supplied
    if (Array.isArray(batches) && batches.length > 0) {
      for (const b of batches) {
        const batchName = typeof b === 'string' ? b : b.batch_name;
        const shuffle = typeof b === 'object' && b.shuffle_enabled !== undefined ? !!b.shuffle_enabled : false;
        if (batchName) {
          await pool.query(
            "INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled) VALUES ($1, $2, $3) ON CONFLICT (exam_id, batch_name) DO UPDATE SET shuffle_enabled = EXCLUDED.shuffle_enabled",
            [newExam.exam_id, batchName, shuffle]
          );
        }
      }
    } else if (initialTargetBatch) {
      await pool.query(
        "INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled) VALUES ($1, $2, FALSE) ON CONFLICT (exam_id, batch_name) DO NOTHING",
        [newExam.exam_id, initialTargetBatch]
      );
    }

    res.json({ success: true, exam: newExam });
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

app.get('/api/exams', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
        COALESCE(
          json_agg(
            json_build_object('batch_name', eb.batch_name, 'shuffle_enabled', eb.shuffle_enabled)
          ) FILTER (WHERE eb.batch_name IS NOT NULL), 
          '[]'::json
        ) as assigned_batches
      FROM exams e
      LEFT JOIN exam_batches eb ON e.exam_id = eb.exam_id
      WHERE COALESCE(e.is_deleted, false) = false
      GROUP BY e.exam_id
      ORDER BY e.scheduled_start DESC NULLS LAST, e.title ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

app.get('/api/exams/:id/batches', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const result = await pool.query(
      "SELECT batch_name, shuffle_enabled FROM exam_batches WHERE exam_id = $1 ORDER BY batch_name ASC",
      [exam_id]
    );
    if (result.rows.length === 0) {
      const examRes = await pool.query("SELECT target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length > 0 && examRes.rows[0].target_batch) {
        return res.json([{ batch_name: examRes.rows[0].target_batch, shuffle_enabled: false }]);
      }
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exam batches:', err);
    res.status(500).json({ error: 'Failed to fetch exam batches' });
  }
});

app.put('/api/exams/:id/batches', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { batches } = req.body; // Array of { batch_name: string, shuffle_enabled: boolean }

    if (!Array.isArray(batches)) {
      return res.status(400).json({ error: 'batches must be an array' });
    }

    await pool.query("DELETE FROM exam_batches WHERE exam_id = $1", [exam_id]);

    for (const b of batches) {
      const batchName = typeof b === 'string' ? b : b.batch_name;
      const shuffle = typeof b === 'object' && b.shuffle_enabled !== undefined ? !!b.shuffle_enabled : false;
      if (batchName) {
        await pool.query(
          "INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled) VALUES ($1, $2, $3) ON CONFLICT (exam_id, batch_name) DO UPDATE SET shuffle_enabled = EXCLUDED.shuffle_enabled",
          [exam_id, batchName, shuffle]
        );
      }
    }

    // Update fallback target_batch on exams
    const firstBatch = batches[0] ? (typeof batches[0] === 'string' ? batches[0] : batches[0].batch_name) : '';
    await pool.query("UPDATE exams SET target_batch = $1 WHERE exam_id = $2", [firstBatch, exam_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating exam batches:', err);
    res.status(500).json({ error: 'Failed to update exam batches' });
  }
});

app.put('/api/exams/:id', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { title, duration_minutes, full_marks, target_batch, batches } = req.body;
    
    let primaryBatch = target_batch;
    if (Array.isArray(batches) && batches.length > 0) {
      primaryBatch = typeof batches[0] === 'string' ? batches[0] : batches[0].batch_name;
      await pool.query("DELETE FROM exam_batches WHERE exam_id = $1", [exam_id]);
      for (const b of batches) {
        const batchName = typeof b === 'string' ? b : b.batch_name;
        const shuffle = typeof b === 'object' && b.shuffle_enabled !== undefined ? !!b.shuffle_enabled : false;
        if (batchName) {
          await pool.query(
            "INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled) VALUES ($1, $2, $3) ON CONFLICT (exam_id, batch_name) DO UPDATE SET shuffle_enabled = EXCLUDED.shuffle_enabled",
            [exam_id, batchName, shuffle]
          );
        }
      }
    }

    await pool.query(
      "UPDATE exams SET title = $1, duration_minutes = $2, full_marks = $3, target_batch = $4 WHERE exam_id = $5",
      [title, duration_minutes, full_marks, primaryBatch, exam_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Safe Soft Delete for Examination Sets (Preserves historical runs, sessions, scores, and answer sheets)
app.delete('/api/exams/:id', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const examRes = await pool.query("SELECT exam_id, title, status, is_deleted FROM exams WHERE exam_id = $1", [exam_id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Examination not found' });
    }
    const exam = examRes.rows[0];

    // Prevent accidental deletion of currently running / paused exam
    if (exam.status === 'STARTED' || exam.status === 'PAUSED') {
      return res.status(400).json({ 
        error: `This examination is currently active (Status: ${exam.status}). Please stop/end the examination before deleting the examination set.` 
      });
    }

    // Soft-delete examination definition: historical runs, sessions, responses, and questions remain intact
    await pool.query(
      "UPDATE exams SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE exam_id = $1",
      [exam_id]
    );

    res.json({ 
      success: true, 
      message: `Examination '${exam.title}' deleted successfully. Previously recorded examination results have been preserved.` 
    });
  } catch (err) {
    console.error('Error soft-deleting exam:', err);
    res.status(500).json({ error: 'Failed to delete examination' });
  }
});

app.post('/api/exams/:id/publish', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const examRes = await pool.query("SELECT * FROM exams WHERE exam_id = $1", [exam_id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRes.rows[0];
    
    if (exam.status !== 'DRAFT') return res.status(400).json({ error: 'Exam is not a draft' });

    await pool.query("UPDATE exams SET status = 'CREATED' WHERE exam_id = $1", [exam_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
});

// ==========================================
// 4. SECTIONS & QUESTIONS
// ==========================================

app.get('/api/exams/:id/sections', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const sectionsRes = await pool.query("SELECT * FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
    const sections = sectionsRes.rows;
    const questionsRes = await pool.query("SELECT * FROM questions WHERE exam_id = $1 ORDER BY question_id", [exam_id]);
    const questions = questionsRes.rows;
    
    const fullSections = sections.map(sec => ({
      ...sec,
      questions: questions.filter(q => q.section_id === sec.section_id)
    }));

    res.json(fullSections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

app.post('/api/sections', async (req, res) => {
  try {
    const { exam_id, title, section_marks, section_type, total_questions_expected } = req.body;
    const result = await pool.query(
      "INSERT INTO exam_sections (exam_id, title, section_marks, section_type, total_questions_expected) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [exam_id, title, section_marks, section_type, parseInt(total_questions_expected) || 0]
    );

    // Sync exam full marks
    await pool.query(
      "UPDATE exams SET full_marks = (SELECT COALESCE(SUM(section_marks), 0) FROM exam_sections WHERE exam_id = $1) WHERE exam_id = $1",
      [exam_id]
    );

    res.json({ success: true, section: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

app.put('/api/sections/:id', async (req, res) => {
  try {
    const section_id = req.params.id;
    const { title, section_marks, section_type, total_questions_expected } = req.body;
    const totalExpected = parseInt(total_questions_expected) || 0;
    const totalSecMarks = parseFloat(section_marks) || 0;

    const result = await pool.query(
      "UPDATE exam_sections SET title = $1, section_marks = $2, section_type = $3, total_questions_expected = $4 WHERE section_id = $5 RETURNING exam_id",
      [title, totalSecMarks, section_type, totalExpected, section_id]
    );

    if (result.rows.length > 0) {
      const exam_id = result.rows[0].exam_id;
      // Auto-distribute evenly to all existing questions in this section
      const qCountRes = await pool.query("SELECT COUNT(*)::int as count FROM questions WHERE section_id = $1", [section_id]);
      const currentQCount = qCountRes.rows[0]?.count || 0;
      const divisor = totalExpected > 0 ? totalExpected : (currentQCount > 0 ? currentQCount : 1);
      const evenMark = Math.round((totalSecMarks / divisor) * 100) / 100;

      if (evenMark > 0) {
        await pool.query("UPDATE questions SET marks = $1 WHERE section_id = $2", [evenMark, section_id]);
      }

      // Sync exam full marks
      await pool.query(
        "UPDATE exams SET full_marks = (SELECT COALESCE(SUM(section_marks), 0) FROM exam_sections WHERE exam_id = $1) WHERE exam_id = $1",
        [exam_id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating section:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

app.delete('/api/sections/:id', async (req, res) => {
  try {
    const section_id = req.params.id;
    const secRes = await pool.query("SELECT exam_id FROM exam_sections WHERE section_id = $1", [section_id]);
    const exam_id = secRes.rows[0]?.exam_id;

    await pool.query("DELETE FROM questions WHERE section_id = $1", [section_id]);
    await pool.query("DELETE FROM exam_sections WHERE section_id = $1", [section_id]);

    if (exam_id) {
      await pool.query(
        "UPDATE exams SET full_marks = (SELECT COALESCE(SUM(section_marks), 0) FROM exam_sections WHERE exam_id = $1) WHERE exam_id = $1",
        [exam_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks } = req.body;
    
    let finalMarks = parseFloat(marks);
    if (isNaN(finalMarks) || finalMarks <= 0) {
      const secRes = await pool.query("SELECT section_marks, total_questions_expected FROM exam_sections WHERE section_id = $1", [section_id]);
      if (secRes.rows.length > 0) {
        const sec = secRes.rows[0];
        const divisor = sec.total_questions_expected > 0 ? sec.total_questions_expected : 1;
        finalMarks = Math.round(((sec.section_marks || 20) / divisor) * 100) / 100;
      } else {
        finalMarks = 1;
      }
    }

    await pool.query(
      "INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [exam_id, section_id, question_type, question_text_en, question_text_bn, JSON.stringify(options_json), correct_answer, finalMarks]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const question_id = req.params.id;
    const { question_text_en, question_text_bn, options_json, correct_answer, marks } = req.body;
    await pool.query(
      "UPDATE questions SET question_text_en = $1, question_text_bn = $2, options_json = $3, correct_answer = $4, marks = $5 WHERE question_id = $6",
      [question_text_en, question_text_bn, JSON.stringify(options_json), correct_answer, marks, question_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM questions WHERE question_id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ==========================================
// 5. QUESTION PAPER DOWNLOAD ENDPOINTS (TEACHER & STUDENT)
// ==========================================

// Teacher full question set with answer key
app.get('/api/exams/:id/teacher-question-paper', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const examRes = await pool.query("SELECT * FROM exams WHERE exam_id = $1", [exam_id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRes.rows[0];

    const sectionsRes = await pool.query("SELECT * FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
    const questionsRes = await pool.query("SELECT * FROM questions WHERE exam_id = $1 ORDER BY section_id, question_id", [exam_id]);

    const sectionsWithQuestions = sectionsRes.rows.map(sec => ({
      ...sec,
      questions: questionsRes.rows.filter(q => q.section_id === sec.section_id)
    }));

    res.json({
      exam,
      sections: sectionsWithQuestions
    });
  } catch (err) {
    console.error('Error generating teacher question paper:', err);
    res.status(500).json({ error: 'Failed to generate question paper' });
  }
});

// Student question paper preserving exact student's question order
app.get('/api/student-sessions/:session_id/student-question-paper', async (req, res) => {
  try {
    const { session_id } = req.params;
    const sessionRes = await pool.query(`
      SELECT s.name, s.student_id, s.class, s.batch, es.status, ex.title as exam_title, ex.full_marks, ex.duration_minutes, es.run_id, er.exam_name as run_name
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      LEFT JOIN exam_runs er ON es.run_id = er.run_id
      WHERE es.session_id = $1
    `, [session_id]);

    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const studentData = sessionRes.rows[0];

    // Fetch questions ordered by session_question_order
    const orderedQuestionsRes = await pool.query(`
      SELECT 
        q.question_id, q.section_id, q.question_type, q.question_text_en, q.question_text_bn,
        q.options_json, q.marks, sec.title as section_title, sec.section_type,
        sr.selected_option as student_answer,
        COALESCE(qo.display_order, 999999) as display_order
      FROM questions q
      JOIN exam_sessions es ON es.exam_id = q.exam_id
      LEFT JOIN exam_sections sec ON q.section_id = sec.section_id
      LEFT JOIN exam_session_question_order qo ON qo.session_id = es.session_id AND qo.question_id = q.question_id
      LEFT JOIN student_responses sr ON sr.session_id = es.session_id AND sr.question_id = q.question_id
      WHERE es.session_id = $1
      ORDER BY COALESCE(qo.display_order, 999999) ASC, sec.section_id ASC, q.question_id ASC
    `, [session_id]);

    res.json({
      student: studentData,
      questions: orderedQuestionsRes.rows
    });
  } catch (err) {
    console.error('Error fetching student question paper:', err);
    res.status(500).json({ error: 'Failed to fetch student question paper' });
  }
});

// Explicit Student Submit Endpoint
app.post('/api/student-sessions/:session_id/submit', async (req, res) => {
  try {
    const { session_id } = req.params;
    await forceSubmitExam(session_id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting student exam via API:', err);
    res.status(500).json({ error: 'Failed to submit examination' });
  }
});

// Student Waiting / Instruction Screen Information (with dynamic marks distribution)
app.get('/api/student-sessions/:session_id/waiting-info', async (req, res) => {
  try {
    const { session_id } = req.params;
    const sessionRes = await pool.query(`
      SELECT 
        s.student_id, s.name, s.batch, s.class, 
        ex.exam_id, ex.title as exam_title, ex.duration_minutes, ex.full_marks, ex.status as exam_status,
        es.status as session_status
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      WHERE es.session_id = $1
    `, [session_id]);

    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const info = sessionRes.rows[0];

    // Compute dynamic marks distribution from database
    const sectionsRes = await pool.query(`
      SELECT 
        sec.section_id, sec.title, sec.section_type, sec.section_marks,
        COUNT(q.question_id)::int as question_count,
        COALESCE(SUM(q.marks), 0)::float as total_section_marks,
        COALESCE(MIN(q.marks), 0)::float as min_marks,
        COALESCE(MAX(q.marks), 0)::float as max_marks,
        COALESCE(AVG(q.marks), 0)::float as avg_marks_per_question
      FROM exam_sections sec
      LEFT JOIN questions q ON sec.section_id = q.section_id
      WHERE sec.exam_id = $1
      GROUP BY sec.section_id, sec.title, sec.section_type, sec.section_marks
      ORDER BY sec.section_id
    `, [info.exam_id]);

    const totalQuestionsRes = await pool.query(`
      SELECT 
        COUNT(*)::int as count,
        COALESCE(SUM(marks), 0)::float as sum_marks
      FROM questions 
      WHERE exam_id = $1
    `, [info.exam_id]);

    const fullMarks = info.full_marks || totalQuestionsRes.rows[0]?.sum_marks || 100;

    // Format examination roll NYSDB01400<3-digit-roll>
    const paddedRoll = String(info.student_id).padStart(3, '0');
    const examRoll = `NYSDB01400${paddedRoll}`;

    res.json({
      student_id: info.student_id,
      exam_roll: examRoll,
      name: info.name,
      batch: info.batch,
      class: info.class,
      exam_title: info.exam_title,
      duration_minutes: info.duration_minutes,
      full_marks: fullMarks,
      total_questions: totalQuestionsRes.rows[0]?.count || 0,
      total_sections: sectionsRes.rows.length,
      sections: sectionsRes.rows
    });
  } catch (err) {
    console.error('Error fetching waiting screen info:', err);
    res.status(500).json({ error: 'Failed to fetch waiting screen info' });
  }
});

// Existing submitted answers endpoint (maintained for backward compatibility)
app.get('/api/student-sessions/:session_id/submitted-answers', async (req, res) => {
  try {
    const { session_id } = req.params;
    const sessionRes = await pool.query(`
      SELECT s.name, s.student_id, s.class, es.status, ex.title as exam_title, ex.duration_minutes
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      WHERE es.session_id = $1
    `, [session_id]);
    
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const sessionData = sessionRes.rows[0];

    const qaRes = await pool.query(`
      SELECT 
        q.question_id, q.section_id, q.question_type, q.question_text_en, q.question_text_bn,
        q.options_json, sec.title as section_title, sr.selected_option as student_answer
      FROM questions q
      JOIN exam_sessions es ON es.exam_id = q.exam_id
      LEFT JOIN exam_sections sec ON q.section_id = sec.section_id
      LEFT JOIN exam_session_question_order qo ON qo.session_id = es.session_id AND qo.question_id = q.question_id
      LEFT JOIN student_responses sr ON sr.session_id = es.session_id AND sr.question_id = q.question_id
      WHERE es.session_id = $1
      ORDER BY COALESCE(qo.display_order, 999999) ASC, sec.section_id, q.question_id
    `, [session_id]);

    res.json({
      student: sessionData,
      answers: qaRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submitted answers' });
  }
});

app.post('/api/student-sessions/:session_id/audit-log', async (req, res) => {
  try {
    const { session_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    const sessionRes = await pool.query("SELECT student_id, exam_id FROM exam_sessions WHERE session_id = $1", [session_id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const { student_id, exam_id } = sessionRes.rows[0];

    await pool.query(
      "INSERT INTO download_audit_logs (student_id, exam_id, session_id, ip_address) VALUES ($1, $2, $3, $4)",
      [student_id, exam_id, session_id, ip_address]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log download' });
  }
});

// ==========================================
// 6. PAGINATED EXAMINATION RUNS & RESULTS SEARCH
// ==========================================

app.get('/api/exam-runs', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string || '10', 10)));
    const offset = Math.max(0, parseInt(req.query.offset as string || '0', 10));
    const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

    let countQuery = `
      SELECT COUNT(*) 
      FROM exam_runs er 
      JOIN exams ex ON er.exam_id = ex.exam_id
      WHERE EXISTS (SELECT 1 FROM exam_sessions es WHERE es.run_id = er.run_id)
    `;
    let countParams: any[] = [];
    if (search) {
      countQuery += " AND (er.exam_name ILIKE $1 OR ex.title ILIKE $1)";
      countParams.push(search);
    }
    const countRes = await pool.query(countQuery, countParams);
    const total_count = parseInt(countRes.rows[0].count, 10);

    let query = `
      SELECT 
        er.run_id, er.exam_id, er.exam_name, er.created_at, er.started_at, er.ended_at, er.status,
        ex.title as exam_title, ex.duration_minutes, ex.full_marks,
        COALESCE(st_count.total_students, 0)::int as total_students,
        COALESCE(st_count.completed_students, 0)::int as completed_students
      FROM exam_runs er
      JOIN exams ex ON er.exam_id = ex.exam_id
      INNER JOIN (
        SELECT 
          run_id, 
          COUNT(*) as total_students,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_students
        FROM exam_sessions
        GROUP BY run_id
        HAVING COUNT(*) > 0
      ) st_count ON er.run_id = st_count.run_id
    `;
    let params: any[] = [];
    if (search) {
      query += " WHERE (er.exam_name ILIKE $1 OR ex.title ILIKE $1)";
      params.push(search);
      query += ` ORDER BY er.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY er.created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const runsRes = await pool.query(query, params);
    res.json({
      runs: runsRes.rows,
      total_count,
      limit,
      offset
    });
  } catch (err) {
    console.error('Error fetching exam runs:', err);
    res.status(500).json({ error: 'Failed to fetch exam runs' });
  }
});

app.get('/api/exam-runs/:runId/results', async (req, res) => {
  try {
    const { runId } = req.params;
    const runRes = await pool.query("SELECT * FROM exam_runs WHERE run_id = $1", [runId]);
    if (runRes.rows.length === 0) return res.status(404).json({ error: 'Exam run not found' });
    const run = runRes.rows[0];

    const resultsRes = await pool.query(`
      SELECT 
        s.student_id, 
        s.name, 
        s.class, 
        s.batch,
        COALESCE(es.score, 0) as score, 
        es.status, 
        COALESCE(es.tab_violation_count, 0) as tab_violation_count, 
        es.session_id,
        ex.full_marks,
        er.exam_name
      FROM exam_sessions es
      JOIN students s ON s.student_id = es.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      JOIN exam_runs er ON es.run_id = er.run_id
      WHERE es.run_id = $1
      ORDER BY 
        CASE WHEN es.status = 'COMPLETED' THEN 1 ELSE 2 END ASC,
        es.score DESC NULLS LAST, 
        s.name ASC
    `, [runId]);

    res.json({
      run,
      results: resultsRes.rows
    });
  } catch (err) {
    console.error('Error fetching run results:', err);
    res.status(500).json({ error: 'Failed to fetch run results' });
  }
});

app.delete('/api/exam-runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    // Explicit deletion requested by teacher
    await pool.query("DELETE FROM student_responses WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE run_id = $1)", [runId]);
    await pool.query("DELETE FROM exam_session_question_order WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE run_id = $1)", [runId]);
    await pool.query("DELETE FROM exam_sessions WHERE run_id = $1", [runId]);
    await pool.query("DELETE FROM exam_runs WHERE run_id = $1", [runId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting exam run:', err);
    res.status(500).json({ error: 'Failed to delete exam run' });
  }
});

// Legacy backward-compatible results endpoint for single exam query
app.get('/api/exams/:id/results', async (req, res) => {
  try {
    const exam_id = req.params.id;
    // Get latest active run for this exam or all latest sessions
    const result = await pool.query(`
      SELECT 
        s.student_id, 
        s.name, 
        s.class, 
        s.batch,
        COALESCE(es.score, 0) as score, 
        es.status, 
        COALESCE(es.tab_violation_count, 0) as tab_violation_count, 
        es.session_id,
        ex.full_marks
      FROM exams ex
      JOIN exam_batches eb ON eb.exam_id = ex.exam_id
      JOIN students s ON s.batch = eb.batch_name
      LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = ex.exam_id
      WHERE ex.exam_id = $1
      ORDER BY 
        CASE WHEN es.status = 'COMPLETED' THEN 1 ELSE 2 END ASC,
        es.score DESC NULLS LAST, 
        s.name ASC
    `, [exam_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.get('/api/exams/:id/results/:student_id/answers', async (req, res) => {
  try {
    const { id: exam_id, student_id } = req.params;
    
    const sessionRes = await pool.query(`
      SELECT s.name, s.student_id, s.class, es.session_id, es.score, es.status, ex.title as exam_title, ex.full_marks
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      WHERE es.exam_id = $1 AND es.student_id = $2
      ORDER BY es.last_active_timestamp DESC NULLS LAST
      LIMIT 1
    `, [exam_id, student_id]);
    
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const sessionData = sessionRes.rows[0];

    const qaRes = await pool.query(`
      SELECT 
        q.question_id, q.section_id, q.question_type, q.question_text_en, q.question_text_bn,
        q.options_json, q.correct_answer, q.marks,
        sec.title as section_title,
        sr.selected_option as student_answer, sr.is_correct, sr.awarded_marks
      FROM questions q
      LEFT JOIN exam_sections sec ON q.section_id = sec.section_id
      LEFT JOIN exam_sessions es ON es.session_id = $2
      LEFT JOIN exam_session_question_order qo ON qo.session_id = es.session_id AND qo.question_id = q.question_id
      LEFT JOIN student_responses sr ON sr.session_id = es.session_id AND sr.question_id = q.question_id
      WHERE q.exam_id = $1
      ORDER BY COALESCE(qo.display_order, 999999) ASC, sec.section_id
    `, [exam_id, sessionData.session_id]);

    res.json({
      student: sessionData,
      answers: qaRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch answer sheet' });
  }
});

app.get('/api/exams/active', async (req, res) => {
  try {
    const result = await pool.query("SELECT exam_id, title, duration_minutes, status FROM exams WHERE status = 'STARTED' AND COALESCE(is_deleted, false) = false ORDER BY scheduled_start DESC LIMIT 1");
    if (result.rows.length > 0) {
      res.json({ active_exam: result.rows[0] });
    } else {
      res.json({ active_exam: null });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to check active exams' });
  }
});

// ==========================================
// 7. DETERMINISTIC SERVER-SIDE QUESTION SHUFFLER
// ==========================================

async function ensureStudentQuestionOrder(session_id: string, exam_id: string, batch_name?: string): Promise<string[]> {
  try {
    // 1. Check if order already exists for this session
    const existingRes = await pool.query(
      "SELECT question_id FROM exam_session_question_order WHERE session_id = $1 ORDER BY display_order ASC",
      [session_id]
    );
    if (existingRes.rows.length > 0) {
      return existingRes.rows.map(r => r.question_id);
    }

    // 2. Determine if shuffle is enabled for this batch
    let shuffleEnabled = false;
    if (batch_name) {
      const batchCheck = await pool.query(
        "SELECT shuffle_enabled FROM exam_batches WHERE exam_id = $1 AND batch_name = $2",
        [exam_id, batch_name]
      );
      if (batchCheck.rows.length > 0) {
        shuffleEnabled = !!batchCheck.rows[0].shuffle_enabled;
      }
    }

    // 3. Fetch all questions grouped by section order
    const sectionsRes = await pool.query("SELECT section_id FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
    const questionsRes = await pool.query("SELECT question_id, section_id FROM questions WHERE exam_id = $1", [exam_id]);

    let finalOrderedQuestionIds: string[] = [];

    // Arrange questions by section
    for (const sec of sectionsRes.rows) {
      let secQIds = questionsRes.rows.filter(q => q.section_id === sec.section_id).map(q => q.question_id);
      if (shuffleEnabled && secQIds.length > 1) {
        // Fisher-Yates shuffle
        for (let i = secQIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [secQIds[i], secQIds[j]] = [secQIds[j], secQIds[i]];
        }
      }
      finalOrderedQuestionIds.push(...secQIds);
    }

    // Include unmapped questions if any
    const mappedSet = new Set(finalOrderedQuestionIds);
    const unmapped = questionsRes.rows.filter(q => !mappedSet.has(q.question_id)).map(q => q.question_id);
    if (shuffleEnabled && unmapped.length > 1) {
      for (let i = unmapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unmapped[i], unmapped[j]] = [unmapped[j], unmapped[i]];
      }
    }
    finalOrderedQuestionIds.push(...unmapped);

    // 4. Persist deterministically into exam_session_question_order
    for (let idx = 0; idx < finalOrderedQuestionIds.length; idx++) {
      await pool.query(`
        INSERT INTO exam_session_question_order (session_id, question_id, display_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (session_id, question_id) DO UPDATE SET display_order = EXCLUDED.display_order
      `, [session_id, finalOrderedQuestionIds[idx], idx + 1]);
    }

    return finalOrderedQuestionIds;
  } catch (err) {
    console.error('Error ensuring student question order:', err);
    return [];
  }
}

// Helper to force submit an exam session
async function forceSubmitExam(session_id: string) {
  try {
    const sessionRes = await pool.query(`
      SELECT es.session_id, es.status, es.exam_id, es.run_id, s.student_id, s.batch as student_batch 
      FROM exam_sessions es 
      JOIN students s ON es.student_id = s.student_id 
      WHERE es.session_id = $1
    `, [session_id]);

    if (sessionRes.rows.length === 0) return;
    const session = sessionRes.rows[0];

    const scoreRes = await pool.query(`
      SELECT COALESCE(SUM(COALESCE(awarded_marks, 0)), 0) as total_score
      FROM student_responses
      WHERE session_id = $1
    `, [session_id]);
    const final_score = scoreRes.rows[0]?.total_score ?? 0;

    await pool.query(`
      UPDATE exam_sessions 
      SET status = 'COMPLETED', score = $2, seconds_left = 0, last_active_timestamp = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `, [session_id, final_score]);

    const fullMarksRes = await pool.query(`
      SELECT e.full_marks 
      FROM exams e 
      WHERE e.exam_id = $1
    `, [session.exam_id]);
    const full_marks = fullMarksRes.rows[0]?.full_marks || 0;

    io.to(session_id).emit('exam_completed', { score: final_score, full_marks });
    
    io.to('teacher_dashboard').emit('student_status_update', {
      student_id: String(session.student_id),
      status: 'COMPLETED'
    });

    if (session.student_batch) {
      await broadcastDashboardUpdate(session.exam_id, session.student_batch);
    }
  } catch(e) { console.error('Auto-submit error:', e); }
}

// Timer Key helper for batch-specific timer isolation
const getTimerKey = (exam_id: string, batch_name?: string | null) => {
  const b = (batch_name || '').trim();
  return b ? `${exam_id}::${b}` : exam_id;
};

// Helper to sync teacher dashboard across assigned batches with target batch context
const broadcastDashboardUpdate = async (exam_id: string, target_batch?: string | null) => {
  try {
    const examRes = await pool.query("SELECT title, target_batch, status, duration_minutes, global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
    if (examRes.rows.length === 0) return;
    const exam = examRes.rows[0];

    // Get all assigned batches for this exam
    const batchesRes = await pool.query("SELECT batch_name FROM exam_batches WHERE exam_id = $1 ORDER BY batch_name ASC", [exam_id]);
    let assignedBatches = batchesRes.rows.map(r => r.batch_name);
    if (assignedBatches.length === 0 && exam.target_batch) {
      assignedBatches = [exam.target_batch];
    }

    // Determine active target batch
    let effectiveBatch = target_batch && target_batch.trim() ? target_batch.trim() : null;
    if (!effectiveBatch && assignedBatches.length === 1) {
      effectiveBatch = assignedBatches[0];
    }

    let activeRun: any = null;
    let runStatus = exam.status;
    let runSecondsLeft = (exam.duration_minutes || 60) * 60;

    if (effectiveBatch) {
      const runRes = await pool.query(`
        SELECT run_id, exam_name, status, seconds_left, fullscreen_enforced, started_at, ended_at 
        FROM exam_runs 
        WHERE exam_id = $1 AND (batch_name = $2 OR (batch_name IS NULL AND status = 'ACTIVE'))
        ORDER BY 
          CASE WHEN status = 'STARTED' THEN 1
               WHEN status = 'PAUSED' THEN 2
               WHEN status = 'CREATED' THEN 3
               ELSE 4 END,
          created_at DESC 
        LIMIT 1
      `, [exam_id, effectiveBatch]);

      if (runRes.rows.length > 0) {
        activeRun = runRes.rows[0];
        runStatus = activeRun.status;
        const timerKey = getTimerKey(exam_id, effectiveBatch);
        if (activeExamTimers.has(timerKey)) {
          runSecondsLeft = activeExamTimers.get(timerKey)!.secondsLeft;
        } else if (typeof activeRun.seconds_left === 'number') {
          runSecondsLeft = activeRun.seconds_left;
        }
      } else {
        runStatus = 'CREATED';
      }

      // Query students belonging specifically to effectiveBatch for the ACTIVE run only
      const studentsRes = await pool.query(`
        SELECT DISTINCT ON (s.student_id)
          s.student_id, s.name, s.batch, s.class,
          es.session_id, COALESCE(es.status, 'READY') as status, es.password_provided, 
          COALESCE(es.tab_violation_count, 0) as tab_violation_count, es.seconds_left
        FROM students s
        LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = $1 AND es.run_id = $3
        WHERE s.batch = $2
        ORDER BY s.student_id ASC, es.last_active_timestamp DESC NULLS LAST, es.session_id DESC NULLS LAST
      `, [exam_id, effectiveBatch, activeRun?.run_id || null]);

      io.to('teacher_dashboard').emit('dashboard_update', { 
        exam_id,
        target_batch: effectiveBatch,
        assigned_batches: assignedBatches,
        students: studentsRes.rows, 
        status: runStatus, 
        global_seconds_left: runSecondsLeft,
        fullscreen_enforced: activeRun?.fullscreen_enforced !== undefined ? !!activeRun.fullscreen_enforced : true,
        run_id: activeRun?.run_id || null
      });
    } else {
      // Multi-batch exam with no target batch selected yet
      io.to('teacher_dashboard').emit('dashboard_update', { 
        exam_id,
        target_batch: null,
        assigned_batches: assignedBatches,
        students: [], 
        status: 'CREATED', 
        global_seconds_left: (exam.duration_minutes || 60) * 60,
        fullscreen_enforced: true,
        run_id: null
      });
    }
  } catch(e) { console.error('Error broadcasting update', e); }
};

// Real-time Authoritative Exam Timer Engine (1-second tick synchronization per batch run)
async function startExamTimerEngine(exam_id: string, batch_name?: string | null, initialSeconds?: number) {
  const timerKey = getTimerKey(exam_id, batch_name);
  if (activeExamTimers.has(timerKey)) {
    const existing = activeExamTimers.get(timerKey)!;
    if (existing.timer) clearInterval(existing.timer);
    activeExamTimers.delete(timerKey);
  }

  let secondsLeft = initialSeconds;
  if (secondsLeft === undefined || secondsLeft === null) {
    try {
      if (batch_name) {
        const runCheck = await pool.query(
          "SELECT seconds_left FROM exam_runs WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1",
          [exam_id, batch_name]
        );
        if (runCheck.rows.length > 0 && typeof runCheck.rows[0].seconds_left === 'number') {
          secondsLeft = runCheck.rows[0].seconds_left;
        }
      }
      if (secondsLeft === undefined || secondsLeft === null) {
        const examCheck = await pool.query("SELECT global_seconds_left, duration_minutes FROM exams WHERE exam_id = $1", [exam_id]);
        if (examCheck.rows.length > 0) {
          secondsLeft = typeof examCheck.rows[0].global_seconds_left === 'number' 
            ? examCheck.rows[0].global_seconds_left 
            : (examCheck.rows[0].duration_minutes || 30) * 60;
        } else {
          secondsLeft = 1800;
        }
      }
    } catch(err) {
      secondsLeft = 1800;
    }
  }

  let dbPersistCounter = 0;
  const safeInitialSeconds = typeof secondsLeft === 'number' ? secondsLeft : 1800;
  const state: ActiveTimerState = {
    timer: null as any,
    secondsLeft: Math.max(0, safeInitialSeconds),
    lastTick: Date.now()
  };

  state.timer = setInterval(async () => {
    try {
      if (state.secondsLeft <= 0) {
        state.secondsLeft = 0;
        clearInterval(state.timer);
        activeExamTimers.delete(timerKey);

        if (batch_name) {
          // Force submit only examinees belonging to this specific batch run
          const activeSessions = await pool.query(`
            SELECT es.session_id 
            FROM exam_sessions es
            JOIN students s ON es.student_id = s.student_id
            WHERE es.exam_id = $1 AND s.batch = $2 AND es.status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')
          `, [exam_id, batch_name]);
          for (const row of activeSessions.rows) {
            await forceSubmitExam(row.session_id);
          }

          await pool.query(
            "UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED', seconds_left = 0 WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED'",
            [exam_id, batch_name]
          );

          io.to(`exam_${exam_id}_${batch_name}`).emit('exam_ended', { message: 'Time is up!' });
          io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'ENDED' });
          io.to('teacher_dashboard').emit('time_tick', { exam_id, batch_name, seconds_left: 0 });
          io.to(`exam_${exam_id}_${batch_name}`).emit('time_tick', { exam_id, batch_name, seconds_left: 0 });
          
          await broadcastDashboardUpdate(exam_id, batch_name);
        } else {
          const activeSessions = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')", [exam_id]);
          for (const row of activeSessions.rows) {
            await forceSubmitExam(row.session_id);
          }
          
          await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP, global_seconds_left = 0 WHERE exam_id = $1", [exam_id]);
          await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED', seconds_left = 0 WHERE exam_id = $1 AND status = 'ACTIVE'", [exam_id]);
          
          io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'Time is up!' });
          io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'ENDED' });
          io.to('teacher_dashboard').emit('time_tick', { exam_id, seconds_left: 0 });
          io.to(`exam_${exam_id}`).emit('time_tick', { exam_id, seconds_left: 0 });
          await broadcastDashboardUpdate(exam_id);
        }
        return;
      }

      // Decrement by exactly 1 second in-memory
      state.secondsLeft = Math.max(0, state.secondsLeft - 1);
      state.lastTick = Date.now();

      // Authoritative 1-second broadcast to both Teacher Dashboard and Student Workspace rooms
      io.to('teacher_dashboard').emit('time_tick', { exam_id, batch_name: batch_name || undefined, seconds_left: state.secondsLeft });
      if (batch_name) {
        io.to(`exam_${exam_id}_${batch_name}`).emit('time_tick', { exam_id, batch_name, seconds_left: state.secondsLeft });
      }
      io.to(`exam_${exam_id}`).emit('time_tick', { exam_id, batch_name: batch_name || undefined, seconds_left: state.secondsLeft });

      dbPersistCounter++;
      if (dbPersistCounter >= 5 || state.secondsLeft === 0) {
        dbPersistCounter = 0;
        if (batch_name) {
          await pool.query(
            "UPDATE exam_runs SET seconds_left = $1 WHERE exam_id = $2 AND batch_name = $3 AND status = 'STARTED'",
            [state.secondsLeft, exam_id, batch_name]
          );
        }
        await pool.query("UPDATE exams SET global_seconds_left = $2 WHERE exam_id = $1 AND status = 'STARTED'", [exam_id, state.secondsLeft]);
      }
    } catch (e) {
      console.error('Timer error:', e);
    }
  }, 1000);

  activeExamTimers.set(timerKey, state);
}

// ==========================================
// 8. REAL-TIME SOCKET.IO ENGINE
// ==========================================

io.on('connection', (socket: Socket) => {
  console.log(`New connection: ${socket.id}`);

  // Student Login Event (Resolves active run for student's specific batch)
  socket.on('student_login', async (data: { student_id: string; password_provided: string }) => {
    try {
      const { student_id, password_provided } = data;

      // 1. Verify student exists and get details
      const studentRes = await pool.query("SELECT student_id, name, batch, class FROM students WHERE student_id = $1", [student_id]);
      if (studentRes.rows.length === 0) {
        socket.emit('login_error', { message: 'Student ID not found in database.' });
        return;
      }
      const student = studentRes.rows[0];

      // 2. Identify the CURRENT active or scheduled examination for the student's batch
      const examRes = await pool.query(`
        SELECT e.exam_id, e.title, e.duration_minutes, e.status as exam_status, e.scheduled_start, e.target_batch
        FROM exams e
        LEFT JOIN exam_batches eb ON eb.exam_id = e.exam_id
        WHERE (eb.batch_name = $1 OR e.target_batch = $1)
          AND COALESCE(e.is_deleted, false) = false
        ORDER BY 
          CASE WHEN e.status = 'STARTED' THEN 1
               WHEN e.status = 'PAUSED' THEN 2
               WHEN e.status = 'CREATED' THEN 3
               ELSE 4 END,
          e.scheduled_start DESC NULLS LAST,
          e.exam_id DESC
        LIMIT 1
      `, [student.batch]);

      if (examRes.rows.length === 0) {
        socket.emit('login_error', { message: `No active or scheduled exam found for your batch (${student.batch || 'Unassigned'}). Please wait for your teacher.` });
        return;
      }

      const activeExam = examRes.rows[0];
      const exam_id = activeExam.exam_id;

      // 3. Find the current eligible exam_run for this student's specific batch
      const runRes = await pool.query(`
        SELECT run_id, status FROM exam_runs 
        WHERE exam_id = $1 AND (batch_name = $2 OR (batch_name IS NULL AND status = 'ACTIVE'))
        ORDER BY 
          CASE WHEN status = 'STARTED' THEN 1
               WHEN status = 'PAUSED' THEN 2
               WHEN status = 'CREATED' THEN 3
               ELSE 4 END,
          created_at DESC 
        LIMIT 1
      `, [exam_id, student.batch]);

      const activeRun = runRes.rows[0] || null;
      if (!activeRun || activeRun.status === 'ENDED') {
        socket.emit('login_error', { message: 'No active or scheduled examination session is currently open for your batch. Please wait for your teacher to initialize or start the exam.' });
        return;
      }
      const activeRunId = activeRun.run_id;
      const runStatus = activeRun.status;

      const defaultPassword = `${student.name.split(' ')[0].toUpperCase()}@${student_id}`;
      let session: any = null;

      // Look for session belonging specifically to this active batch run
      const runSessionRes = await pool.query(
        "SELECT * FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 AND run_id = $3",
        [exam_id, student_id, activeRunId]
      );
      if (runSessionRes.rows.length > 0) {
        session = runSessionRes.rows[0];
      } else {
        // Auto-create session strictly for this active batch run
        const newSessionId = require('crypto').randomUUID();
        const createdSession = await pool.query(`
          INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided)
          VALUES ($1, $2, $3, $4, 'LOGGED_IN', $5)
          RETURNING *
        `, [newSessionId, exam_id, student_id, activeRunId, defaultPassword]);
        session = createdSession.rows[0];
      }

      // 4. Validate password
      const expectedPassword = session.password_provided || defaultPassword;
      if (password_provided !== expectedPassword && password_provided !== defaultPassword) {
        socket.emit('login_error', { message: 'Incorrect password.' });
        return;
      }

      let newStatus = session.status;
      if (session.status === 'READY') {
        await pool.query("UPDATE exam_sessions SET status = 'LOGGED_IN' WHERE session_id = $1", [session.session_id]);
        newStatus = 'LOGGED_IN';
      }

      // Ensure deterministic question order is created
      await ensureStudentQuestionOrder(session.session_id, exam_id, student.batch);

      // Join socket rooms (global exam room & batch-isolated room)
      socket.join(session.session_id);
      socket.join(`exam_${exam_id}`);
      socket.join(`exam_${exam_id}_${student.batch}`);
      if (activeRunId) socket.join(`exam_run_${activeRunId}`);

      socket.emit('login_success', {
        session_id: session.session_id,
        student_id,
        exam_id,
        exam_title: activeExam.title,
        exam_status: runStatus,
        session_status: newStatus
      });

      // Notify teacher dashboard
      io.to('teacher_dashboard').emit('student_status_update', {
        student_id,
        status: newStatus
      });

    } catch (err) {
      console.error('Error during student login:', err);
      socket.emit('login_error', { message: 'Server error during login.' });
    }
  });
  
  // Teacher joining dashboard
  socket.on('join_teacher_dashboard', async () => {
    socket.join('teacher_dashboard');
    console.log(`Teacher joined dashboard: ${socket.id}`);
  });

  // Teacher selecting an exam & batch to monitor
  socket.on('monitor_exam', async (data: { exam_id: string, batch_name?: string }) => {
    try {
      await broadcastDashboardUpdate(data.exam_id, data.batch_name);
    } catch (e) { console.error(e); }
  });

  // Student workspace ready
  socket.on('workspace_ready', async (data: { session_id: string }) => {
    try {
      if (!data.session_id) {
        socket.emit('session_error', { message: 'Session ID is required.' });
        return;
      }
      socket.join(data.session_id);

      const sessionRes = await pool.query(`
        SELECT es.session_id, es.exam_id, es.student_id, es.run_id, es.status as session_status, es.seconds_left, 
               s.batch as student_batch, e.status as exam_status, e.global_seconds_left,
               er.status as run_status, er.seconds_left as run_seconds_left, er.fullscreen_enforced
        FROM exam_sessions es
        JOIN students s ON es.student_id = s.student_id
        JOIN exams e ON es.exam_id = e.exam_id
        LEFT JOIN exam_runs er ON es.run_id = er.run_id
        WHERE es.session_id = $1
      `, [data.session_id]);

      if (sessionRes.rows.length === 0) {
        socket.emit('session_error', { message: 'Session not found. Please log in again.' });
        return;
      }

      const session = sessionRes.rows[0];
      socket.join(`exam_${session.exam_id}`);
      socket.join(`exam_${session.exam_id}_${session.student_batch}`);
      if (session.run_id) socket.join(`exam_run_${session.run_id}`);

      // Ensure deterministic question order is ready
      await ensureStudentQuestionOrder(data.session_id, session.exam_id, session.student_batch);

      const effectiveStatus = session.run_status || session.exam_status;

      // Handle completed state
      if (session.session_status === 'COMPLETED' || effectiveStatus === 'ENDED') {
        socket.emit('exam_completed');
        return;
      }

      // Handle waiting state ONLY if the examination run has not been started yet
      if (effectiveStatus === 'CREATED') {
        socket.emit('exam_waiting');
        return;
      }

      // Handle active/started exam
      if (effectiveStatus === 'STARTED' || effectiveStatus === 'PAUSED') {
        const timerKey = getTimerKey(session.exam_id, session.student_batch);
        let currentSecondsLeft = activeExamTimers.has(timerKey)
          ? activeExamTimers.get(timerKey)!.secondsLeft
          : (session.run_seconds_left ?? session.global_seconds_left ?? 1800);
        
        if (session.session_status !== 'EXAMINEE' && session.session_status !== 'PAUSED') {
          await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE session_id = $1", [data.session_id]);
          io.to('teacher_dashboard').emit('student_status_update', {
            student_id: session.student_id,
            status: 'EXAMINEE'
          });
        }

        // Fetch sections
        const sectionsRes = await pool.query("SELECT section_id, title, section_type, section_marks FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [session.exam_id]);
        
        // Fetch questions ordered strictly by persisted display_order
        const questionsRes = await pool.query(`
          SELECT q.question_id, q.section_id, q.question_type, q.question_text_en, q.question_text_bn, q.options_json, q.marks
          FROM questions q
          JOIN exam_session_question_order qo ON qo.question_id = q.question_id
          WHERE qo.session_id = $1
          ORDER BY qo.display_order ASC
        `, [data.session_id]);
        
        // Fetch previously saved answers for this session
        const answersRes = await pool.query("SELECT question_id, selected_option FROM student_responses WHERE session_id = $1", [data.session_id]);
        const previousAnswers = answersRes.rows.reduce((acc: any, row: any) => {
          acc[row.question_id] = row.selected_option;
          return acc;
        }, {});

        socket.emit('exam_started', { 
          questions: questionsRes.rows, 
          sections: sectionsRes.rows, 
          seconds_left: currentSecondsLeft, 
          previous_answers: previousAnswers,
          fullscreen_enforced: session.fullscreen_enforced !== undefined && session.fullscreen_enforced !== null ? !!session.fullscreen_enforced : true
        });

        if (session.session_status === 'PAUSED' || effectiveStatus === 'PAUSED') {
          socket.emit('exam_paused');
        }
      }
    } catch(e) { 
      console.error('workspace_ready error:', e); 
      socket.emit('session_error', { message: 'Failed to initialize examination workspace.' });
    }
  });

  // Submit Answer
  socket.on('submit_answer', async (data: { session_id: string, question_id: string, selected_option: string }) => {
    try {
      const { session_id, question_id, selected_option } = data;
      const qRes = await pool.query("SELECT correct_answer, question_type, marks FROM questions WHERE question_id = $1", [question_id]);
      
      let is_correct = false;
      let awarded_marks: number | null = null;
      const correctStr = qRes.rows[0]?.correct_answer;
      const qMarks = qRes.rows[0]?.marks || 0;

      if (qRes.rows[0]?.question_type === 'FITB') {
        try {
          const correctArr = JSON.parse(correctStr);
          const selectedArr = JSON.parse(selected_option);
          if (Array.isArray(correctArr) && Array.isArray(selectedArr) && correctArr.length === selectedArr.length) {
            is_correct = correctArr.every((val, index) => val === selectedArr[index]);
          }
        } catch(e) {}
      } else if (qRes.rows[0]?.question_type === 'MATCH') {
        try {
          const correctMap = JSON.parse(correctStr);
          const selectedMap = JSON.parse(selected_option);
          is_correct = Object.keys(correctMap).every(k => correctMap[k] === selectedMap[k]);
        } catch(e) {}
      } else {
        is_correct = (selected_option || '').trim() === (correctStr || '').trim();
      }

      awarded_marks = is_correct ? qMarks : 0;

      await pool.query(`
        INSERT INTO student_responses (session_id, question_id, selected_option, is_correct, awarded_marks)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (session_id, question_id) 
        DO UPDATE SET selected_option = EXCLUDED.selected_option, is_correct = EXCLUDED.is_correct, awarded_marks = EXCLUDED.awarded_marks
      `, [session_id, question_id, selected_option, is_correct, awarded_marks]);

      // Calculate total score for session
      const scoreRes = await pool.query("SELECT COALESCE(SUM(awarded_marks), 0) as total_score FROM student_responses WHERE session_id = $1", [session_id]);
      const currentScore = scoreRes.rows[0]?.total_score || 0;
      await pool.query("UPDATE exam_sessions SET score = $1, last_active_timestamp = CURRENT_TIMESTAMP WHERE session_id = $2", [currentScore, session_id]);

      socket.emit('answer_saved', { question_id });
    } catch (e) { console.error('submit_answer error:', e); }
  });

  // Finish / Submit Exam from Student
  socket.on('finish_exam', async (data: { session_id: string }) => {
    try {
      await forceSubmitExam(data.session_id);
    } catch(e) { console.error('finish_exam error:', e); }
  });

  socket.on('student_submit_exam', async (data: { session_id: string }) => {
    try {
      await forceSubmitExam(data.session_id);
    } catch(e) { console.error('student_submit_exam error:', e); }
  });

  // Tab Violation Tracking
  socket.on('tab_violation', async (data: { session_id: string }) => {
    try {
      const { session_id } = data;
      const res = await pool.query(`
        UPDATE exam_sessions 
        SET tab_violation_count = tab_violation_count + 1,
            status = 'PAUSED'
        WHERE session_id = $1 
        RETURNING student_id, tab_violation_count, status
      `, [session_id]);

      if (res.rows.length > 0) {
        const { student_id, tab_violation_count, status } = res.rows[0];
        io.to(session_id).emit('exam_paused');
        io.to('teacher_dashboard').emit('student_status_update', {
          student_id,
          status: 'PAUSED',
          tab_violation_count
        });
      }
    } catch(e) { console.error('tab_violation error:', e); }
  });

  // Teacher Initialize Student (with batch-specific run support)
  socket.on('teacher_initialize_student', async (data: { exam_id: string, student_id: string, batch_name?: string, exam_name?: string }) => {
    try {
      const { exam_id, student_id, batch_name, exam_name } = data;
      
      const examRes = await pool.query("SELECT title, duration_minutes, target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;

      const studentRes = await pool.query("SELECT name, batch FROM students WHERE student_id = $1", [student_id]);
      if (studentRes.rows.length === 0) return;
      const studentBatch = batch_name || studentRes.rows[0].batch;

      const initialSeconds = (examRes.rows[0].duration_minutes || 60) * 60;

      // Get or create active/created exam_run for this student's batch
      let run_id: string;
      const activeRunRes = await pool.query(
        "SELECT run_id FROM exam_runs WHERE exam_id = $1 AND (batch_name = $2 OR (batch_name IS NULL AND status = 'ACTIVE')) AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1",
        [exam_id, studentBatch]
      );

      if (activeRunRes.rows.length > 0) {
        run_id = activeRunRes.rows[0].run_id;
      } else {
        const runName = exam_name || `${examRes.rows[0].title} - ${studentBatch}`;
        const newRun = await pool.query(
          "INSERT INTO exam_runs (exam_id, batch_name, exam_name, status, seconds_left, fullscreen_enforced) VALUES ($1, $2, $3, 'CREATED', $4, TRUE) RETURNING run_id",
          [exam_id, studentBatch, runName, initialSeconds]
        );
        run_id = newRun.rows[0].run_id;
      }

      const password = `${studentRes.rows[0].name.split(' ')[0].toUpperCase()}@${student_id}`;
      const newSessionId = require('crypto').randomUUID();

      const sessionRes = await pool.query(`
        INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided, score, tab_violation_count, seconds_left)
        VALUES ($1, $2, $3, $4, 'READY', $5, 0, 0, $6)
        ON CONFLICT (exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
        DO UPDATE SET status = 'READY', password_provided = EXCLUDED.password_provided, score = 0, tab_violation_count = 0, seconds_left = EXCLUDED.seconds_left
        RETURNING session_id
      `, [newSessionId, exam_id, student_id, run_id, password, initialSeconds]);

      const effectiveSessionId = sessionRes.rows[0].session_id;
      await ensureStudentQuestionOrder(effectiveSessionId, exam_id, studentRes.rows[0].batch);

      await broadcastDashboardUpdate(exam_id, studentBatch);
    } catch (e) { console.error('Error initializing student:', e); }
  });

  // Teacher Initialize Exam (creates new Exam Run attempt for the SELECTED TARGET BATCH only)
  socket.on('teacher_initialize_exam', async (data: { exam_id: string, batch_name: string, exam_name?: string }) => {
    try {
      const { exam_id, batch_name, exam_name } = data;
      const examRes = await pool.query("SELECT title, duration_minutes, target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;

      if (!batch_name) {
        console.error('Target batch is required to initialize examination');
        return;
      }

      // 1. Clear any active in-memory timer for this batch
      const timerKey = getTimerKey(exam_id, batch_name);
      if (activeExamTimers.has(timerKey)) {
        const t = activeExamTimers.get(timerKey)!;
        if (t.timer) clearInterval(t.timer);
        activeExamTimers.delete(timerKey);
      }

      // 2. Clean up any empty runs with 0 sessions and close previous unended runs
      await pool.query(
        "DELETE FROM exam_runs WHERE exam_id = $1 AND batch_name = $2 AND run_id NOT IN (SELECT DISTINCT run_id FROM exam_sessions WHERE run_id IS NOT NULL)",
        [exam_id, batch_name]
      );
      await pool.query(
        "UPDATE exam_runs SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED'",
        [exam_id, batch_name]
      );

      // 3. Create a brand new exam_run for this batch attempt
      const runTitle = exam_name && exam_name.trim() 
        ? exam_name.trim() 
        : `${examRes.rows[0].title} - ${batch_name} (${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})`;
      
      const initialSeconds = (examRes.rows[0].duration_minutes || 60) * 60;
      const runRes = await pool.query(
        "INSERT INTO exam_runs (exam_id, batch_name, exam_name, status, seconds_left, fullscreen_enforced) VALUES ($1, $2, $3, 'CREATED', $4, TRUE) RETURNING run_id",
        [exam_id, batch_name, runTitle, initialSeconds]
      );
      const run_id = runRes.rows[0].run_id;

      // 4. Fetch students belonging ONLY to the selected target batch
      const studentsRes = await pool.query(
        "SELECT student_id, name, batch FROM students WHERE batch = $1 ORDER BY student_id ASC",
        [batch_name]
      );

      // 5. Create fresh sessions & generate fresh question order for each student
      for (const student of studentsRes.rows) {
        const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
        const newSessionId = require('crypto').randomUUID();

        const sessionRes = await pool.query(`
          INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided, score, tab_violation_count, seconds_left)
          VALUES ($1, $2, $3, $4, 'READY', $5, 0, 0, $6)
          ON CONFLICT (exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid))
          DO UPDATE SET status = 'READY', password_provided = EXCLUDED.password_provided, score = 0, tab_violation_count = 0, seconds_left = EXCLUDED.seconds_left
          RETURNING session_id
        `, [newSessionId, exam_id, student.student_id, run_id, password, initialSeconds]);

        const effectiveSessionId = sessionRes.rows[0].session_id;
        await ensureStudentQuestionOrder(effectiveSessionId, exam_id, student.batch);
      }

      // 6. Sync dashboard
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'CREATED' });
      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch(e) { console.error('Error initializing exam for batch:', e); }
  });

  // Teacher Start Exam (Starts the selected Examination + Target Batch run only)
  socket.on('teacher_start_exam', async (data: { exam_id: string, batch_name: string }) => {
    try {
      const { exam_id, batch_name } = data;
      if (!batch_name) return;

      const examRes = await pool.query("SELECT duration_minutes FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;
      const durationSeconds = examRes.rows[0].duration_minutes * 60;

      // Find or create run for this batch
      let run_id: string;
      const runCheck = await pool.query(
        "SELECT run_id, seconds_left FROM exam_runs WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1",
        [exam_id, batch_name]
      );

      if (runCheck.rows.length > 0) {
        run_id = runCheck.rows[0].run_id;
        await pool.query(
          "UPDATE exam_runs SET status = 'STARTED', started_at = CURRENT_TIMESTAMP, seconds_left = COALESCE(seconds_left, $2) WHERE run_id = $1",
          [run_id, durationSeconds]
        );
      } else {
        const examTitleRes = await pool.query("SELECT title FROM exams WHERE exam_id = $1", [exam_id]);
        const defaultRunName = `${examTitleRes.rows[0]?.title || 'Exam'} - ${batch_name}`;
        const newRun = await pool.query(
          "INSERT INTO exam_runs (exam_id, batch_name, exam_name, status, started_at, seconds_left) VALUES ($1, $2, $3, 'STARTED', CURRENT_TIMESTAMP, $4) RETURNING run_id",
          [exam_id, batch_name, defaultRunName, durationSeconds]
        );
        run_id = newRun.rows[0].run_id;
      }

      // Only transition students who are currently LOGGED_IN (waiting for exam) to EXAMINEE.
      // Students who have not logged in yet remain READY!
      await pool.query(
        "UPDATE exam_sessions SET status = 'EXAMINEE' WHERE run_id = $1 AND status = 'LOGGED_IN'",
        [run_id]
      );

      const sectionsRes = await pool.query("SELECT section_id, title, section_type, section_marks FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
      const questionsRes = await pool.query("SELECT question_id, section_id, question_type, question_text_en, question_text_bn, options_json, marks FROM questions WHERE exam_id = $1 ORDER BY section_id, question_id", [exam_id]);
      
      startExamTimerEngine(exam_id, batch_name, durationSeconds);

      // Broadcast start signal to trigger immediate workspace loading for all waiting examinees
      const startPayload = {
        exam_id,
        batch_name,
        run_id,
        questions: questionsRes.rows,
        sections: sectionsRes.rows,
        seconds_left: durationSeconds,
        previous_answers: {},
        fullscreen_enforced: true
      };

      io.to(`exam_${exam_id}_${batch_name}`).emit('exam_start_signal', startPayload);
      io.to(`exam_run_${run_id}`).emit('exam_start_signal', startPayload);
      io.to(`exam_${exam_id}_${batch_name}`).emit('exam_started', startPayload);
      io.to(`exam_run_${run_id}`).emit('exam_started', startPayload);
      io.to(`exam_${exam_id}`).emit('exam_start_signal', startPayload);
      io.to(`exam_${exam_id}`).emit('exam_started', startPayload);
      
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch (e) { console.error(e); }
  });

  // Teacher Stop Exam (Stops only the selected Examination + Target Batch run)
  socket.on('teacher_stop_exam', async (data: { exam_id: string, batch_name: string }) => {
    try {
      const { exam_id, batch_name } = data;
      const timerKey = getTimerKey(exam_id, batch_name);

      if (activeExamTimers.has(timerKey)) {
        const t = activeExamTimers.get(timerKey)!;
        if (t.timer) clearInterval(t.timer);
        activeExamTimers.delete(timerKey);
      }

      await pool.query(
        "UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED', seconds_left = 0 WHERE exam_id = $1 AND (batch_name = $2 OR (batch_name IS NULL AND status != 'ENDED'))",
        [exam_id, batch_name]
      );
      
      // Auto-submit active examinees of this batch
      const activeSessions = await pool.query(`
        SELECT es.session_id 
        FROM exam_sessions es
        JOIN students s ON es.student_id = s.student_id
        WHERE es.exam_id = $1 AND s.batch = $2 AND es.status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')
      `, [exam_id, batch_name]);

      for (const row of activeSessions.rows) {
        await forceSubmitExam(row.session_id);
      }

      io.to(`exam_${exam_id}_${batch_name}`).emit('exam_ended', { message: 'The exam has been stopped by the teacher.' });
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'ENDED' });
      io.to('teacher_dashboard').emit('time_tick', { exam_id, batch_name, seconds_left: 0 });
      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch (e) { console.error(e); }
  });

  // Teacher Pause Exam (Pauses only the selected Examination + Target Batch run)
  socket.on('teacher_pause_exam', async (data: { exam_id: string, batch_name: string }) => {
    try {
      const { exam_id, batch_name } = data;
      const timerKey = getTimerKey(exam_id, batch_name);
      let currentSeconds = 0;

      if (activeExamTimers.has(timerKey)) {
        const t = activeExamTimers.get(timerKey)!;
        currentSeconds = t.secondsLeft;
        if (t.timer) clearInterval(t.timer);
        activeExamTimers.delete(timerKey);
      } else {
        const runRes = await pool.query(
          "SELECT seconds_left FROM exam_runs WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1",
          [exam_id, batch_name]
        );
        currentSeconds = runRes.rows[0]?.seconds_left ?? 1800;
      }

      await pool.query(
        "UPDATE exam_runs SET status = 'PAUSED', seconds_left = $1 WHERE exam_id = $2 AND batch_name = $3 AND status = 'STARTED'",
        [currentSeconds, exam_id, batch_name]
      );

      await pool.query(`
        UPDATE exam_sessions SET status = 'PAUSED' 
        WHERE session_id IN (
          SELECT es.session_id FROM exam_sessions es 
          JOIN students s ON es.student_id = s.student_id 
          WHERE es.exam_id = $1 AND s.batch = $2 AND es.status = 'EXAMINEE'
        )
      `, [exam_id, batch_name]);
      
      io.to(`exam_${exam_id}_${batch_name}`).emit('exam_paused');
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'PAUSED' });
      io.to('teacher_dashboard').emit('time_tick', { exam_id, batch_name, seconds_left: currentSeconds });
      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch (e) { console.error(e); }
  });

  // Teacher Resume Exam (Resumes only the selected Examination + Target Batch run)
  socket.on('teacher_resume_exam', async (data: { exam_id: string, batch_name: string }) => {
    try {
      const { exam_id, batch_name } = data;
      const runRes = await pool.query(
        "SELECT seconds_left FROM exam_runs WHERE exam_id = $1 AND batch_name = $2 AND status = 'PAUSED' ORDER BY created_at DESC LIMIT 1",
        [exam_id, batch_name]
      );
      const currentSeconds = runRes.rows[0]?.seconds_left ?? 1800;

      await pool.query(
        "UPDATE exam_runs SET status = 'STARTED' WHERE exam_id = $1 AND batch_name = $2 AND status = 'PAUSED'",
        [exam_id, batch_name]
      );

      await pool.query(`
        UPDATE exam_sessions SET status = 'EXAMINEE' 
        WHERE session_id IN (
          SELECT es.session_id FROM exam_sessions es 
          JOIN students s ON es.student_id = s.student_id 
          WHERE es.exam_id = $1 AND s.batch = $2 AND es.status = 'PAUSED'
        )
      `, [exam_id, batch_name]);
      
      startExamTimerEngine(exam_id, batch_name, currentSeconds);

      io.to(`exam_${exam_id}_${batch_name}`).emit('exam_resumed', { seconds_left: currentSeconds });
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch (e) { console.error(e); }
  });

  // Teacher Safe Reset Exam (Resets batch run without deleting historical runs/results)
  socket.on('teacher_reset_exam', async (data: { exam_id: string, batch_name?: string }) => {
    try {
      const { exam_id, batch_name } = data;
      const timerKey = getTimerKey(exam_id, batch_name);
      
      if (activeExamTimers.has(timerKey)) {
        const t = activeExamTimers.get(timerKey)!;
        if (t.timer) clearInterval(t.timer);
        activeExamTimers.delete(timerKey);
      }

      if (batch_name) {
        await pool.query(
          "UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE exam_id = $1 AND batch_name = $2 AND status != 'ENDED'",
          [exam_id, batch_name]
        );
        io.to(`exam_${exam_id}_${batch_name}`).emit('exam_ended', { message: 'The current exam session has ended.' });
        io.to('teacher_dashboard').emit('exam_status_update', { exam_id, batch_name, status: 'CREATED' });
        await broadcastDashboardUpdate(exam_id, batch_name);
      } else {
        await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE exam_id = $1 AND status = 'ACTIVE'", [exam_id]);
        io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'The current exam session has ended.' });
        io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'CREATED' });
        await broadcastDashboardUpdate(exam_id);
      }
    } catch (e) { console.error('Error safely resetting exam:', e); }
  });

  // Teacher Unpause Student
  socket.on('teacher_unpause_student', async (data: { session_id: string }) => {
    try {
      const res = await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE session_id = $1 RETURNING student_id", [data.session_id]);
      io.to(data.session_id).emit('exam_resumed');
      if (res.rows.length > 0) {
        io.to('teacher_dashboard').emit('student_status_update', {
          student_id: res.rows[0].student_id,
          status: 'EXAMINEE'
        });
      }
    } catch(e) { console.error(e); }
  });

  // Teacher Set Fullscreen Policy (for target batch / exam run)
  socket.on('teacher_set_fullscreen_policy', async (data: { exam_id: string, batch_name: string, fullscreen_enforced: boolean }) => {
    try {
      const { exam_id, batch_name, fullscreen_enforced } = data;
      if (!batch_name) return;
      const enforced = !!fullscreen_enforced;

      await pool.query(
        "UPDATE exam_runs SET fullscreen_enforced = $1 WHERE exam_id = $2 AND (batch_name = $3 OR (batch_name IS NULL AND status != 'ENDED'))",
        [enforced, exam_id, batch_name]
      );

      io.to(`exam_${exam_id}_${batch_name}`).emit('fullscreen_policy_updated', {
        exam_id,
        batch_name,
        fullscreen_enforced: enforced
      });

      io.to('teacher_dashboard').emit('fullscreen_policy_updated', {
        exam_id,
        batch_name,
        fullscreen_enforced: enforced
      });

      await broadcastDashboardUpdate(exam_id, batch_name);
    } catch(e) { console.error('teacher_set_fullscreen_policy error:', e); }
  });

  // Teacher End One Student Exam (authoritative, preserves answers, scores via forceSubmitExam, does not affect batch or timer)
  socket.on('teacher_end_student_exam', async (data: { exam_id: string, batch_name?: string, session_id: string, student_id: string }) => {
    try {
      const { exam_id, batch_name, session_id, student_id } = data;
      if (!session_id) return;

      await forceSubmitExam(session_id);

      io.to('teacher_dashboard').emit('student_status_update', {
        student_id,
        status: 'COMPLETED'
      });

      if (exam_id) {
        await broadcastDashboardUpdate(exam_id, batch_name);
      }
    } catch(e) { console.error('teacher_end_student_exam error:', e); }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });

});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT} (LAN ready)`);
  
  // Auto-recover any active running exam timers upon server startup
  pool.query("SELECT exam_id, global_seconds_left, duration_minutes FROM exams WHERE status = 'STARTED'").then(res => {
    for (const ex of res.rows) {
      const remaining = typeof ex.global_seconds_left === 'number' ? ex.global_seconds_left : (ex.duration_minutes || 30) * 60;
      if (remaining > 0) {
        console.log(`Auto-recovering active timer for exam ${ex.exam_id} (${remaining}s remaining)`);
        startExamTimerEngine(ex.exam_id, remaining);
      }
    }
  }).catch(err => console.error('Error recovering active exam timers:', err));
});
