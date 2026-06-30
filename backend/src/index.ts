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
    methods: ['GET', 'POST']
  }
});

const PORT = parseInt(process.env.PORT || '3001', 10);

const activeExamTimers = new Map<string, NodeJS.Timeout>();

// Simple API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Phase 2 REST APIs
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

app.post('/api/exams', async (req, res) => {
  try {
    const { title, duration_minutes, target_batch, full_marks } = req.body;
    const result = await pool.query(
      "INSERT INTO exams (title, duration_minutes, target_batch, full_marks, status) VALUES ($1, $2, $3, $4, 'DRAFT') RETURNING *",
      [title, duration_minutes, target_batch, full_marks]
    );
    const newExam = result.rows[0];
    res.json({ success: true, exam: newExam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

app.post('/api/exams/:id/publish', async (req, res) => {
  try {
    const exam_id = req.params.id;
    // Check if it's already published
    const examRes = await pool.query("SELECT * FROM exams WHERE exam_id = $1", [exam_id]);
    if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    const exam = examRes.rows[0];
    
    if (exam.status !== 'DRAFT') return res.status(400).json({ error: 'Exam is not a draft' });

    // Update status to CREATED
    await pool.query("UPDATE exams SET status = 'CREATED' WHERE exam_id = $1", [exam_id]);

    // Generate sessions and passwords for target_batch
    const target_batch = exam.target_batch;
    const studentsRes = await pool.query("SELECT student_id, name FROM students WHERE batch = $1", [target_batch]);
    
    for (const student of studentsRes.rows) {
      const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
      await pool.query(
        "INSERT INTO exam_sessions (exam_id, student_id, status, password_provided) VALUES ($1, $2, 'LOGGED_IN', $3) ON CONFLICT (exam_id, student_id) DO NOTHING",
        [exam_id, student.student_id, password]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
});

app.get('/api/exams', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM exams ORDER BY scheduled_start DESC NULLS LAST, title ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

app.delete('/api/exams/:id', async (req, res) => {
  try {
    const exam_id = req.params.id;
    // Delete associated data first to avoid orphans
    await pool.query("DELETE FROM exam_sessions WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM questions WHERE exam_id = $1", [exam_id]);
    await pool.query("DELETE FROM exams WHERE exam_id = $1", [exam_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

app.put('/api/exams/:id', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { title, duration_minutes, full_marks } = req.body;
    await pool.query(
      "UPDATE exams SET title = $1, duration_minutes = $2, full_marks = $3 WHERE exam_id = $4",
      [title, duration_minutes, full_marks, exam_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

app.get('/api/exams/:id/results', async (req, res) => {
  try {
    const exam_id = req.params.id;
    const result = await pool.query(`
      SELECT s.student_id, s.name, s.class, es.score, es.status, es.tab_violation_count, ex.full_marks
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      WHERE es.exam_id = $1
      ORDER BY es.score DESC, s.name ASC
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
      SELECT s.name, s.student_id, s.class, es.score, es.status, ex.title as exam_title, ex.full_marks
      FROM exam_sessions es
      JOIN students s ON es.student_id = s.student_id
      JOIN exams ex ON es.exam_id = ex.exam_id
      WHERE es.exam_id = $1 AND es.student_id = $2
    `, [exam_id, student_id]);
    
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const sessionData = sessionRes.rows[0];

    const qaRes = await pool.query(`
      SELECT 
        q.question_id, q.section_id, q.question_type, q.question_text_en, q.question_text_bn,
        q.options_json, q.correct_answer, q.marks,
        sec.title as section_title,
        sr.selected_option as student_answer, sr.is_correct
      FROM questions q
      LEFT JOIN exam_sections sec ON q.section_id = sec.section_id
      LEFT JOIN exam_sessions es ON es.exam_id = q.exam_id AND es.student_id = $2
      LEFT JOIN student_responses sr ON sr.session_id = es.session_id AND sr.question_id = q.question_id
      WHERE q.exam_id = $1
      ORDER BY sec.section_id
    `, [exam_id, student_id]);

    res.json({
      student: sessionData,
      answers: qaRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch answer sheet' });
  }
});

app.get('/api/exams/:id/sections', async (req, res) => {
  try {
    const exam_id = req.params.id;
    // Fetch sections
    const sectionsRes = await pool.query("SELECT * FROM exam_sections WHERE exam_id = $1 ORDER BY section_id", [exam_id]);
    const sections = sectionsRes.rows;
    // Fetch questions for this exam
    const questionsRes = await pool.query("SELECT * FROM questions WHERE exam_id = $1", [exam_id]);
    const questions = questionsRes.rows;
    
    // Group questions by section
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

app.get('/api/exams/active', async (req, res) => {
  try {
    // Check if there is an interrupted exam (status = 'STARTED')
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

// Helper to force submit an exam
async function forceSubmitExam(session_id: string) {
  try {
    const sessionCheck = await pool.query("SELECT status FROM exam_sessions WHERE session_id = $1", [session_id]);
    if (sessionCheck.rows.length === 0 || sessionCheck.rows[0].status === 'COMPLETED') {
      return; // Already submitted or not found
    }

    const scoreRes = await pool.query(`
      SELECT COALESCE(SUM(q.marks), 0) as total_score
      FROM student_responses sr
      JOIN questions q ON sr.question_id = q.question_id
      WHERE sr.session_id = $1 AND sr.is_correct = true
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

// Real-time Socket.IO logic
io.on('connection', (socket: Socket) => {
  console.log(`New connection: ${socket.id}`);

  // Student Login Event
  socket.on('student_login', async (data: { student_id: string; password_provided: string }) => {
    try {
      const { student_id, password_provided } = data;

      // Find the most relevant active session for the student
      const result = await pool.query(`
        SELECT es.*, e.status as exam_global_status 
        FROM exam_sessions es
        JOIN exams e ON es.exam_id = e.exam_id
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

      // Only update session status if it's currently READY
      if (session.status === 'READY') {
        await pool.query(
          "UPDATE exam_sessions SET status = 'LOGGED_IN' WHERE session_id = $1",
          [session.session_id]
        );
        newStatus = 'LOGGED_IN';
      }
      
      // Join socket room
      socket.join(session.session_id);
      socket.join(`exam_${session.exam_id}`); // Group room for the exam
      
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

  // Helper to instantly sync teacher dashboard
  const broadcastDashboardUpdate = async (exam_id: string) => {
    try {
      const examRes = await pool.query("SELECT target_batch, status, global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length > 0) {
        const { target_batch, status, global_seconds_left } = examRes.rows[0];
        const updatedStudentsRes = await pool.query(`
          SELECT s.student_id, s.name, es.session_id, es.status, es.password_provided, es.tab_violation_count, es.seconds_left
          FROM students s
          LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = $1
          WHERE s.batch = $2
        `, [exam_id, target_batch]);
        io.to('teacher_dashboard').emit('dashboard_update', { students: updatedStudentsRes.rows, status, global_seconds_left });
      }
    } catch(e) { console.error('Error broadcasting update', e); }
  };

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
      const sessionRes = await pool.query("SELECT exam_id, status, seconds_left FROM exam_sessions WHERE session_id = $1", [data.session_id]);
      if (sessionRes.rows.length > 0) {
        const session = sessionRes.rows[0];
        socket.join(`exam_${session.exam_id}`);
        
        // Power-cut resilience: if exam is already started and they reconnect
        const examRes = await pool.query("SELECT status, duration_minutes, global_seconds_left FROM exams WHERE exam_id = $1", [session.exam_id]);
        if (examRes.rows[0].status === 'STARTED') {
          if (session.status === 'COMPLETED') {
            socket.emit('exam_completed');
            return;
          }
          if (session.status === 'PAUSED') {
            socket.emit('exam_paused');
            return;
          }

          // Sync with global timer
          let currentSecondsLeft = examRes.rows[0].global_seconds_left;
          
          if (session.status !== 'EXAMINEE') {
            // Set status to EXAMINEE because they are actively taking the exam
            await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE session_id = $1", [data.session_id]);
            
            const studentRes = await pool.query("SELECT student_id FROM exam_sessions WHERE session_id = $1", [data.session_id]);
            io.to('teacher_dashboard').emit('student_status_update', {
              student_id: studentRes.rows[0].student_id,
              status: 'EXAMINEE'
            });
          }

          // Fetch sections
          const sectionsRes = await pool.query("SELECT section_id, title, section_type, section_marks FROM exam_sections WHERE exam_id = $1", [session.exam_id]);
          
          // Fetch questions
          const questionsRes = await pool.query("SELECT question_id, section_id, question_type, question_text_en, question_text_bn, options_json FROM questions WHERE exam_id = $1", [session.exam_id]);
          
          // Also fetch previously saved answers for this session
          const answersRes = await pool.query("SELECT question_id, selected_option FROM student_responses WHERE session_id = $1", [data.session_id]);
          const previousAnswers = answersRes.rows.reduce((acc, row) => {
            acc[row.question_id] = row.selected_option;
            return acc;
          }, {});

          socket.emit('exam_started', { questions: questionsRes.rows, sections: sectionsRes.rows, seconds_left: currentSecondsLeft, previous_answers: previousAnswers });
        }
      }
    } catch(e) { console.error(e); }
  });

  // Submit Answer
  socket.on('submit_answer', async (data: { session_id: string, question_id: string, selected_option: string }) => {
    try {
      const { session_id, question_id, selected_option } = data;
      // Fetch correct answer
      const qRes = await pool.query("SELECT correct_answer, question_type FROM questions WHERE question_id = $1", [question_id]);
      
      let is_correct = false;
      const correctStr = qRes.rows[0]?.correct_answer;
      if (qRes.rows[0]?.question_type === 'FITB') {
        try {
          const correctArr = JSON.parse(correctStr);
          const selectedArr = JSON.parse(selected_option);
          // Simple array equality check
          if (Array.isArray(correctArr) && Array.isArray(selectedArr) && correctArr.length === selectedArr.length) {
            is_correct = correctArr.every((val, index) => val === selectedArr[index]);
          }
        } catch(e) {}
      } else {
        is_correct = correctStr === selected_option;
      }

      // Upsert into student_responses
      await pool.query(`
        INSERT INTO student_responses (session_id, question_id, selected_option, is_correct)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (session_id, question_id) 
        DO UPDATE SET selected_option = EXCLUDED.selected_option, is_correct = EXCLUDED.is_correct
      `, [session_id, question_id, selected_option, is_correct]);
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
      
      socket.emit('exam_paused'); // Lock the student
      
      // Notify teacher
      if (res.rows.length > 0) {
        io.to('teacher_dashboard').emit('student_status_update', {
          student_id: res.rows[0].student_id,
          status: 'PAUSED',
          tab_violation_count: res.rows[0].tab_violation_count
        });
      }
    } catch(e) { console.error(e); }
  });

  // Teacher Initialize Student
  socket.on('teacher_initialize_student', async (data: { exam_id: string, student_id: string }) => {
    try {
      const { exam_id, student_id } = data;
      const examRes = await pool.query("SELECT target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;
      
      const studentRes = await pool.query("SELECT name FROM students WHERE student_id = $1", [student_id]);
      if (studentRes.rows.length === 0) return;

      const password = `${studentRes.rows[0].name.split(' ')[0].toUpperCase()}@${student_id}`;
      
      await pool.query(`
        INSERT INTO exam_sessions (session_id, exam_id, student_id, status, password_provided)
        VALUES (gen_random_uuid(), $1, $2, 'READY', $3)
        ON CONFLICT (exam_id, student_id) DO NOTHING
      `, [exam_id, student_id, password]);
      
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Hard Reset Student (Full Reset)
  socket.on('teacher_hard_reset_student', async (data: { exam_id: string, student_id: string }) => {
    try {
      const { exam_id, student_id } = data;
      
      const sessionRes = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND student_id = $2", [exam_id, student_id]);
      if (sessionRes.rows.length === 0) return;
      const session_id = sessionRes.rows[0].session_id;

      // Complete removal of the session. (student_responses cascades)
      await pool.query("DELETE FROM exam_sessions WHERE session_id = $1", [session_id]);

      // Force logout if connected
      io.to(session_id).emit('force_logout', { message: 'Your exam attempt has been fully reset by the teacher.' });

      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Global Teacher Hard Reset Exam
  socket.on('teacher_hard_reset_exam', async (data: { exam_id: string }) => {
    try {
      const { exam_id } = data;

      // Get all active sessions for this exam
      const sessionsRes = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1", [exam_id]);
      
      // Complete removal of all sessions for this exam
      await pool.query("DELETE FROM exam_sessions WHERE exam_id = $1", [exam_id]);

      // Set the exam back to CREATED state (so it can be re-initialized and restarted)
      await pool.query("UPDATE exams SET status = 'CREATED', actual_start_time = NULL, actual_end_time = NULL, global_seconds_left = NULL WHERE exam_id = $1", [exam_id]);

      // Force logout all students
      for (const row of sessionsRes.rows) {
        io.to(row.session_id).emit('force_logout', { message: 'The entire exam has been fully reset by the teacher.' });
      }

      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Initialize Exam
  socket.on('teacher_initialize_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      // Get exam batch
      const examRes = await pool.query("SELECT target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;
      const target_batch = examRes.rows[0].target_batch;

      // Get students in batch
      const studentsRes = await pool.query("SELECT student_id, name FROM students WHERE batch = $1", [target_batch]);

      // Assign all students that don't already have a session
      for (const student of studentsRes.rows) {
        const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
        await pool.query(`
          INSERT INTO exam_sessions (session_id, exam_id, student_id, status, password_provided)
          VALUES (gen_random_uuid(), $1, $2, 'READY', $3)
          ON CONFLICT (exam_id, student_id) DO NOTHING
        `, [exam_id, student.student_id, password]);
      }
      
      // Re-fetch instantly and sync
      const updatedStudentsRes = await pool.query(`
        SELECT s.student_id, s.name, es.session_id, es.status, es.password_provided, es.tab_violation_count, es.seconds_left
        FROM students s
        LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = $1
        WHERE s.batch = $2
      `, [exam_id, target_batch]);
      io.to('teacher_dashboard').emit('dashboard_update', { students: updatedStudentsRes.rows, status: examRes.rows[0].status });
    } catch(e) { console.error(e); }
  });

  // Teacher Start Exam
  socket.on('teacher_start_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      
      const examRes = await pool.query("SELECT duration_minutes FROM exams WHERE exam_id = $1", [exam_id]);
      const durationSeconds = examRes.rows[0].duration_minutes * 60;

      // Set exam status and global timer
      await pool.query("UPDATE exams SET status = 'STARTED', actual_start_time = CURRENT_TIMESTAMP, global_seconds_left = $2 WHERE exam_id = $1", [exam_id, durationSeconds]);

      // Fetch sections
      const sectionsRes = await pool.query("SELECT section_id, title, section_type, section_marks FROM exam_sections WHERE exam_id = $1", [exam_id]);

      // Get all questions
      const questionsRes = await pool.query("SELECT question_id, section_id, question_type, question_text_en, question_text_bn, options_json FROM questions WHERE exam_id = $1", [exam_id]);
      
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
            return; // Do nothing while paused
          }

          const now = Date.now();
          const elapsedSeconds = Math.round((now - lastTickTime) / 1000);
          lastTickTime = now;

          if (elapsedSeconds > 0) {
            // Decrement global time
            await pool.query("UPDATE exams SET global_seconds_left = GREATEST(0, global_seconds_left - $2) WHERE exam_id = $1 AND status = 'STARTED'", [exam_id, elapsedSeconds]);
            
            const timerCheck = await pool.query("SELECT global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
            if (timerCheck.rows[0].global_seconds_left === 0) {
              // Force submit all active sessions
              const activeSessions = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')", [exam_id]);
              for (const row of activeSessions.rows) {
                await forceSubmitExam(row.session_id);
              }
              
              await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP WHERE exam_id = $1", [exam_id]);
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

      io.to(`exam_${exam_id}`).emit('exam_started', { questions: questionsRes.rows, sections: sectionsRes.rows, seconds_left: durationSeconds, previous_answers: {} });
      
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Stop Exam
  socket.on('teacher_stop_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      // Set exam status to ENDED
      await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP WHERE exam_id = $1", [exam_id]);
      
      // Update all non-completed sessions to COMPLETED? 
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

  // Teacher Restart Exam
  socket.on('teacher_restart_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      
      const examRes = await pool.query("SELECT duration_minutes FROM exams WHERE exam_id = $1", [exam_id]);
      const durationSeconds = examRes.rows[0].duration_minutes * 60;
      
      await pool.query("UPDATE exams SET status = 'STARTED', actual_end_time = NULL, global_seconds_left = $2 WHERE exam_id = $1", [exam_id, durationSeconds]);
      
      await pool.query("UPDATE exam_sessions SET status = 'LOGGED_IN', score = NULL, tab_violation_count = 0 WHERE exam_id = $1", [exam_id]);
      
      // Clear old timer if any
      if (activeExamTimers.has(exam_id)) {
        clearInterval(activeExamTimers.get(exam_id)!);
      }

      // Start new timer
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
            return; // Do nothing while paused
          }

          const now = Date.now();
          const elapsedSeconds = Math.round((now - lastTickTime) / 1000);
          lastTickTime = now;

          if (elapsedSeconds > 0) {
            // Decrement global time
            await pool.query("UPDATE exams SET global_seconds_left = GREATEST(0, global_seconds_left - $2) WHERE exam_id = $1 AND status = 'STARTED'", [exam_id, elapsedSeconds]);
            
            const timerCheck = await pool.query("SELECT global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
            if (timerCheck.rows[0].global_seconds_left === 0) {
              // Force submit sessions that hit 0
              const expiredSessions = await pool.query("SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status IN ('LOGGED_IN', 'EXAMINEE', 'PAUSED')", [exam_id]);
              for (const row of expiredSessions.rows) {
                await forceSubmitExam(row.session_id);
              }
              
              await pool.query("UPDATE exams SET status = 'ENDED', actual_end_time = CURRENT_TIMESTAMP WHERE exam_id = $1", [exam_id]);
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

      io.to(`exam_${exam_id}`).emit('exam_resumed'); // Forces logged in students to proceed
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'STARTED' });
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Reset Exam
  socket.on('teacher_reset_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      // Wipe all responses
      await pool.query("DELETE FROM student_responses WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)", [exam_id]);
      // Wipe all sessions
      await pool.query("DELETE FROM exam_sessions WHERE exam_id = $1", [exam_id]);
      // Reset exam status to CREATED
      await pool.query("UPDATE exams SET status = 'CREATED', actual_start_time = NULL, actual_end_time = NULL, global_seconds_left = NULL WHERE exam_id = $1", [exam_id]);
      
      if (activeExamTimers.has(exam_id)) {
        clearInterval(activeExamTimers.get(exam_id)!);
        activeExamTimers.delete(exam_id);
      }
      
      io.to(`exam_${exam_id}`).emit('exam_ended', { message: 'The exam has been hard reset by the teacher.' });
      io.to('teacher_dashboard').emit('exam_status_update', { exam_id, status: 'CREATED' });

      // Instantly auto-initialize students
      const examRes = await pool.query("SELECT target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length > 0) {
        const target_batch = examRes.rows[0].target_batch;
        
        // Assign all students
        const studentsInBatchRes = await pool.query("SELECT student_id, name FROM students WHERE batch = $1", [target_batch]);
        for (const student of studentsInBatchRes.rows) {
          const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
          await pool.query(`
            INSERT INTO exam_sessions (session_id, exam_id, student_id, status, password_provided)
            VALUES (gen_random_uuid(), $1, $2, 'READY', $3)
            ON CONFLICT (exam_id, student_id) DO NOTHING
          `, [exam_id, student.student_id, password]);
        }
        await broadcastDashboardUpdate(exam_id);
      }
    } catch (e) { console.error(e); }
  });

  // Teacher Initialize Exam
  socket.on('teacher_initialize_exam', async (data: { exam_id: string }) => {
    try {
      const exam_id = data.exam_id;
      // Get exam batch
      const examRes = await pool.query("SELECT target_batch FROM exams WHERE exam_id = $1", [exam_id]);
      if (examRes.rows.length === 0) return;
      const target_batch = examRes.rows[0].target_batch;

      // Get students in batch
      const studentsRes = await pool.query("SELECT student_id, name FROM students WHERE batch = $1", [target_batch]);

      // Assign all students that don't already have a session
      for (const student of studentsRes.rows) {
        const password = `${student.name.split(' ')[0].toUpperCase()}@${student.student_id}`;
        await pool.query(`
          INSERT INTO exam_sessions (session_id, exam_id, student_id, status, password_provided)
          VALUES (gen_random_uuid(), $1, $2, 'READY', $3)
          ON CONFLICT (exam_id, student_id) DO NOTHING
        `, [exam_id, student.student_id, password]);
      }
      
      await broadcastDashboardUpdate(exam_id);
    } catch (e) { console.error(e); }
  });

  // Teacher Unpause Student
  socket.on('teacher_unpause_student', async (data: { session_id: string }) => {
    try {
      const res = await pool.query("UPDATE exam_sessions SET status = 'EXAMINEE' WHERE session_id = $1 RETURNING student_id", [data.session_id]);
      
      // Notify student
      io.to(data.session_id).emit('exam_resumed');
      
      // Notify teacher UI
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
