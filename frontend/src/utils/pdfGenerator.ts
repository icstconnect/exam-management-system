import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Escapes HTML entities to prevent XSS and rendering breakages.
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
 * Strips difficulty tags like [Theoretical - Easy] from strings.
 */
export function stripDifficultyTags(input: string): string {
  if (!input) return '';
  return input.replace(/^\s*\[[^\]]+\]\s*/gi, '');
}

/**
 * Strips LaTeX math dollar delimiters ($...$)
 */
export function cleanMathDollars(input: string): string {
  if (!input) return '';
  return input
    .replace(/\$\(r_1,\s*c_1\)\$/g, '(r1, c1)')
    .replace(/\$\(r_2,\s*c_2\)\$/g, '(r2, c2)')
    .replace(/\$\(r1,\s*c1\)\$/g, '(r1, c1)')
    .replace(/\$\(r2,\s*c2\)\$/g, '(r2, c2)')
    .replace(/\$\(r,\s*c\)\$/g, '(r, c)')
    .replace(/\$([+-]?\d+)\$/g, '$1')
    .replace(/\$([^\$]+)\$/g, '$1');
}

/**
 * Cleans question text by removing difficulty tags and duplicate question numbers (e.g. "13. What is...").
 */
export function cleanQuestionText(input: string): string {
  if (!input) return '';
  let text = stripDifficultyTags(input);
  text = text.replace(/^\s*(?:Q\s*\d+[\.\)\:\-]\s*|\d+[\.\)\:\-]\s*)/i, '');
  return cleanMathDollars(text).trim();
}

/**
 * Strips duplicate option prefixes like "A) ", "A. ", "(A) ", "A - "
 */
export function stripOptionPrefix(input: string): string {
  if (!input) return '';
  const cleaned = cleanMathDollars(input);
  return cleaned.replace(/^\s*[\(\[]?[A-Da-d1-4][\.\)\:\-\]\s]\s*/, '').trim();
}

/**
 * Page-aware PDF builder that creates discrete A4 page containers,
 * measures heights dynamically to prevent any question slicing across page breaks,
 * and renders high-DPI canvases into jsPDF.
 */
async function generateMultiPagePdf(
  buildPagesFn: (stagingHost: HTMLElement) => HTMLElement[],
  filename: string
): Promise<void> {
  const stagingHost = document.createElement('div');
  stagingHost.style.position = 'fixed';
  stagingHost.style.left = '-9999px';
  stagingHost.style.top = '0';
  stagingHost.style.zIndex = '-1000';
  document.body.appendChild(stagingHost);

  try {
    const pageElements = buildPagesFn(stagingHost);
    if (pageElements.length === 0) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(filename);
  } finally {
    if (document.body.contains(stagingHost)) {
      document.body.removeChild(stagingHost);
    }
  }
}

/**
 * Creates an A4 page container element with fixed A4 dimensions at 96 DPI.
 */
function createA4Page(pageNumber: number): HTMLElement {
  const page = document.createElement('div');
  page.style.width = '794px';
  page.style.height = '1123px';
  page.style.backgroundColor = '#ffffff';
  page.style.color = '#1e293b';
  page.style.fontFamily = "'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif";
  page.style.padding = '32px 38px 28px 38px';
  page.style.boxSizing = 'border-box';
  page.style.position = 'relative';
  page.style.display = 'flex';
  page.style.flexDirection = 'column';
  page.style.justifyContent = 'space-between';
  page.style.overflow = 'hidden';
  page.setAttribute('data-page-number', String(pageNumber));
  return page;
}

/**
 * Creates running footer with page number
 */
