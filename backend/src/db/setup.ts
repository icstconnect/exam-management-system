import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'exam_db',
});

async function setupDatabase() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql')).toString();
    await pool.query(schemaSql);
    console.log('Database schema executed successfully.');

    // Insert mock students
    console.log('Inserting mock students...');
    await pool.query(`
      INSERT INTO students (student_id, name, phone_no, class, batch)
      VALUES 
      ('001', 'Rahul Kumar', '9876543210', 'Class 5', 'V,VI Batch 1'),
      ('002', 'Aisha Khan', '9876543211', 'Class 6', 'V,VI Batch 1'),
      ('003', 'Rohan Das', '9876543212', 'Class 8', 'VIII,IX Batch - 1')
      ON CONFLICT (student_id) DO NOTHING
    `);

    // Insert mock exam
    console.log('Inserting mock exams...');
    const examRes = await pool.query(`
      INSERT INTO exams (title, duration_minutes, target_batch, status, full_marks)
      VALUES ('Mid Term Mathematics', 60, 'V,VI Batch 1', 'CREATED', 50)
      RETURNING exam_id
    `);
    const examId = examRes.rows[0].exam_id;

    // Insert mock section
    console.log('Inserting mock exam sections...');
    const sectionRes = await pool.query(`
      INSERT INTO exam_sections (exam_id, title, section_marks, section_type)
      VALUES ($1, 'Multiple Choice Questions', 50, 'MCQ')
      RETURNING section_id
    `, [examId]);
    const sectionId = sectionRes.rows[0].section_id;

    // Insert mock questions
    console.log('Inserting mock questions...');
    await pool.query(`
      INSERT INTO questions (exam_id, section_id, question_type, question_text_en, question_text_bn, options_json, correct_answer, marks)
      VALUES 
      ($1, $2, 'MCQ', 'What is 5 + 7?', '৫ + ৭ কত?', '["10", "11", "12", "13"]', '12', 25),
      ($1, $2, 'MCQ', 'What is 8 * 9?', '৮ * ৯ কত?', '["64", "72", "81", "90"]', '72', 25)
    `, [examId, sectionId]);

    console.log('Mock data inserted successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  }
}

setupDatabase();
