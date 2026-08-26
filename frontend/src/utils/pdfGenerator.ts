import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Escapes HTML entities to prevent rendering issues.
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to render an HTML container into a multi-page A4 PDF.
 */
async function renderHtmlToPdf(container: HTMLElement, filename: string): Promise<void> {
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Generates the Teacher Question Paper with Answer Key PDF.
 */
export async function downloadTeacherQuestionPaperPdf(data: {
  exam: {
    title: string;
    duration_minutes: number;
    full_marks: number;
    target_batch?: string;
  };
  sections: Array<{
    section_id: string;
    title: string;
    section_type: string;
    section_marks: number;
    questions: Array<{
      question_id: string;
      question_type: string;
      question_text_en: string;
      question_text_bn?: string;
      options_json?: any;
      correct_answer?: string;
      marks: number;
    }>;
  }>;
}): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = "'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';

  let sectionsHtml = '';
  let qCounter = 1;

  (data.sections || []).forEach(sec => {
    let questionsHtml = '';
    (sec.questions || []).forEach(q => {
      let optionsHtml = '';
      let parsedOpts: any[] = [];
      try {
        parsedOpts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
      } catch (e) {
        parsedOpts = [];
      }

      if (q.question_type === 'MCQ' || q.question_type === 'TF') {
        const opts = Array.isArray(parsedOpts) ? parsedOpts : (q.question_type === 'TF' ? ['True', 'False'] : []);
        const optsList = opts.map((opt: any, optIdx: number) => {
          const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
          const optId = typeof opt === 'object' && opt !== null ? opt.id : opt;
          const isCorrect = q.correct_answer === optId || q.correct_answer === optText;
          const label = String.fromCharCode(65 + optIdx);

          return `
            <div style="padding: 4px 8px; margin-bottom: 4px; border-radius: 6px; font-size: 12.5px; ${
              isCorrect
                ? 'background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-weight: 700;'
                : 'background-color: #f8fafc; border: 1px solid #f1f5f9; color: #334155;'
            }">
              <span style="font-weight: 800; margin-right: 6px;">(${label})</span> ${escapeHtml(optText)}
              ${isCorrect ? '<span style="margin-left: 8px; font-size: 11px; background: #059669; color: white; padding: 1px 6px; border-radius: 4px;">CORRECT ANSWER</span>' : ''}
            </div>
          `;
        }).join('');

        optionsHtml = `<div style="margin-top: 8px; margin-left: 18px;">${optsList}</div>`;
      } else if (q.question_type === 'FITB') {
        optionsHtml = `
          <div style="margin-top: 8px; margin-left: 18px; padding: 6px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 12.5px; color: #047857; font-weight: 700;">
            <b>Correct Blanks:</b> ${escapeHtml(q.correct_answer || '(None)')}
          </div>
        `;
      } else if (q.question_type === 'MATCH') {
        optionsHtml = `
          <div style="margin-top: 8px; margin-left: 18px; padding: 6px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 12.5px; color: #047857; font-weight: 700;">
            <b>Correct Matching:</b> ${escapeHtml(q.correct_answer || '(None)')}
          </div>
        `;
      }

      questionsHtml += `
        <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px dashed #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; line-height: 1.45;">
              <span style="color: #2563eb; margin-right: 4px;">Q${qCounter}.</span> ${escapeHtml(q.question_text_en)}
            </div>
            <span style="font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-left: 8px;">
              [ Marks: ${q.marks} ]
            </span>
          </div>

          ${
            q.question_text_bn && q.question_text_bn.trim() !== ''
              ? `<div style="font-size: 13px; color: #475569; margin-top: 4px; margin-left: 24px; line-height: 1.45;">(বাংলা): ${escapeHtml(q.question_text_bn)}</div>`
              : ''
          }

          ${optionsHtml}
        </div>
      `;
      qCounter++;
    });

    sectionsHtml += `
      <div style="margin-top: 24px; margin-bottom: 12px;">
        <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 6px 12px; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; border-radius: 0 6px 6px 0; margin-bottom: 14px;">
          SECTION: ${escapeHtml(sec.title)} (${escapeHtml(sec.section_type)}) — ${sec.section_marks} Marks
        </div>
        ${questionsHtml}
      </div>
    `;
  });

  container.innerHTML = `
    <div>
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          INSTITUTE OF COMPUTER SCIENCE &amp; TECHNOLOGY CHOWBERIA
        </h1>
        <h2 style="font-size: 14px; font-weight: 800; color: #2563eb; margin: 4px 0 0 0;">
          TEACHER QUESTION PAPER WITH ANSWER KEY
        </h2>
        <p style="font-size: 12px; font-weight: 700; color: #475569; margin: 4px 0 0 0;">
          Examination: ${escapeHtml(data.exam.title)}
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #334155;">
        <div><b>Duration:</b> ${data.exam.duration_minutes} Minutes</div>
        <div><b>Full Marks:</b> ${data.exam.full_marks}</div>
        <div><b>Batch:</b> ${escapeHtml(data.exam.target_batch || 'All Batches')}</div>
      </div>

      <div>
        ${sectionsHtml}
      </div>
    </div>
  `;

  const filename = `${data.exam.title.replace(/\s+/g, '_')}_Question_Paper_With_Answers.pdf`;
  await renderHtmlToPdf(container, filename);
}

/**
 * Generates the Student Examination Copy & Submitted Answers PDF.
 */