function createPageFooter(pageNumber: number, totalPages: number): string {
  return `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #64748b; font-weight: 600;">
      <span>Institute of Computer Science &amp; Technology Chowberia</span>
      <span>Page ${pageNumber} of ${totalPages}</span>
      <span>Examination Management System</span>
    </div>
  `;
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
  const filename = `${data.exam.title.replace(/\s+/g, '_')}_Question_Paper_With_Answers.pdf`;

  await generateMultiPagePdf((stagingHost) => {
    // 1. Prepare items to place: Sections and Questions
    interface RenderItem {
      type: 'section_header' | 'question';
      html: string;
    }

    const items: RenderItem[] = [];
    let qCounter = 1;

    (data.sections || []).forEach(sec => {
      items.push({
        type: 'section_header',
        html: `
          <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 6px 12px; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; border-radius: 0 6px 6px 0; margin-top: 12px; margin-bottom: 10px;">
            SECTION: ${escapeHtml(sec.title)} (${escapeHtml(sec.section_type)}) — ${sec.section_marks} Marks
          </div>
        `
      });

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
            const rawText = typeof opt === 'object' && opt !== null ? opt.text : opt;
            const rawId = typeof opt === 'object' && opt !== null ? opt.id : opt;
            const cleanText = stripOptionPrefix(rawText);
            const isCorrect = q.correct_answer === rawId || q.correct_answer === rawText || q.correct_answer === cleanText;
            const label = String.fromCharCode(65 + optIdx);

            return `
              <div style="padding: 4.5px 8px; margin-bottom: 3.5px; border-radius: 6px; font-size: 11.5px; line-height: 1.35; display: flex; align-items: center; justify-content: space-between; ${
                isCorrect
                  ? 'background-color: #ecfdf5; border: 1px solid #10b981; color: #047857; font-weight: 700;'
                  : 'background-color: #f8fafc; border: 1px solid #e2e8f0; color: #334155; font-weight: 500;'
              }">
                <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
                  <span style="font-weight: 800; color: ${isCorrect ? '#047857' : '#64748b'};">(${label})</span>
                  <span>${escapeHtml(cleanText)}</span>
                </div>
                ${isCorrect ? '<span style="font-size: 9.5px; font-weight: 800; background: #059669; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px; flex-shrink: 0;">✓ CORRECT ANSWER</span>' : ''}
              </div>
            `;
          }).join('');

          optionsHtml = `<div style="margin-top: 6px; margin-left: 14px;">${optsList}</div>`;
        } else if (q.question_type === 'FITB') {
          optionsHtml = `
            <div style="margin-top: 6px; margin-left: 14px; padding: 5px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 11.5px; color: #047857; font-weight: 700;">
              <b>Correct Blanks:</b> ${escapeHtml(q.correct_answer || '(None)')}
            </div>
          `;
        } else if (q.question_type === 'MATCH') {
          optionsHtml = `
            <div style="margin-top: 6px; margin-left: 14px; padding: 5px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 11.5px; color: #047857; font-weight: 700;">
              <b>Correct Matching:</b> ${escapeHtml(q.correct_answer || '(None)')}
            </div>
          `;
        }

        const qEnText = cleanQuestionText(q.question_text_en);
        const qBnText = q.question_text_bn ? cleanQuestionText(q.question_text_bn) : '';

        items.push({
          type: 'question',
          html: `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; line-height: 1.4; flex: 1;">
                  <span style="color: #2563eb; margin-right: 4px;">Q${qCounter}.</span> ${escapeHtml(qEnText)}
                </div>
                <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 1.5px 6px; border-radius: 4px; white-space: nowrap; margin-left: 8px; flex-shrink: 0;">
                  [ Marks: ${q.marks || 1} ]
                </span>
              </div>

              ${
                qBnText
                  ? `<div style="font-size: 12px; color: #475569; margin-top: 3px; margin-left: 20px; line-height: 1.4;">(বাংলা): ${escapeHtml(qBnText)}</div>`
                  : ''
              }

              ${optionsHtml}
            </div>
          `
        });
        qCounter++;
      });
    });

    // 2. Measure heights and build discrete pages
    const mainHeaderHtml = `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <h1 style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          INSTITUTE OF COMPUTER SCIENCE &amp; TECHNOLOGY CHOWBERIA
        </h1>
        <h2 style="font-size: 12.5px; font-weight: 800; color: #2563eb; margin: 3px 0 0 0;">
          TEACHER QUESTION PAPER WITH ANSWER KEY
        </h2>
        <p style="font-size: 11px; font-weight: 700; color: #475569; margin: 2px 0 0 0;">
          Examination: ${escapeHtml(data.exam.title)}
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #334155;">
        <div><b>Duration:</b> ${data.exam.duration_minutes} Minutes</div>
        <div><b>Full Marks:</b> ${data.exam.full_marks}</div>
        <div><b>Batch:</b> ${escapeHtml(data.exam.target_batch || 'All Batches')}</div>
      </div>
    `;

    const subHeaderHtml = `
      <div style="border-bottom: 1.5px solid #2563eb; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
        <span>ICST Chowberia — Teacher Question Paper</span>
        <span style="color: #2563eb;">${escapeHtml(data.exam.title)}</span>
      </div>
    `;

    // Measurer wrapper in staging host
    const measurer = document.createElement('div');
    measurer.style.width = '718px'; // 794 - (38*2)
    stagingHost.appendChild(measurer);

    const pages: HTMLElement[] = [];
    let currentPage = createA4Page(1);
    stagingHost.appendChild(currentPage);
    pages.push(currentPage);

    let contentContainer = document.createElement('div');
    contentContainer.style.flex = '1';
    currentPage.appendChild(contentContainer);

    // Initial page has main header
    contentContainer.innerHTML = mainHeaderHtml;

    // Available height budget for content per page: ~1020px
    const MAX_PAGE_CONTENT_HEIGHT = 1010;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Measure item height
      measurer.innerHTML = item.html;
      const itemHeight = measurer.offsetHeight;

      // Check current page content height
      const currentHeight = contentContainer.offsetHeight;

      if (currentHeight + itemHeight > MAX_PAGE_CONTENT_HEIGHT) {
        // Create new page
        currentPage = createA4Page(pages.length + 1);
        stagingHost.appendChild(currentPage);
        pages.push(currentPage);

        contentContainer = document.createElement('div');
        contentContainer.style.flex = '1';
        contentContainer.innerHTML = subHeaderHtml + item.html;
        currentPage.appendChild(contentContainer);
      } else {
        contentContainer.innerHTML += item.html;
      }
    }

    // Add footers to all pages with total page count
    const totalPages = pages.length;
    pages.forEach((p, pIdx) => {
      const footer = document.createElement('div');
      footer.innerHTML = createPageFooter(pIdx + 1, totalPages);
      p.appendChild(footer);
    });

    return pages;
  }, filename);
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
  const rollNumber = `NYSDB01400${String(data.student.student_id).padStart(3, '0')}`;
  const filename = `${data.student.name.replace(/\s+/g, '_')}_Question_Paper.pdf`;

  await generateMultiPagePdf((stagingHost) => {
    interface RenderItem {
      type: 'section_header' | 'question';
      html: string;
    }

    const items: RenderItem[] = [];
    let currentSecTitle = '';

    (data.questions || []).forEach((q, idx) => {
      if (q.section_title && q.section_title !== currentSecTitle) {
        currentSecTitle = q.section_title;
        items.push({
          type: 'section_header',
          html: `
            <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 6px 12px; font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; border-radius: 0 6px 6px 0; margin-top: 12px; margin-bottom: 10px;">
              SECTION: ${escapeHtml(currentSecTitle)}
            </div>
          `
        });
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
          const rawText = typeof opt === 'object' && opt !== null ? opt.text : opt;
          const rawId = typeof opt === 'object' && opt !== null ? opt.id : opt;
          const cleanText = stripOptionPrefix(rawText);
          const isStudentChosen = q.student_answer === rawId || q.student_answer === rawText || q.student_answer === cleanText;
          const label = String.fromCharCode(65 + optIdx);

          return `
            <div style="padding: 4.5px 8px; margin-bottom: 3.5px; border-radius: 6px; font-size: 11.5px; line-height: 1.35; display: flex; align-items: center; justify-content: space-between; ${
              isStudentChosen
                ? 'background-color: #eff6ff; border: 1.5px solid #3b82f6; color: #1d4ed8; font-weight: 700;'
                : 'background-color: #f8fafc; border: 1px solid #e2e8f0; color: #334155; font-weight: 500;'
            }">
              <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
                <span style="font-weight: 800; color: ${isStudentChosen ? '#1d4ed8' : '#64748b'};">(${label})</span>
                <span>${escapeHtml(cleanText)}</span>
              </div>
              ${isStudentChosen ? '<span style="font-size: 9.5px; font-weight: 800; background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px; flex-shrink: 0;">YOUR ANSWER</span>' : ''}
            </div>
          `;
        }).join('');

        optionsHtml = `<div style="margin-top: 6px; margin-left: 14px;">${optsList}</div>`;
      } else if (q.question_type === 'FITB') {
        optionsHtml = `
          <div style="margin-top: 6px; margin-left: 14px; padding: 5px 10px; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; font-size: 11.5px; color: #1d4ed8; font-weight: 700;">
            <b>Your Submitted Blanks:</b> ${escapeHtml(q.student_answer || '(Left Blank)')}
          </div>
        `;
      } else if (q.question_type === 'MATCH') {
        optionsHtml = `
          <div style="margin-top: 6px; margin-left: 14px; padding: 5px 10px; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; font-size: 11.5px; color: #1d4ed8; font-weight: 700;">
            <b>Your Matching Pairs:</b> ${escapeHtml(q.student_answer || '(No match)')}
          </div>
        `;
      }

      const qEnText = cleanQuestionText(q.question_text_en);
      const qBnText = q.question_text_bn ? cleanQuestionText(q.question_text_bn) : '';

      items.push({
        type: 'question',
        html: `
          <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; line-height: 1.4; flex: 1;">
                <span style="color: #2563eb; margin-right: 4px;">${idx + 1}.</span> ${escapeHtml(qEnText)}
              </div>
              <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 1.5px 6px; border-radius: 4px; white-space: nowrap; margin-left: 8px; flex-shrink: 0;">
                [ Marks: ${q.marks || 1} ]
              </span>
            </div>

            ${
              qBnText
                ? `<div style="font-size: 12px; color: #475569; margin-top: 3px; margin-left: 20px; line-height: 1.4;">(বাংলা): ${escapeHtml(qBnText)}</div>`
                : ''
            }

            ${optionsHtml}
          </div>
        `
      });
    });

    const mainHeaderHtml = `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <h1 style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          INSTITUTE OF COMPUTER SCIENCE &amp; TECHNOLOGY CHOWBERIA
        </h1>
        <h2 style="font-size: 12.5px; font-weight: 800; color: #2563eb; margin: 3px 0 0 0;">
          STUDENT EXAMINATION COPY &amp; SUBMITTED ANSWERS
        </h2>
        <p style="font-size: 11px; font-weight: 700; color: #475569; margin: 2px 0 0 0;">
          ${escapeHtml(data.student.exam_title)}
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 11px; color: #334155;">
          <div><b>Student Name:</b> ${escapeHtml(data.student.name)}</div>
          <div><b>Exam Roll:</b> <span style="font-family: monospace; font-weight: 800;">${rollNumber}</span></div>
          <div><b>Class:</b> ${escapeHtml(data.student.class || 'N/A')}</div>
          <div><b>Batch:</b> ${escapeHtml(data.student.batch || 'Standard')}</div>
          <div><b>Full Marks:</b> ${data.student.full_marks || '100'}</div>
          <div><b>Duration:</b> ${data.student.duration_minutes || 60} Mins</div>
        </div>
      </div>
    `;

    const subHeaderHtml = `
      <div style="border-bottom: 1.5px solid #2563eb; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
        <span>ICST Chowberia — Student Examination Copy</span>
        <span style="color: #2563eb;">${escapeHtml(data.student.name)} (${rollNumber})</span>
      </div>
    `;

    const measurer = document.createElement('div');
    measurer.style.width = '718px';
    stagingHost.appendChild(measurer);

    const pages: HTMLElement[] = [];
    let currentPage = createA4Page(1);
    stagingHost.appendChild(currentPage);
    pages.push(currentPage);

    let contentContainer = document.createElement('div');
    contentContainer.style.flex = '1';
    currentPage.appendChild(contentContainer);

    contentContainer.innerHTML = mainHeaderHtml;

    const MAX_PAGE_CONTENT_HEIGHT = 1010;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      measurer.innerHTML = item.html;
      const itemHeight = measurer.offsetHeight;
      const currentHeight = contentContainer.offsetHeight;

      if (currentHeight + itemHeight > MAX_PAGE_CONTENT_HEIGHT) {
        currentPage = createA4Page(pages.length + 1);
        stagingHost.appendChild(currentPage);
        pages.push(currentPage);

        contentContainer = document.createElement('div');
        contentContainer.style.flex = '1';
        contentContainer.innerHTML = subHeaderHtml + item.html;
        currentPage.appendChild(contentContainer);
      } else {
        contentContainer.innerHTML += item.html;
      }
    }

    const totalPages = pages.length;
    pages.forEach((p, pIdx) => {
      const footer = document.createElement('div');
      footer.innerHTML = createPageFooter(pIdx + 1, totalPages);
      p.appendChild(footer);
    });

    return pages;
  }, filename);
}
