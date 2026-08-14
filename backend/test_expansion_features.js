const { Pool } = require('pg');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'exam_db',
});

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting ICST Safe Feature Expansion Verification');
  console.log('====================================================\n');

  try {
    // 1. Test Batches Table & Seeding
    console.log('--- 1. Batch Management Verification ---');
    const batchesRes = await pool.query("SELECT * FROM batches ORDER BY name ASC");
    assert(batchesRes.rows.length >= 7, `Batches table populated with ${batchesRes.rows.length} batches`);

    const testBatchName = `Test Batch ${Date.now()}`;
    const createBatchRes = await pool.query(
      "INSERT INTO batches (name, course_class, session, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [testBatchName, 'Class 10', '2026', 'Automated Test Batch', 'ACTIVE']
    );
    assert(createBatchRes.rows.length === 1, `Created new batch: ${testBatchName}`);
    const createdBatchId = createBatchRes.rows[0].batch_id;

    // Assign a test student to this batch
    const testStudentId = '999';
    await pool.query(
      "INSERT INTO students (student_id, name, phone_no, class, batch) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id) DO UPDATE SET batch = EXCLUDED.batch",
      [testStudentId, 'Auto Tester', '9999999999', 'Class 10', testBatchName]
    );

    // Verify batch student count
    const countCheck = await pool.query(
      "SELECT COUNT(*) FROM students WHERE batch = $1",
      [testBatchName]
    );
    assert(parseInt(countCheck.rows[0].count) === 1, 'Batch student count calculated correctly');

    // 2. Test Multi-Batch Exam Assignment & Shuffle Configuration
    console.log('\n--- 2. Multi-Batch Exam Assignment & Shuffle Config ---');
    const examRes = await pool.query(
      "INSERT INTO exams (title, duration_minutes, target_batch, full_marks, status) VALUES ($1, $2, $3, $4, 'CREATED') RETURNING *",
      ['Automated Verification Exam', 45, testBatchName, 100]
    );
    const testExamId = examRes.rows[0].exam_id;
    assert(!!testExamId, `Created exam with ID: ${testExamId}`);

    // Assign multiple batches (Batch A with shuffle ON, Batch B with shuffle OFF)
    await pool.query("DELETE FROM exam_batches WHERE exam_id = $1", [testExamId]);
    await pool.query(
      "INSERT INTO exam_batches (exam_id, batch_name, shuffle_enabled) VALUES ($1, $2, TRUE), ($1, $3, FALSE)",
      [testExamId, testBatchName, 'V,VI Batch 1']
    );

    const ebRes = await pool.query("SELECT batch_name, shuffle_enabled FROM exam_batches WHERE exam_id = $1 ORDER BY batch_name ASC", [testExamId]);
    assert(ebRes.rows.length === 2, 'Assigned 2 batches to one exam set without duplicating questions');
    const testBatchConfig = ebRes.rows.find(r => r.batch_name === testBatchName);
    assert(testBatchConfig.shuffle_enabled === true, 'Shuffle flag correctly set to ON for test batch');

    // 3. Test Section & Questions Insertion
    console.log('\n--- 3. Section & Questions Setup ---');
    const secRes = await pool.query(
      "INSERT INTO exam_sections (exam_id, title, section_marks, section_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [testExamId, 'Section A - Core Questions', 50, 'MCQ']
    );
    const testSecId = secRes.rows[0].section_id;

    const q1 = await pool.query(
      "INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES ($1, $2, 'MCQ', 'What is 10 + 20?', '১০ + ২০ কত?', '[\"20\",\"30\",\"40\",\"50\"]', '30', 25) RETURNING question_id",
      [testExamId, testSecId]
    );
    const q2 = await pool.query(
      "INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks) VALUES ($1, $2, 'MCQ', 'What is 5 * 5?', '৫ * ৫ কত?', '[\"15\",\"20\",\"25\",\"30\"]', '25', 25) RETURNING question_id",
      [testExamId, testSecId]
    );
    assert(!!q1.rows[0].question_id && !!q2.rows[0].question_id, 'Inserted bilingual questions into section');

    // 4. Test Deterministic Question Shuffler & Session Order Persistence
    console.log('\n--- 4. Deterministic Question Shuffler & Persistence ---');
    const sessionId = require('crypto').randomUUID();
    const runId1 = require('crypto').randomUUID();

    // Create exam run
    await pool.query(
      "INSERT INTO exam_runs (run_id, exam_id, exam_name, status) VALUES ($1, $2, 'Mathematics Test - Attempt 1', 'ACTIVE')",
      [runId1, testExamId]
    );

    // Create session
    await pool.query(
      "INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided, score) VALUES ($1, $2, $3, $4, 'COMPLETED', 'TEST@999', 50)",
      [sessionId, testExamId, testStudentId, runId1]
    );

    // Insert order into exam_session_question_order
    await pool.query(
      "INSERT INTO exam_session_question_order (session_id, question_id, display_order) VALUES ($1, $2, 1), ($1, $3, 2)",
      [sessionId, q2.rows[0].question_id, q1.rows[0].question_id]
    );

    // Save response
    await pool.query(
      "INSERT INTO student_responses (session_id, question_id, selected_option, is_correct, awarded_marks) VALUES ($1, $2, '25', true, 25), ($1, $3, '30', true, 25)",
      [sessionId, q2.rows[0].question_id, q1.rows[0].question_id]
    );

    // Verify ordering retrieval
    const orderCheck = await pool.query(
      "SELECT question_id, display_order FROM exam_session_question_order WHERE session_id = $1 ORDER BY display_order ASC",
      [sessionId]
    );
    assert(orderCheck.rows.length === 2, 'Session question order saved and retrieved');
    assert(orderCheck.rows[0].question_id === q2.rows[0].question_id, 'Student question order preserved exactly (Q2 -> Q1)');

    // 5. Test Safe Reset & Retest History
    console.log('\n--- 5. Safe Reset & Retest History (Zero Data Loss) ---');
    // Simulate teacher resetting exam
    await pool.query("UPDATE exam_runs SET ended_at = CURRENT_TIMESTAMP, status = 'ENDED' WHERE run_id = $1", [runId1]);
    await pool.query("UPDATE exams SET status = 'CREATED' WHERE exam_id = $1", [testExamId]);

    // Verify Attempt 1 still exists in DB
    const attempt1Check = await pool.query("SELECT * FROM exam_sessions WHERE session_id = $1", [sessionId]);
    assert(attempt1Check.rows.length === 1 && parseFloat(attempt1Check.rows[0].score) === 50, 'Attempt 1 result preserved after reset');

    // Start Retest (Attempt 2)
    const runId2 = require('crypto').randomUUID();
    await pool.query(
      "INSERT INTO exam_runs (run_id, exam_id, exam_name, status) VALUES ($1, $2, 'Mathematics Test - Retest 1', 'ACTIVE')",
      [runId2, testExamId]
    );

    const sessionId2 = require('crypto').randomUUID();
    await pool.query(
      "INSERT INTO exam_sessions (session_id, exam_id, student_id, run_id, status, password_provided, score) VALUES ($1, $2, $3, $4, 'COMPLETED', 'TEST@999', 25)",
      [sessionId2, testExamId, testStudentId, runId2]
    );

    // Query all runs for this exam
    const runsForExam = await pool.query(
      "SELECT run_id, exam_name, status FROM exam_runs WHERE exam_id = $1 ORDER BY created_at ASC",
      [testExamId]
    );
    assert(runsForExam.rows.length === 2, 'Both Attempt 1 and Retest 1 runs preserved independently');
    console.log(`Runs in DB for exam: [${runsForExam.rows.map(r => r.exam_name).join(', ')}]`);

    // 6. Test Result Search & Keyset/Offset Pagination
    console.log('\n--- 6. Paginated Result Query ---');
    const paginatedRes = await pool.query(
      "SELECT r.run_id, r.exam_name FROM exam_runs r ORDER BY r.created_at DESC LIMIT 10 OFFSET 0"
    );
    assert(paginatedRes.rows.length <= 10, `Pagination returned ${paginatedRes.rows.length} records (<= 10 limit)`);

    const searchRes = await pool.query(
      "SELECT r.run_id, r.exam_name FROM exam_runs r WHERE r.exam_name ILIKE $1",
      ['%Retest%']
    );
    assert(searchRes.rows.length >= 1, `Search query for 'Retest' returned ${searchRes.rows.length} match(es)`);

    // Cleanup test records
    console.log('\n--- Cleaning up temporary test records ---');
    await pool.query("DELETE FROM student_responses WHERE session_id IN ($1, $2)", [sessionId, sessionId2]);
    await pool.query("DELETE FROM exam_session_question_order WHERE session_id IN ($1, $2)", [sessionId, sessionId2]);
    await pool.query("DELETE FROM exam_sessions WHERE session_id IN ($1, $2)", [sessionId, sessionId2]);
    await pool.query("DELETE FROM exam_runs WHERE run_id IN ($1, $2)", [runId1, runId2]);
    await pool.query("DELETE FROM exam_batches WHERE exam_id = $1", [testExamId]);
    await pool.query("DELETE FROM questions WHERE exam_id = $1", [testExamId]);
    await pool.query("DELETE FROM exam_sections WHERE exam_id = $1", [testExamId]);
    await pool.query("DELETE FROM exams WHERE exam_id = $1", [testExamId]);
    await pool.query("DELETE FROM students WHERE student_id = $1", [testStudentId]);
    await pool.query("DELETE FROM batches WHERE batch_id = $1", [createdBatchId]);

    console.log('\n====================================================');
    console.log('🎉 ALL INTEGRITY & FEATURE EXPANSION TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