export async function downloadStudentQuestionPaperPdf(data: {
  student: {
    name: string;
    student_id: string;
    class?: string;
    batch?: string;
    exam_title: string;
    full_marks?: number;
    duration_minutes?: number;
  };
  questions: Array<{
    question_id: string;
    section_id: string;
    section_title?: string;
    question_type: string;
    question_text_en: string;
    question_text_bn?: string;
    options_json?: any;
    student_answer?: string;
    marks: number;
  }>;
}): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = "'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';

  let currentSecTitle = '';
  let questionsHtml = '';

  (data.questions || []).forEach((q, idx) => {
    let sectionHeaderHtml = '';
    if (q.section_title && q.section_title !== currentSecTitle) {
      currentSecTitle = q.section_title;
      sectionHeaderHtml = `
        <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 6px 12px; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; border-radius: 0 6px 6px 0; margin-top: 20px; margin-bottom: 14px;">
          SECTION: ${escapeHtml(currentSecTitle)}
        </div>
      `;
    }

    let optionsHtml = '';
    let parsedOpts: any[] = [];
    try {
      parsedOpts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
    } catch (e) {
      parsedOpts = [];
    }

    if (q.question_type === 'MCQ' || q.question_type === 'TF') {
      const opts = Array.isArray(parsedOpts) ? parsedOpts : (q.question_type === 'TF' ? ['True', 'False'] : []);
      const optsList = opts.map((opt: any, optIdx: number) => {
        const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
        const optId = typeof opt === 'object' && opt !== null ? opt.id : opt;
        const isStudentChosen = q.student_answer === optId || q.student_answer === optText;
        const label = String.fromCharCode(65 + optIdx);

        return `
          <div style="padding: 4px 8px; margin-bottom: 4px; border-radius: 6px; font-size: 12.5px; ${
            isStudentChosen
              ? 'background-color: #eff6ff; border: 1.5px solid #3b82f6; color: #1d4ed8; font-weight: 700;'
              : 'background-color: #f8fafc; border: 1px solid #f1f5f9; color: #334155;'
          }">
            <span style="font-weight: 800; margin-right: 6px;">(${label})</span> ${escapeHtml(optText)}
            ${isStudentChosen ? '<span style="margin-left: 8px; font-size: 11px; background: #2563eb; color: white; padding: 1px 6px; border-radius: 4px;">YOUR ANSWER</span>' : ''}
          </div>
        `;
      }).join('');

      optionsHtml = `<div style="margin-top: 8px; margin-left: 18px;">${optsList}</div>`;
    } else if (q.question_type === 'FITB') {
      optionsHtml = `
        <div style="margin-top: 8px; margin-left: 18px; padding: 6px 10px; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; font-size: 12.5px; color: #1d4ed8; font-weight: 700;">
          <b>Your Submitted Blanks:</b> ${escapeHtml(q.student_answer || '(Left Blank)')}
        </div>
      `;
    } else if (q.question_type === 'MATCH') {
      optionsHtml = `
        <div style="margin-top: 8px; margin-left: 18px; padding: 6px 10px; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; font-size: 12.5px; color: #1d4ed8; font-weight: 700;">
          <b>Your Matching Pairs:</b> ${escapeHtml(q.student_answer || '(No match)')}
        </div>
      `;
    }

    questionsHtml += `
      ${sectionHeaderHtml}
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px dashed #e2e8f0;">
        <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; line-height: 1.45;">
          <span style="color: #2563eb; margin-right: 4px;">${idx + 1}.</span> ${escapeHtml(q.question_text_en)}
        </div>

        ${
          q.question_text_bn && q.question_text_bn.trim() !== ''
            ? `<div style="font-size: 13px; color: #475569; margin-top: 4px; margin-left: 20px; line-height: 1.45;">(বাংলা): ${escapeHtml(q.question_text_bn)}</div>`
            : ''
        }

        ${optionsHtml}
      </div>
    `;
  });

  const rollNumber = `NYSDB01400${String(data.student.student_id).padStart(3, '0')}`;

  container.innerHTML = `
    <div>
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          INSTITUTE OF COMPUTER SCIENCE &amp; TECHNOLOGY CHOWBERIA
        </h1>
        <h2 style="font-size: 14px; font-weight: 800; color: #2563eb; margin: 4px 0 0 0;">
          STUDENT EXAMINATION COPY &amp; SUBMITTED ANSWERS
        </h2>
        <p style="font-size: 12px; font-weight: 700; color: #475569; margin: 4px 0 0 0;">
          ${escapeHtml(data.student.exam_title)}
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12.5px; color: #334155;">
          <div><b>Student Name:</b> ${escapeHtml(data.student.name)}</div>
          <div><b>Examination:</b> ${escapeHtml(data.student.exam_title)}</div>
          <div><b>Exam Roll:</b> <span style="font-family: monospace; font-weight: 800;">${rollNumber}</span></div>
          <div><b>Class:</b> ${escapeHtml(data.student.class || 'N/A')}</div>
          <div><b>Batch:</b> ${escapeHtml(data.student.batch || 'Standard')}</div>
          <div><b>Full Marks:</b> ${data.student.full_marks || '100'}</div>
        </div>
      </div>

      <div>
        ${questionsHtml}
      </div>
    </div>
  `;

  const filename = `${data.student.name.replace(/\s+/g, '_')}_Question_Paper.pdf`;
  await renderHtmlToPdf(container, filename);
}
