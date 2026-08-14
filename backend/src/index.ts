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
        exam_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
      );

      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES exam_runs(run_id) ON DELETE SET NULL;

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

const activeExamTimers = new Map<string, NodeJS.Timeout>();

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

app.delete('/api/exams/:id', async (req, res) => {
  try {
    const exam_id = req.params.id;
    await pool.query("DELETE FROM student_responses WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)", [exam_id]);
    await pool.query("DELETE FROM exam_session_question_order WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)", [exam_id]);
    await pool.query("DELETE FROM exam_sessions WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM exam_runs WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM exam_batches WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM questions WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM exam_sections WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM exams WHERE exam_id = $1", [exam_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete exam' });
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
    const { exam_id, title, section_marks, section_type } = req.body;
    const result = await pool.query(
      "INSERT INTO exam_sections (exam_id, title, section_marks, section_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [exam_id, title, section_marks, section_type]
    );
    res.json({ success: true, section: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

app.delete('/api/sections/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM exam_sections WHERE section_id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks } = req.body;
    await pool.query(
      "INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [exam_id, section_id, question_type, question_text_en, question_text_bn, JSON.stringify(options_json), correct_answer, marks]
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
        COALESCE(AVG(q.marks), 0)::float as avg_marks_per_question
      FROM exam_sections sec
      LEFT JOIN questions q ON sec.section_id = q.section_id
      WHERE sec.exam_id = $1
      GROUP BY sec.section_id, sec.title, sec.section_type, sec.section_marks
      ORDER BY sec.section_id
    `, [info.exam_id]);

    const totalQuestionsRes = await pool.query("SELECT COUNT(*)::int as count FROM questions WHERE exam_id = $1", [info.exam_id]);

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
      full_marks: info.full_marks,
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

    let countQuery = "SELECT COUNT(*) FROM exam_runs er JOIN exams ex ON er.exam_id = ex.exam_id";
    let countParams: any[] = [];
    if (search) {
      countQuery += " WHERE er.exam_name ILIKE $1 OR ex.title ILIKE $1";
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
      LEFT JOIN (
        SELECT 
          run_id, 
          COUNT(*) as total_students,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_students
        FROM exam_sessions
        GROUP BY run_id
      ) st_count ON er.run_id = st_count.run_id
    `;
    let params: any[] = [];
    if (search) {
      query += " WHERE er.exam_name ILIKE $1 OR ex.title ILIKE $1";
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
    const result = await pool.query("SELECT exam_id, title, duration_minutes, status FROM exams WHERE status = 'STARTED' ORDER BY scheduled_start DESC LIMIT 1");
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
    const sessionCheck = await pool.query("SELECT status FROM exam_sessions WHERE session_id = $1", [session_id]);
    if (sessionCheck.rows.length === 0 || sessionCheck.rows[0].status === 'COMPLETED') {
      return; // Already submitted or not found
    }

    const scoreRes = await pool.query(`
      SELECT COALESCE(SUM(COALESCE(sr.awarded_marks, CASE WHEN sr.is_correct THEN q.marks ELSE 0 END)), 0) as total_score
      FROM student_responses sr
      JOIN questions q ON sr.question_id = q.question_id
      WHERE sr.session_id = $1
    `, [session_id]);
    const final_score = scoreRes.rows[0].total_score;

    const res = await pool.query(`
      UPDATE exam_sessions 
      SET status = 'COMPLETED', score = $2, seconds_left = 0
      WHERE session_id = $1
      RETURNING student_id
    `, [session_id, final_score]);

    const fullMarksRes = await pool.query(`
      SELECT e.full_marks 
      FROM exams e 
      JOIN exam_sessions es ON e.exam_id = es.exam_id 
      WHERE es.session_id = $1
    `, [session_id]);
    const full_marks = fullMarksRes.rows[0]?.full_marks || 0;

    io.to(session_id).emit('exam_completed', { score: final_score, full_marks });
    
    if (res.rows.length > 0) {
      io.to('teacher_dashboard').emit('student_status_update', {
        student_id: res.rows[0].student_id,
        status: 'COMPLETED'
      });
    }
  } catch(e) { console.error('Auto-submit error:', e); }
}

// ==========================================
// 8. REAL-TIME SOCKET.IO ENGINE
// ==========================================

io.on('connection', (socket: Socket) => {
  console.log(`New connection: ${socket.id}`);

  // Helper to sync teacher dashboard across multiple assigned batches
  const broadcastDashboardUpdate = async (exam_id: string) => {
    try {
      const examRes = await pool.query("SELECT target_batch, status, global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length > 0) {
        const { target_batch, status, global_seconds_left } = examRes.rows[0];

        // Get all assigned batches for this exam
        const batchesRes = await pool.query("SELECT batch_name FROM exam_batches WHERE exam_id = $1", [exam_id]);
        let assignedBatches = batchesRes.rows.map(r => r.batch_name);
        if (assignedBatches.length === 0 && target_batch) {
          assignedBatches = [target_batch];
        }

        // Get latest active run for this exam
        const runRes = await pool.query("SELECT run_id FROM exam_runs WHERE exam_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1", [exam_id]);
        const activeRunId = runRes.rows[0]?.run_id || null;

        const updatedStudentsRes = await pool.query(`
          SELECT 
            s.student_id, s.name, s.batch, s.class,
            es.session_id, es.status, es.password_provided, es.tab_violation_count, es.seconds_left
          FROM students s
          LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = $1 AND ($3::uuid IS NULL OR es.run_id = $3)
          WHERE s.batch = ANY($2)
          ORDER BY s.student_id ASC
        `, [exam_id, assignedBatches, activeRunId]);

        io.to('teacher_dashboard').emit('dashboard_update', { 
          students: updatedStudentsRes.rows, 
          status, 
          global_seconds_left,
          assigned_batches: assignedBatches
        });
      }
    } catch(e) { console.error('Error broadcasting update', e); }
  };

  // Student Login Event
  socket.on('student_login', async (data: { student_id: string; password_provided: string }) => {
    try {
      const { student_id, password_provided } = data;

      // Find the most relevant active session for the student
      const result = await pool.query(`
        SELECT es.*, e.status as exam_global_status, s.batch as student_batch
        FROM exam_sessions es
        JOIN exams e ON es.exam_id = e.exam_id
        JOIN students s ON es.student_id = s.student_id
        WHERE es.student_id = $1 AND e.status != 'ENDED'
        ORDER BY 
          CASE WHEN e.status = 'STARTED' THEN 1
               WHEN e.status = 'PAUSED' THEN 2
               WHEN e.status = 'CREATED' THEN 3
               ELSE 4 END,
          e.scheduled_start DESC NULLS LAST
        LIMIT 1
      `, [student_id]);

      if (result.rows.length === 0) {
        socket.emit('login_error', { message: 'No active exams found for your account.' });
        return;
      }

      const session = result.rows[0];
      if (session.password_provided !== password_provided) {
        socket.emit('login_error', { message: 'Incorrect password.' });
        return;
      }

      let newStatus = session.status;
      if (session.status === 'READY') {
        await pool.query("UPDATE exam_sessions SET status = 'LOGGED_IN' WHERE session_id = $1", [session.session_id]);
        newStatus = 'LOGGED_IN';
      }
      
      // Ensure question order is generated and persisted
      await ensureStudentQuestionOrder(session.session_id, session.exam_id, session.student_batch);

      // Join socket rooms
      socket.join(session.session_id);
      socket.join(`exam_${session.exam_id}`);
      
      socket.emit('login_success', { session_id: session.session_id, student_id });
      
      // Notify Teacher dashboard
      io.to('teacher_dashboard').emit('student_status_update', {
        student_id,
        status: newStatus
      });
      
    } catch (err) {
      console.error(err);
      socket.emit('login_error', { message: 'Server error during login.' });
    }
  });
  
  // Teacher joining dashboard
  socket.on('join_teacher_dashboard', async () => {
    socket.join('teacher_dashboard');
    console.log(`Teacher joined dashboard: ${socket.id}`);
  });

  // Teacher selecting an exam to monitor
  socket.on('monitor_exam', async (data: { exam_id: string }) => {
    try {
      await broadcastDashboardUpdate(data.exam_id);
    } catch (e) { console.error(e); }
  });

  // Student workspace ready
  socket.on('workspace_ready', async (data: { session_id: string }) => {
    socket.join(data.session_id);
    try {
      const sessionRes = await pool.query(`
        SELECT es.exam_id, es.status, es.seconds_left, s.batch as student_batch
        FROM exam_sessions es
        JOIN students s ON es.student_id = s.student_id
        WHERE es.session_id = $1
      `, [data.session_id]);

      if (sessionRes.rows.length > 0) {
        const session = sessionRes.rows[0];
        socket.join(`exam_${session.exam_id}`);
        
        const examRes = await pool.query("SELECT status, duration_minutes, global_seconds_left FROM exams WHERE exam_id = $1", [session.exam_id]);
        
        if (session.status === 'COMPLETED' || examRes.rows[0].status === 'ENDED') {
          socket.emit('exam_completed');
          return;
        }

        // Ensure deterministic question order is ready
        await ensureStudentQuestionOrder(data.session_id, session.exam_id, session.student_batch);

        if (examRes.rows[0].status === 'STARTED') {
          let currentSecondsLeft = examRes.rows[0].global_seconds_left;
          
          if (session.status !== 'EXAMINEE' && session.status !== 'PAUSED') {
            await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE session_id = $1", [data.session_id]);
            const studentRes = await pool.query("SELECT student_id FROM exam_sessions WHERE session_id = $1", [data.session_id]);
            io.to('teacher_dashboard').emit('student_status_update', {
              student_id: studentRes.rows[0].student_id,
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
            previous_answers: previousAnswers 
          });

          if (session.status === 'PAUSED') {
            socket.emit('exam_paused');
          }
        }
      }
    } catch(e) { console.error(e); }
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
          let correctCount = 0;
          const totalPairs = Object.keys(correctMap).length;
          
          for (const key in selectedMap) {
            if (correctMap[key] === selectedMap[key]) {
              correctCount++;
            }
          }
          
          is_correct = correctCount === totalPairs && totalPairs > 0;
          if (totalPairs > 0) {
            awarded_marks = (correctCount / totalPairs) * qMarks;
          } else {
            awarded_marks = 0;
          }
        } catch(e) {}
      } else {
        is_correct = correctStr === selected_option;
      }

      if (awarded_marks === null) {
        awarded_marks = is_correct ? qMarks : 0;
      }

      // Upsert into student_responses
      await pool.query(`
        INSERT INTO student_responses (session_id, question_id, selected_option, is_correct, awarded_marks)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (session_id, question_id) 
        DO UPDATE SET selected_option = EXCLUDED.selected_option, is_correct = EXCLUDED.is_correct, awarded_marks = EXCLUDED.awarded_marks
      `, [session_id, question_id, selected_option, is_correct, awarded_marks]);
    } catch(e) { console.error(e); }
  });

  // Submit Exam
  socket.on('student_submit_exam', async (data: { session_id: string }) => {
    await forceSubmitExam(data.session_id);
  });

  // Tab Violation
  socket.on('tab_violation', async (data: { session_id: string }) => {
    try {
      const { session_id } = data;
      const res = await pool.query(`
        UPDATE exam_sessions 
        SET status = 'PAUSED', tab_violation_count = tab_violation_count + 1 
        WHERE session_id = $1 
        RETURNING student_id, tab_violation_count
      `, [session_id]);
      
      socket.emit('exam_paused');
      
      if (res.rows.length > 0) {
        io.to('teacher_dashboard').emit('student_status_update', {
          student_id: res.rows[0].student_id,
          status: 'PAUSED',
          tab_violation_count: res.rows[0].tab_violation_count
        });
      }
    } catch(e) { console.error(e); }
  });

  // Teacher Initialize Student (with exam_name support for attempt tracking)
  socket.on('teacher_initialize_student', async (data: { exam_id: string, student_id: string, exam_name?: string }) => {
    try {
      const { exam_id, student_id, exam_name } = data;
      
      const examRes = await pool.query("SELECT title, target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;

      const studentRes = await pool.query("SELECT name, batch FROM students WHERE student_id = $1", [student_id]);
      if (studentRes.rows.length === 0) return;

      // Get or create active exam_run
      let run_id: string;
      const activeRunRes = await pool.query("SELECT run_id FROM exam_runs WHERE exam_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1", [exam_id]);
      if (activeRunRes.rows.length > 0) {
        run_id = activeRunRes.rows[0].run_id;
      } else {
        const runName = exam_name || `${examRes.rows[0].title} - ${new Date().toLocaleDateString()}`;
        const newRun = await pool.query("INSERT INTO exam_runs (exam_id, exam_name, status) VALUES ($1, $2, 'ACTIVE') RETURNING run_id", [exam_id, runName]);
        run_id = newRun.rows[0].run_id;
      }

      const password = `${studentRes.rows[0].name.split(' ')[0].toUpperCase()}@${student_id}`;
      const newSessionId = require('crypto').randomUUID();

      const sessionRes = await pool.query(`
        INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided)
        VALUES ($1, $2, $3, $4, 'READY', $5)
        ON CONFLICT (exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
        DO UPDATE SET status = 'READY', password_provided = EXCLUDED.password_provided
        RETURNING session_id
      `, [newSessionId, exam_id, student_id, run_id, password]);

      const effectiveSessionId = sessionRes.rows[0].session_id;
      await ensureStudentQuestionOrder(effectiveSessionId, exam_id, studentRes.rows[0].batch);

      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Initialize Exam (creates new Exam Run attempt with provided Examination Name)
  socket.on('teacher_initialize_exam', async (data: { exam_id: string, exam_name?: string }) => {
    try {
      const { exam_id, exam_name } = data;
      const examRes = await pool.query("SELECT title, target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;

      // 1. Create a brand new exam_run for this attempt/retest
      const runTitle = exam_name && exam_name.trim() ? exam_name.trim() : `${examRes.rows[0].title} - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const runRes = await pool.query(
        "INSERT INTO exam_runs (exam_id, exam_name, status) VALUES ($1, $2, 'ACTIVE') RETURNING run_id",
        [exam_id, runTitle]
      );
      const run_id = runRes.rows[0].run_id;

      // 2. Fetch all assigned batches for this exam
      const batchesRes = await pool.query("SELECT batch_name FROM exam_batches WHERE exam_id = $1", [exam_id]);
      let assignedBatches = batchesRes.rows.map(r => r.batch_name);
      if (assignedBatches.length === 0 && examRes.rows[0].target_batch) {
        assignedBatches = [examRes.rows[0].target_batch];
      }

      // 3. Fetch all students across all assigned batches
      const studentsRes = await pool.query(
        "SELECT student_id, name, batch FROM students WHERE batch = ANY($1) ORDER BY student_id ASC",
        [assignedBatches]
      );

      // 4. Create sessions & generate deterministic question order for each student
      for (const student of studentsRes.rows) {
        const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
        const newSessionId = require('crypto').randomUUID();

        const sessionRes = await pool.query(`
          INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided)
          VALUES ($1, $2, $3, $4, 'READY', $5)
          ON CONFLICT (exam_id, student_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid))
          DO UPDATE SET status = 'READY', password_provided = EXCLUDED.password_provided
          RETURNING session_id
        `, [newSessionId, exam_id, student.student_id, run_id, password]);

        const effectiveSessionId = sessionRes.rows[0].session_id;
        await ensureStudentQuestionOrder(effectiveSessionId, exam_id, student.batch);
      }

      // 5. Sync dashboard
      await broadcastDashboardUpdate(exam_id);
    } catch(e) { console.error('Error initializing exam:', e); }
  });

  // Teacher Start Exam
  socket.on('teacher_start_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      const examRes = await pool.query("SELECT duration_minutes FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;
      const durationSeconds = examRes.rows[0].duration_minutes * 60;

      await pool.query(
        "UPDATE exams SET status = 'STARTED', actual_start_time = CURRENT_TIMESTAMP, global_seconds_left = $2 WHERE exam_id = $1",
        [exam_id, durationSeconds]
      );

      // Update active run start time
      await pool.query(
        "UPDATE exam_runs SET started_at = CURRENT_TIMESTAMP WHERE exam_id = $1 AND status = 'ACTIVE'",
        [exam_id]
      );

      const sectionsRes = await pool.query("SELECT section_id, title, section_type, section_marks FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
      const questionsRes = await pool.query("SELECT question_id, section_id, question_type, question_text_en, question_text_bn, options_json, marks FROM questions WHERE exam_id = $1 ORDER BY section_id, question_id", [exam_id]);
      
      if (activeExamTimers.has(exam_id)) {
        clearInterval(activeExamTimers.get(exam_id)!);
      }

      let lastTickTime = Date.now();
      const timer = setInterval(async () => {
        try {
          const examCheck = await pool.query("SELECT status FROM exams WHERE exam_id = $1", [exam_id]);
          if (examCheck.rows.length === 0 || examCheck.rows[0].status === 'ENDED') {
            clearInterval(timer);
            activeExamTimers.delete(exam_id);
            return;
          }

          if (examCheck.rows[0].status === 'PAUSED') {
            lastTickTime = Date.now();
            return;
          }

          const now = Date.now();
          const elapsedSeconds = Math.round((now - lastTickTime) / 1000);
          lastTickTime = now;

          if (elapsedSeconds > 0) {
            await pool.query("UPDATE exams SET global_seconds_left = GREATEST(0, global_seconds_left - $2) WHERE exam_id = $1 AND status = 'STARTED'", [exam_id, elapsedSeconds]);
            
            const timerCheck = await pool.query("SELECT global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
            if (timerCheck.rows[0].global_seconds_left === 0) {
              const activeSessions = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')", [exam_id]);
              for (const row of activeSessions.rows) {
                await forceSubmitExam(row.session_id);
              }
              
              await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP WHERE exam_id = $1", [exam_id]);
              await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE exam_id = $1 AND status = 'ACTIVE'", [exam_id]);
              
              io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'Time is up!' });
              io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'ENDED' });
              await broadcastDashboardUpdate(exam_id);
              
              clearInterval(timer);
              activeExamTimers.delete(exam_id);
            }
          }
        } catch (e) {
          console.error('Timer error', e);
        }
      }, 5000);
      
      activeExamTimers.set(exam_id, timer);

      io.to(`exam_${exam_id}`).emit('exam_started', { 
        questions: questionsRes.rows, 
        sections: sectionsRes.rows, 
        seconds_left: durationSeconds, 
        previous_answers: {} 
      });
      
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Stop Exam
  socket.on('teacher_stop_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP WHERE exam_id = $1", [exam_id]);
      await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE exam_id = $1 AND status = 'ACTIVE'", [exam_id]);
      
      const activeSessions = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')", [exam_id]);
      for (const row of activeSessions.rows) {
        await forceSubmitExam(row.session_id);
      }
      
      if (activeExamTimers.has(exam_id)) {
        clearInterval(activeExamTimers.get(exam_id)!);
        activeExamTimers.delete(exam_id);
      }

      io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'The exam has been stopped by the teacher.' });
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'ENDED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Pause Exam
  socket.on('teacher_pause_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      await pool.query("UPDATE exams SET status = 'PAUSED' WHERE exam_id = $1", [exam_id]);
      await pool.query("UPDATE exam_sessions SET status = 'PAUSED' WHERE exam_id = $1 AND status = 'EXAMINEE'", [exam_id]);
      io.to(`exam_${exam_id}`).emit('exam_paused');
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'PAUSED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Resume Exam
  socket.on('teacher_resume_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      await pool.query("UPDATE exams SET status = 'STARTED' WHERE exam_id = $1", [exam_id]);
      await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE exam_id = $1 AND status = 'PAUSED'", [exam_id]);
      io.to(`exam_${exam_id}`).emit('exam_resumed');
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Safe Reset Exam (Resets exam state to CREATED without deleting historical runs/results)
  socket.on('teacher_reset_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      
      // Close any active run
      await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE exam_id = $1 AND status = 'ACTIVE'", [exam_id]);

      // Set exam status to CREATED for a new run
      await pool.query("UPDATE exams SET status = 'CREATED', actual_start_time = NULL, actual_end_time = NULL, global_seconds_left = NULL WHERE exam_id = $1", [exam_id]);
      
      if (activeExamTimers.has(exam_id)) {
        clearInterval(activeExamTimers.get(exam_id)!);
        activeExamTimers.delete(exam_id);
      }
      
      io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'The current exam session has ended.' });
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'CREATED' });
      await broadcastDashboardUpdate(exam_id);
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

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });

});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT} (LAN ready)`);
});
