import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket, API_BASE } from '../App';
import { Languages, AlertTriangle, Clock, CheckCircle2, ChevronRight, X, Download, BookOpen, User, HelpCircle, Check, Sparkles, Award } from 'lucide-react';
import jsPDF from 'jspdf';
import { setupBengaliUnicodeFont } from '../utils/pdfFontHelper';
import { MatchQuestionViewer } from '../components/MatchQuestionViewer';
import QuestionTextRenderer, { cleanMathDollars } from '../components/QuestionTextRenderer';

interface Section {
  section_id: string;
  title: string;
  section_type: 'MCQ' | 'FITB' | 'TF' | 'MATCH';
  section_marks: number;
}

interface Question {
  question_id: string;
  section_id: string;
  question_type: 'MCQ' | 'FITB' | 'TF' | 'MATCH';
  question_text_en: string;
  question_text_bn: string;
  options_json: string[];
  marks?: number;
}

interface WaitingInfo {
  student_id: string;
  exam_roll: string;
  name: string;
  batch: string;
  class: string;
  exam_title: string;
  duration_minutes: number;
  full_marks: number;
  total_questions: number;
  total_sections: number;
  sections: Array<{
    section_id: string;
    title: string;
    section_type: string;
    section_marks: number;
    question_count: number;
    avg_marks_per_question: number;
  }>;
}

