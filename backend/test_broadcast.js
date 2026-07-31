const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/exam_db' });

async function run() {
  const exam_id = '4bfaf3ee-29e1-4590-be4e-e0877bf06d78'; // "TERM 2: MS Word, MS PowerPoint"
  const examRes = await pool.query("SELECT target_batch, status, global_seconds_left FROM exams WHERE exam_id = $1", [exam_id]);
  console.log('Exam Res:', examRes.rows);
  const { target_batch } = examRes.rows[0];
  const updatedStudentsRes = await pool.query(`
    SELECT s.student_id, s.name, es.session_id, es.status, es.password_provided, es.tab_violation_count, es.seconds_left
    FROM students s
    LEFT JOIN exam_sessions es ON s.student_id = es.student_id AND es.exam_id = $1
    WHERE s.batch = $2
  `, [exam_id, target_batch]);
  console.log('Students returned:', updatedStudentsRes.rows.length);
  pool.end();
}
run();