export default function ExamWorkspace() {
  const { session_id } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'LOADING' | 'WAITING' | 'STARTED' | 'PAUSED' | 'COMPLETED' | 'ERROR'>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [waitingInfo, setWaitingInfo] = useState<WaitingInfo | null>(null);

  useEffect(() => {
    document.title = "Examination Portal - ICST";
  }, []);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Normal answers (MCQ/TF) + JSON strings for FITB/MATCH
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Interactive FITB mapping: qId -> blankIdx -> option
  const [fitbAnswers, setFitbAnswers] = useState<Record<string, Record<number, string>>>({});
  const [shuffledBanks, setShuffledBanks] = useState<Record<string, string[]>>({});
  const [activeBlank, setActiveBlank] = useState<{ qId: string; bIdx: number } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Fetch waiting screen dynamic info
  useEffect(() => {
    if (!session_id) return;
    fetch(`${API_BASE}/api/student-sessions/${session_id}/waiting-info`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setWaitingInfo(data);
      })
      .catch(console.error);
  }, [session_id]);

  useEffect(() => {
    if (!session_id) {
      navigate('/');
      return;
    }

    socket.emit('workspace_ready', { session_id });

    socket.on('exam_waiting', () => {
      setStatus('WAITING');
    });

    socket.on('session_error', (data: { message: string }) => {
      setErrorMessage(data.message || 'Session error');
      setStatus('ERROR');
    });

    socket.on('exam_started', (data: { questions: Question[], sections: Section[], seconds_left: number, previous_answers: Record<string, string> }) => {
      let fetchedQuestions = data.questions || [];
      let fetchedSections = data.sections || [];
      
      const sectionIds = new Set(fetchedSections.map(s => s.section_id));
      
      // Auto-generate synthetic sections for unmapped questions
      const unmapped = fetchedQuestions.filter(q => !q.section_id || !sectionIds.has(q.section_id));
      if (unmapped.length > 0) {
         const unmappedMCQ = unmapped.filter(q => q.question_type !== 'FITB');
         const unmappedFITB = unmapped.filter(q => q.question_type === 'FITB');
         
         if (unmappedMCQ.length > 0) {
            fetchedSections.push({
               section_id: 'default_mcq',
               title: 'General Questions',
               section_type: 'MCQ',
               section_marks: 0
            });
         }
         
         if (unmappedFITB.length > 0) {
            fetchedSections.push({
               section_id: 'default_fitb',
               title: 'Fill in the Blanks',
               section_type: 'FITB',
               section_marks: 0
            });
         }
         
         fetchedQuestions = fetchedQuestions.map(q => {
            if (!q.section_id || !sectionIds.has(q.section_id)) {
               return {
                  ...q,
                  section_id: q.question_type === 'FITB' ? 'default_fitb' : 'default_mcq'
               };
            }
            return q;
         });
      }

      setQuestions(fetchedQuestions);
      setSections(fetchedSections);
      setSecondsLeft(data.seconds_left);
      
      const parsedFitb: Record<string, Record<number, string>> = {};
      const newAnswers = data.previous_answers || {};
      
      fetchedQuestions.forEach(q => {
        if (q.question_type === 'FITB' && newAnswers[q.question_id]) {
          try {
            const arr = JSON.parse(newAnswers[q.question_id]);
            parsedFitb[q.question_id] = {};
            arr.forEach((ans: string, idx: number) => {
              if (ans) parsedFitb[q.question_id][idx] = ans;
            });
          } catch(e) {}
        }
      });
      
      setFitbAnswers(parsedFitb);
      setAnswers(newAnswers);
      setStatus('STARTED');
    });

    socket.on('exam_paused', () => setStatus('PAUSED'));
    socket.on('exam_resumed', () => setStatus('STARTED'));
    socket.on('exam_completed', () => setStatus('COMPLETED'));
    socket.on('exam_ended', () => {
      setStatus('COMPLETED');
    });
    socket.on('time_tick', (data: { seconds_left: number }) => {
      if (typeof data.seconds_left === 'number') {
        const remaining = Math.max(0, data.seconds_left);
        setSecondsLeft(remaining);
        if (remaining === 0) {
          socket.emit('student_submit_exam', { session_id });
          setStatus('COMPLETED');
        }
      }
    });

    return () => {
      socket.off('exam_waiting');
      socket.off('exam_started');
      socket.off('exam_paused');
      socket.off('exam_resumed');
      socket.off('exam_completed');
      socket.off('exam_ended');
      socket.off('session_error');
      socket.off('time_tick');
    };
  }, [session_id, navigate]);

  // Build answer banks for FITB sections
  useEffect(() => {
    if (sections.length > 0 && questions.length > 0 && Object.keys(shuffledBanks).length === 0) {
      const banks: Record<string, string[]> = {};
      sections.filter(s => s.section_type === 'FITB').forEach(sec => {
        const secQs = questions.filter(q => q.section_id === sec.section_id);
        let allOpts: string[] = [];
        secQs.forEach(q => allOpts = allOpts.concat(q.options_json || []));
        const uniqueOpts = Array.from(new Set(allOpts));
        
        for (let i = uniqueOpts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [uniqueOpts[i], uniqueOpts[j]] = [uniqueOpts[j], uniqueOpts[i]];
        }
        banks[sec.section_id] = uniqueOpts;
      });
      setShuffledBanks(banks);
    }
  }, [sections, questions]);

  useEffect(() => {
    if (status !== 'STARTED') return;

    const handleVisibilityChange = () => {
      if (document.hidden && status === 'STARTED') {
        socket.emit('tab_violation', { session_id });
        setStatus('PAUSED');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, session_id]);

  const questionsBySection = useMemo(() => {
    const grouped: Record<string, Question[]> = {};
    sections.forEach(s => grouped[s.section_id] = []);
    questions.forEach(q => {
      if (grouped[q.section_id]) grouped[q.section_id].push(q);
    });
    return grouped;
  }, [questions, sections]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentSection = useMemo(() => {
    if (!currentQuestion) return null;
    return sections.find(s => s.section_id === currentQuestion.section_id) || null;
  }, [currentQuestion, sections]);

  useEffect(() => {
    setActiveBlank(null);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (question_id: string, option: string) => {
    setAnswers(prev => ({ ...prev, [question_id]: option }));
    socket.emit('submit_answer', { session_id, question_id, selected_option: option });
  };

  const getFitbOptionText = (optionId: string | null | undefined) => {
    if (!optionId) return '';
    for (const xq of questions) {
      let options: any = [];
      try {
        options = typeof xq.options_json === 'string' ? JSON.parse(xq.options_json) : xq.options_json;
      } catch (e) {
        options = xq.options_json;
      }
      if (Array.isArray(options)) {
        const found = options.find((opt: any) => opt && (opt.id === optionId || opt.text === optionId));
        if (found) return found.text;
      }
    }
    return optionId;
  };

  const getOptionUsage = (optionId: string) => {
    if (!currentSection) return null;
    const secQs = questionsBySection[currentSection.section_id] || [];
    for (const q of secQs) {
      const qId = q.question_id;
      const mapping = fitbAnswers[qId] || {};
      for (const [bIdxStr, assignedOpt] of Object.entries(mapping)) {
        if (assignedOpt === optionId) {
          const qIndex = questions.findIndex(xq => xq.question_id === qId);
          return { qId, bIdx: parseInt(bIdxStr), qIndex };
        }
      }
    }
    return null;
  };

  const clearBlank = (qId: string, bIdx: number) => {
    const newFitb = { ...fitbAnswers };
    newFitb[qId] = { ...newFitb[qId] };
    delete newFitb[qId][bIdx];
    setFitbAnswers(newFitb);

    const newAnswers = { ...answers };
    const q = questions.find(x => x.question_id === qId);
    if (q) {
      const partsEn = getLocalizedText(q.question_text_en, q.question_text_bn, lang).split(/_{2,}/);
      const numBlanks = partsEn.length - 1;
      const arr = [];
      for (let i = 0; i < numBlanks; i++) {
        arr.push(newFitb[qId]?.[i] || '');
      }
      const jsonStr = JSON.stringify(arr);
      newAnswers[qId] = jsonStr;
      socket.emit('submit_answer', { session_id, question_id: qId, selected_option: jsonStr });
    }
    setAnswers(newAnswers);
  };

  const handleBankOptionClick = (option: string) => {
    if (!activeBlank) return;
    const usage = getOptionUsage(option);
    
    const newFitb = { ...fitbAnswers };
    const { qId, bIdx } = activeBlank;
    
    if (usage) {
      newFitb[usage.qId] = { ...newFitb[usage.qId] };
      delete newFitb[usage.qId][usage.bIdx];
    }
    
    newFitb[qId] = { ...newFitb[qId], [bIdx]: option };
    setFitbAnswers(newFitb);
    
    const updatedQs = new Set([qId]);
    if (usage) updatedQs.add(usage.qId);
    
    const newAnswers = { ...answers };
    updatedQs.forEach(id => {
      const q = questions.find(x => x.question_id === id);
      if (q) {
        const partsEn = getLocalizedText(q.question_text_en, q.question_text_bn, lang).split(/_{2,}/);
        const numBlanks = partsEn.length - 1;
        const arr = [];
        for (let i = 0; i < numBlanks; i++) {
          arr.push(newFitb[id]?.[i] || '');
        }
        const jsonStr = JSON.stringify(arr);
        newAnswers[id] = jsonStr;
        socket.emit('submit_answer', { session_id, question_id: id, selected_option: jsonStr });
      }
    });
    setAnswers(newAnswers);
    setActiveBlank(null);
  };

  const renderFitbQuestion = (q: Question) => {
    const text = getLocalizedText(q.question_text_en, q.question_text_bn, lang);
    const parts = text.split(/_{2,}/);
    
    return (
      <div className="text-2xl font-semibold text-slate-800 mb-8 mt-2 leading-[3rem]">
        {parts.map((part, idx) => {
          if (idx === parts.length - 1) return <span key={idx}>{part}</span>;
          
          const assignedOpt = fitbAnswers[q.question_id]?.[idx];
          const isActive = activeBlank?.qId === q.question_id && activeBlank?.bIdx === idx;
          
          return (
            <span key={idx}>
              {part}
              <span className="relative inline-block mx-2 translate-y-2">
                <button 
                  onClick={() => setActiveBlank({ qId: q.question_id, bIdx: idx })}
                  className={`min-w-[140px] px-4 py-1.5 pb-2 border-b-4 rounded-t-lg transition-all text-center text-lg font-bold shadow-sm ${
                    isActive 
                      ? 'border-primary-500 bg-primary-100 text-primary-800 ring-2 ring-primary-300 ring-offset-2' 
                      : assignedOpt 
                        ? 'border-slate-400 bg-slate-50 text-slate-700 hover:bg-slate-200 hover:border-slate-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-200 hover:border-slate-400 border-dashed'
                  }`}
                >
                  {assignedOpt ? getFitbOptionText(assignedOpt) : 'Click to select'}
                </button>
                {assignedOpt && isActive && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearBlank(q.question_id, idx);
                    }}
                    className="absolute -top-3 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-md ring-2 ring-white"
                  >
                    <X size={14}/>
                  </button>
                )}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  const handleDownloadStudentQuestionPaper = async () => {
    if (isDownloadingPdf || !session_id) return;
    setIsDownloadingPdf(true);

    try {
      const res = await fetch(`${API_BASE}/api/student-sessions/${session_id}/student-question-paper`);
      if (!res.ok) throw new Error('Failed to fetch student question paper data');
      const data = await res.json();

      const doc = new jsPDF('p', 'mm', 'a4');
      await setupBengaliUnicodeFont(doc);

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFont('NotoSansBengali', 'bold');
      doc.setFontSize(13);
      doc.text("INSTITUTE OF COMPUTER SCIENCE AND TECHNOLOGY CHOWBERIA", pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(`STUDENT EXAMINATION COPY & SUBMITTED ANSWERS`, pageWidth / 2, y, { align: 'center' });
      y += 6;

      // Student Meta Box
      doc.setFontSize(9);
      doc.setFont('NotoSansBengali', 'bold');
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 20, 'FD');
      
      doc.text(`Student Name: ${data.student.name}`, 18, y + 6);
      doc.text(`Exam Roll: NYSDB01400${String(data.student.student_id).padStart(3, '0')}`, 18, y + 12);
      doc.text(`Batch: ${data.student.batch || 'Standard'}`, 18, y + 17);

      doc.text(`Examination: ${data.student.exam_title}`, pageWidth / 2 + 5, y + 6);
      doc.text(`Class: ${data.student.class}`, pageWidth / 2 + 5, y + 12);
      doc.text(`Full Marks: ${data.student.full_marks || '100'}`, pageWidth / 2 + 5, y + 17);
      y += 26;

      let currentSecTitle = '';
      (data.questions || []).forEach((q: any, idx: number) => {
        if (y > 260) { doc.addPage(); y = 15; }

        if (q.section_title && q.section_title !== currentSecTitle) {
          currentSecTitle = q.section_title;
          doc.setFont('NotoSansBengali', 'bold');
          doc.setFontSize(10);
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y - 3, pageWidth - 28, 6, 'F');
          doc.text(`SECTION: ${currentSecTitle.toUpperCase()}`, 16, y + 1.5);
          y += 8;
        }

        doc.setFont('NotoSansBengali', 'bold');
        doc.setFontSize(9.5);
        const qLines = doc.splitTextToSize(`${idx + 1}. ${q.question_text_en}`, pageWidth - 32);
        if (y + (qLines.length * 4.5) > 275) { doc.addPage(); y = 15; }
        doc.text(qLines, 16, y);
        y += qLines.length * 4.5;

        if (q.question_text_bn && q.question_text_bn.trim() !== '') {
          doc.setFont('NotoSansBengali', 'normal');
          const qBnLines = doc.splitTextToSize(`(Bengali): ${q.question_text_bn}`, pageWidth - 32);
          if (y + (qBnLines.length * 4.5) > 275) { doc.addPage(); y = 15; }
          doc.text(qBnLines, 20, y);
          y += qBnLines.length * 4.5;
        }

        // Display Options
        let parsedOpts: any[] = [];
        try {
          parsedOpts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
        } catch(e) { parsedOpts = []; }

        if (q.question_type === 'MCQ' || q.question_type === 'TF') {
          doc.setFont('NotoSansBengali', 'normal');
          doc.setFontSize(8.5);
          const opts = Array.isArray(parsedOpts) ? parsedOpts : (q.question_type === 'TF' ? ['True', 'False'] : []);
          opts.forEach((opt: any, optIdx: number) => {
            const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
            const optId = typeof opt === 'object' && opt !== null ? opt.id : opt;
            const isStudentChosen = q.student_answer === optId || q.student_answer === optText;
            
            if (isStudentChosen) {
              doc.setFont('NotoSansBengali', 'bold');
              doc.setTextColor(30, 64, 175);
            } else {
              doc.setFont('NotoSansBengali', 'normal');
              doc.setTextColor(80, 80, 80);
            }
            const label = String.fromCharCode(65 + optIdx);
            const optLine = `(${label}) ${optText}${isStudentChosen ? ' [ YOUR ANSWER ]' : ''}`;
            const optLines = doc.splitTextToSize(optLine, pageWidth - 36);
            if (y + (optLines.length * 4) > 275) { doc.addPage(); y = 15; }
            doc.text(optLines, 22, y);
            y += optLines.length * 4;
          });
          doc.setTextColor(0, 0, 0);
        } else if (q.question_type === 'FITB') {
          doc.setFont('NotoSansBengali', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 64, 175);
          const fitbLines = doc.splitTextToSize(`Your Submitted Blanks: ${q.student_answer || '(Left Blank)'}`, pageWidth - 36);
          if (y + (fitbLines.length * 4.5) > 275) { doc.addPage(); y = 15; }
          doc.text(fitbLines, 22, y);
          y += fitbLines.length * 4.5;
          doc.setTextColor(0, 0, 0);
        } else if (q.question_type === 'MATCH') {
          doc.setFont('NotoSansBengali', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 64, 175);
          const matchLines = doc.splitTextToSize(`Your Matching Pairs: ${q.student_answer || '(No match)'}`, pageWidth - 36);
          if (y + (matchLines.length * 4.5) > 275) { doc.addPage(); y = 15; }
          doc.text(matchLines, 22, y);
          y += matchLines.length * 4.5;
          doc.setTextColor(0, 0, 0);
        }

        y += 4;
      });

      doc.save(`${data.student.name.replace(/\s+/g, '_')}_Question_Paper.pdf`);

      // Audit download log
      fetch(`${API_BASE}/api/student-sessions/${session_id}/audit-log`, { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.error('Error generating question paper PDF:', e);
      alert('Failed to generate your Question Paper. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null || totalSeconds === undefined) return '--:--';
    const safeSeconds = Math.max(0, totalSeconds);
    const m = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const s = (safeSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // LOADING / CONNECTING SCREEN
  // ==========================================
  if (status === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h3 className="text-2xl font-black text-slate-800 mb-2">Connecting to Examination...</h3>
        <p className="text-sm font-semibold text-slate-400 max-w-sm">Verifying your student session and exam configuration. Please wait a moment.</p>
      </div>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================
  if (status === 'ERROR') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 mb-6 rounded-3xl bg-red-100 flex items-center justify-center shadow-lg border border-red-200">
          <AlertTriangle className="text-red-600" size={40} />
        </div>
        <h2 className="text-2xl font-black text-red-600 mb-2">Examination Notice</h2>
        <p className="text-slate-600 font-bold max-w-md mb-6 text-sm leading-relaxed">{errorMessage || 'Invalid session or no active exam found.'}</p>
        <button 
          onClick={() => navigate('/')} 
          className="bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
        >
          Back to Student Login
        </button>
      </div>
    );
  }

  // ==========================================
  // WAITING / INSTRUCTION SCREEN (INFOGRAPHIC)
  // ==========================================
  if (status === 'WAITING') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Header Hero Card */}
        <div className="bg-gradient-vibrant p-8 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles size={14} /> Competitive Examination Portal
            </span>
            <h2 className="text-3xl font-black tracking-tight">{waitingInfo?.exam_title || 'Mid Term Examination'}</h2>
            <p className="text-primary-100 text-sm font-medium mt-1">
              Please read the examination guidelines carefully while waiting for the teacher to start.
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
              <Clock size={28} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-primary-200">Exam Status</p>
              <p className="text-lg font-black text-white">Waiting for Teacher</p>
            </div>
          </div>
        </div>

        {/* Student Identity Card & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 font-black text-xl">
              <User size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Student Identity</span>
              <h4 className="text-lg font-black text-slate-800">{waitingInfo?.name || 'Student Examinee'}</h4>
              <p className="text-xs font-mono font-bold text-primary-600">{waitingInfo?.exam_roll || 'NYSDB01400001'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 font-black text-xl">
              <BookOpen size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class & Batch</span>
              <h4 className="text-lg font-black text-slate-800">{waitingInfo?.batch || 'Batch A'}</h4>
              <p className="text-xs font-bold text-slate-500">{waitingInfo?.class || 'Class 5'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-black text-xl">
              <Award size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Exam Specs</span>
              <h4 className="text-lg font-black text-slate-800">{waitingInfo?.duration_minutes || 30} Minutes</h4>
              <p className="text-xs font-bold text-slate-500">Full Marks: {waitingInfo?.full_marks || 100}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Marks Distribution Table */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Award className="text-primary-600" size={18} /> Dynamic Marks Distribution
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Section Name</th>
                  <th className="pb-3 px-4">Question Type</th>
                  <th className="pb-3 px-4 text-center">Questions</th>
                  <th className="pb-3 px-4 text-center">Marks / Question</th>
                  <th className="pb-3 px-4 text-right">Section Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {waitingInfo?.sections && waitingInfo.sections.length > 0 ? (
                  waitingInfo.sections.map((sec, idx) => (
                    <tr key={sec.section_id || idx} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{sec.title}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">
                          {sec.section_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-700">{sec.question_count}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">
                        {sec.question_count > 0 ? (sec.section_marks / sec.question_count).toFixed(0) : '1'} Mark(s)
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-primary-600">{sec.section_marks} Marks</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 font-bold">Standard configuration active.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Answer Status & Navigation Legend Infographic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <HelpCircle className="text-primary-600" size={18} /> Answer-Status Legend
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-200">
                <span className="w-4 h-4 rounded-md bg-green-500 shadow-sm flex items-center justify-center text-white"><Check size={12}/></span>
                <span className="text-green-900">Answered (সংরক্ষিত)</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300"></span>
                <span className="text-slate-700">Not Visited / Left</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-2xl border border-primary-200">
                <span className="w-4 h-4 rounded-md bg-primary-600 text-white shadow-sm ring-2 ring-primary-300"></span>
                <span className="text-primary-900">Current Question</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="w-4 h-4 rounded-md bg-amber-500 text-white shadow-sm"></span>
                <span className="text-amber-900">Marked for Review</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Languages className="text-primary-600" size={18} /> Language & Post-Exam Information
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              • <b>Bilingual Support:</b> You can toggle questions between <b>English</b> and <b>বাংলা</b> anytime during the exam using the language button at the top.
            </p>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              • <b>Question Paper Download:</b> After you submit your examination, you will be able to download your customized question paper copy with your submitted answers.
            </p>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              • <b>Anti-Cheat Protection:</b> Switching tabs or minimizing the browser will automatically lock your screen until unlocked by the teacher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAUSED / SCREEN LOCKED SCREEN
  // ==========================================
  if (status === 'PAUSED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 mb-6 rounded-3xl bg-red-100 flex items-center justify-center shadow-lg border border-red-200 animate-bounce">
          <AlertTriangle className="text-red-600" size={48} />
        </div>
        <h2 className="text-3xl font-black text-red-600 mb-2">Screen Locked / Tab Violation</h2>
        <p className="text-slate-600 font-bold max-w-md mb-6 leading-relaxed text-sm">
          You have changed browser tabs or minimized the exam window. For anti-cheat security, your exam has been paused. Please raise your hand and wait for the teacher to unlock your screen.
        </p>
      </div>
    );
  }

  // ==========================================
  // COMPLETED SCREEN
  // ==========================================
  if (status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 mb-6 rounded-3xl bg-green-100 flex items-center justify-center shadow-lg border border-green-200">
          <CheckCircle2 className="text-green-600" size={48} />
        </div>
        <h2 className="text-3xl font-black text-green-700 mb-2">Examination Finished!</h2>
        <p className="text-slate-600 font-bold max-w-md mb-8 text-sm leading-relaxed">
          Your answers have been saved and recorded in the database. You may download your submitted question paper below.
        </p>

        <button 
          onClick={handleDownloadStudentQuestionPaper}
          disabled={isDownloadingPdf}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl transition-all transform hover:scale-105"
        >
          {isDownloadingPdf ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={22} />
          )}
          {isDownloadingPdf ? 'Generating PDF...' : 'Download My Question Paper (PDF)'}
        </button>
      </div>
    );
  }

  // ==========================================
  // ACTIVE EXAM WORKSPACE
  // ==========================================
  return (
    <div className={`space-y-6 pb-20 ${currentSection?.section_type === 'FITB' ? 'lg:pb-48 pb-64' : ''}`}>
      {/* Top Fixed Control Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-20 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Remaining</p>
            <p className={`text-2xl font-black ${secondsLeft && secondsLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
              {formatTime(secondsLeft)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-extrabold text-xs transition-colors"
          >
            <Languages size={18} />
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>

          <button 
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-md transform hover:scale-105"
          >
            <CheckCircle2 size={18} /> {lang === 'bn' ? 'জমা দিন' : 'Submit Exam'}
          </button>
        </div>
      </div>

      {/* FEATURE 6: TOP SECTION NAVIGATION BAR */}
      {sections.length > 1 && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">Sections:</span>
          {sections.map(sec => {
            const isActive = currentSection?.section_id === sec.section_id;
            return (
              <button
                key={sec.section_id}
                onClick={() => {
                  const targetIdx = questions.findIndex(q => q.section_id === sec.section_id);
                  if (targetIdx !== -1) setCurrentQuestionIndex(targetIdx);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{getLocalizedSectionTitle(sec.title, lang)}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-200'}`}>
                  {questionsBySection[sec.section_id]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Question & Palette Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Question Area */}
        <div className="w-full lg:w-3/4 flex flex-col">
          {questions.length > 0 && currentQuestion && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {currentSection && (
                <div className="bg-slate-50 border-b border-slate-100 px-8 py-3.5 flex items-center justify-between text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-primary-700 font-black">{getLocalizedSectionTitle(currentSection.title, lang)}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                    <span className="text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  </div>
                  <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-black text-[10px]">
                    {currentQuestion.marks || 1} Mark(s)
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-vibrant text-white font-black rounded-2xl flex items-center justify-center text-xl shadow-md">
                    {currentQuestionIndex + 1}
                  </div>
                  
                  <div className="flex-grow">
                    {currentQuestion.question_type === 'FITB' ? (
                      renderFitbQuestion(currentQuestion)
                    ) : currentQuestion.question_type === 'MATCH' ? (
                      <MatchQuestionViewer 
                        question={currentQuestion}
                        mapping={answers[currentQuestion.question_id] ? JSON.parse(answers[currentQuestion.question_id]) : {}}
                        onMappingChange={(qId, mappingStr) => handleAnswerSelect(qId, mappingStr)}
                        lang={lang}
                        uiText={UI_TEXT}
                      />
                    ) : (
                      <>
                        <div className="mb-8 mt-2">
                          <QuestionTextRenderer text={getLocalizedText(currentQuestion.question_text_en, currentQuestion.question_text_bn, lang)} textSize="text-2xl" />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(() => {
                            const getQuestionOptions = (q: any) => {
                              if (q.question_type === 'TF') {
                                const opts = q.options_json || [];
                                if (Array.isArray(opts) && opts.length > 0) return opts;
                                return ['True', 'False'];
                              }
                              return q.options_json || [];
                            };

                            return getQuestionOptions(currentQuestion).map((option: any, optIdx: number) => {
                              const optionId = typeof option === 'object' && option !== null ? option.id : option;
                              const optionText = typeof option === 'object' && option !== null ? option.text : option;
                              const isSelected = answers[currentQuestion.question_id] === optionId;

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleAnswerSelect(currentQuestion.question_id, optionId)}
                                  className={`text-left px-6 py-5 rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] ${
                                    isSelected 
                                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' 
                                      : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <span className="inline-block w-6 font-black text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                                  {currentQuestion.question_type === 'TF' ? (lang === 'bn' ? (optionText === 'True' ? 'সত্য' : 'মিথ্যা') : optionText) : cleanMathDollars(optionText)}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between bg-slate-50 p-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    currentQuestionIndex === 0 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    currentQuestionIndex === questions.length - 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md'
                  }`}
                >
                  Next Question
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section-wise Question Palette Sidebar (Preserved) */}
        <div className="w-full lg:w-1/4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-48">
          <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center justify-between">
            <span>Question Palette</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {Object.keys(answers).length} / {questions.length} Answered
            </span>
          </h3>
          
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {sections.map(sec => {
              const secQs = questionsBySection[sec.section_id] || [];
              if (secQs.length === 0) return null;
              
              return (
                <div key={sec.section_id}>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 pl-1">
                    {getLocalizedSectionTitle(sec.title, lang)}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {secQs.map((q) => {
                      const idx = questions.findIndex(x => x.question_id === q.question_id);
                      let isAnswered = false;
                      if (q.question_type === 'FITB') {
                         const mapping = fitbAnswers[q.question_id] || {};
                         isAnswered = Object.values(mapping).some(v => v.trim() !== '');
                      } else {
                         isAnswered = answers[q.question_id] !== undefined;
                      }
                      const isCurrent = idx === currentQuestionIndex;
                      
                      return (
                        <button
                          key={q.question_id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-full aspect-square rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                            isCurrent ? 'ring-4 ring-primary-300 scale-105 z-10' : 'hover:scale-105'
                          } ${
                            isAnswered 
                              ? 'bg-green-500 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-md bg-green-500 shadow-sm"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200"></div>
              <span>Not Attempted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Bank Drawer for FITB */}
      {currentSection?.section_type === 'FITB' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              {activeBlank ? <span className="text-primary-600 animate-pulse font-extrabold">Select an option below for the active blank</span> : 'Answer Bank (Click a blank first)'}
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {(shuffledBanks[currentSection.section_id] || []).map((opt: any, idx) => {
                const optId = typeof opt === 'object' && opt !== null ? opt.id : opt;
                const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
                const usage = getOptionUsage(optId);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleBankOptionClick(optId)}
                    disabled={!activeBlank && !usage}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2 flex items-center gap-2 ${
                      usage 
                        ? 'bg-slate-100 border-slate-200 text-slate-400' 
                        : activeBlank
                          ? 'bg-white border-primary-300 text-primary-700 hover:bg-primary-50 shadow-sm cursor-pointer'
                          : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <span>{optText}</span>
                    {usage && (
                      <span className="text-[10px] font-black bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
                        Q{usage.qIndex + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Submitting Exam */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-amber-500" size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Submit Examination?</h3>
            <p className="text-slate-600 text-sm font-medium mb-6">
              Are you sure you want to submit your exam? You cannot change your answers after submitting.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowSubmitConfirm(false);
                  socket.emit('student_submit_exam', { session_id });
                  setStatus('COMPLETED');
                }} 
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-md"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getLocalizedText = (textEn: string, textBn: string, currentLang: string) => {
  if (currentLang === 'bn' && textBn && textBn.trim() !== '') return textBn;
  if (currentLang === 'en' && textEn && textEn.trim() !== '') return textEn;
  return textEn || textBn || '';
};

const getLocalizedSectionTitle = (title: string, lang: string) => {
  if (lang === 'en') return title;
  const t = title.toUpperCase();
  if (t.includes('MULTIPLE CHOICE')) return 'বহুনির্বাচনী প্রশ্ন';
  if (t.includes('FILL IN THE BLANKS')) return 'শূন্যস্থান পূরণ করো';
  if (t.includes('TRUE/ FALSE') || t.includes('TRUE/FALSE') || t.includes('TRUE / FALSE')) return 'সত্য/মিথ্যা নির্বাচন করো';
  if (t.includes('MATCH')) return 'বামদিকের সাথে ডানদিক মেলাও';
  return title;
};

const UI_TEXT = {
  en: {
    next: "Next",
    previous: "Previous",
    submit: "Submit Exam",
    clear: "Clear Match",
    noAnswer: "No Answer Submitted",
    studentResponse: "Student Response Sheet",
    clickLeftRight: "Click a left item, then a right item to draw a line. Double-click a left item to remove its match."
  },
  bn: {
    next: "পরবর্তী",
    previous: "পূর্ববর্তী",
    submit: "পরীক্ষা জমা দিন",
    clear: "ম্যাচ মুছুন",
    noAnswer: "কোনো উত্তর জমা দেওয়া হয়নি",
    studentResponse: "শিক্ষার্থীর উত্তরপত্র",
    clickLeftRight: "একটি লাইন আঁকতে বাম দিকের আইটেম এবং তারপর ডান দিকের আইটেমে ক্লিক করুন। ম্যাচ মুছতে বাম আইটেমে ডাবল-ক্লিক করুন।"
  }
};
