import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket, API_BASE } from '../App';
import { Languages, AlertTriangle, Clock, CheckCircle2, ChevronRight, X, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
}

export default function ExamWorkspace() {
  const { session_id } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'WAITING' | 'STARTED' | 'PAUSED' | 'COMPLETED'>('WAITING');
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    document.title = "Exam Portal";
  }, []);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Normal answers (MCQ/TF) + JSON strings for FITB
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Interactive FITB mapping: qId -> blankIdx -> option
  const [fitbAnswers, setFitbAnswers] = useState<Record<string, Record<number, string>>>({});
  const [shuffledBanks, setShuffledBanks] = useState<Record<string, string[]>>({});
  const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);
  const [activeBlank, setActiveBlank] = useState<{ qId: string; bIdx: number } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<any>(null);

  useEffect(() => {
    if (!session_id) {
      navigate('/');
      return;
    }

    socket.emit('workspace_ready', { session_id });

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

      const sectionOrder = fetchedSections.map(s => s.section_id);
      fetchedQuestions.sort((a, b) => {
        const idxA = sectionOrder.indexOf(a.section_id || a.section_id); // fallback
        const idxB = sectionOrder.indexOf(b.section_id || b.section_id);
        return idxA - idxB;
      });

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
      // Backend handles submission, we just wait for exam_completed or transition here
      setStatus('COMPLETED');
    });
    socket.on('time_tick', (data: { seconds_left: number }) => setSecondsLeft(data.seconds_left));

    return () => {
      socket.off('exam_started');
      socket.off('exam_paused');
      socket.off('exam_resumed');
      socket.off('exam_completed');
      socket.off('exam_ended');
      socket.off('time_tick');
    };
  }, [session_id, navigate]);

  // Once sections and questions arrive, build the shuffled answer banks for FITB sections
  useEffect(() => {
    if (sections.length > 0 && questions.length > 0 && Object.keys(shuffledBanks).length === 0) {
      const banks: Record<string, string[]> = {};
      sections.filter(s => s.section_type === 'FITB').forEach(sec => {
        const secQs = questions.filter(q => q.section_id === sec.section_id);
        let allOpts: string[] = [];
        secQs.forEach(q => allOpts = allOpts.concat(q.options_json || []));
        const uniqueOpts = Array.from(new Set(allOpts));
        
        // Fisher-Yates shuffle
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

    let timer: ReturnType<typeof setInterval>;
    if (secondsLeft !== null && secondsLeft > 0) {
      const endTime = Date.now() + secondsLeft * 1000;
      timer = setInterval(() => {
        setSecondsLeft(() => {
          const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
          if (remaining === 0) {
            clearInterval(timer);
            socket.emit('student_submit_exam', { session_id });
            setStatus('COMPLETED');
          }
          return remaining;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
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

  // Unset active blank if we change questions
  useEffect(() => {
    setActiveBlank(null);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (question_id: string, option: string) => {
    setAnswers(prev => ({ ...prev, [question_id]: option }));
    socket.emit('submit_answer', { session_id, question_id, selected_option: option });
  };

  const renderMatchQuestion = (q: Question) => {
    let options: any = { left: [], right: [] };
    try {
      options = q.options_json || { left: [], right: [] };
    } catch(e) {}
    
    const leftCol: string[] = options.left || [];
    const rightCol: string[] = options.right || [];
    
    let mapping: Record<string, string> = {};
    try {
      mapping = answers[q.question_id] ? JSON.parse(answers[q.question_id]) : {};
    } catch(e) {}
    
    const handleLeftClick = (leftText: string) => {
      if (activeMatchLeft === leftText) {
        const newMapping = { ...mapping };
        delete newMapping[leftText];
        handleAnswerSelect(q.question_id, JSON.stringify(newMapping));
        setActiveMatchLeft(null);
      } else {
        setActiveMatchLeft(leftText);
      }
    };
    
    const handleRightClick = (rightText: string) => {
      if (!activeMatchLeft) return;
      const newMapping = { ...mapping };
      for (const k in newMapping) {
        if (newMapping[k] === rightText) delete newMapping[k];
      }
      newMapping[activeMatchLeft] = rightText;
      handleAnswerSelect(q.question_id, JSON.stringify(newMapping));
      setActiveMatchLeft(null);
    };

    return (
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-slate-800 mb-4 mt-2 leading-relaxed">
          {getLocalizedText(q.question_text_en, q.question_text_bn, lang)}
        </h3>
        <p className="text-sm text-slate-500 mb-6 font-bold">{lang === 'bn' ? UI_TEXT.bn.clickLeftRight : UI_TEXT.en.clickLeftRight}</p>
        <div className="grid grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            {leftCol.map((item, idx) => {
              const isMatched = mapping[item] !== undefined;
              const isActive = activeMatchLeft === item;
              return (
                <button
                  key={`l-${idx}`}
                  onClick={() => handleLeftClick(item)}
                  className={`p-4 text-left rounded-xl border-2 font-bold transition-colors ${isActive ? 'border-primary-500 bg-primary-50 text-primary-700' : isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-primary-300 text-slate-700'}`}
                >
                  {item}
                  {isMatched && <span className="block text-xs text-green-600 mt-1">{lang === 'bn' ? 'ম্যাচ করা হয়েছে: ' : 'Matched: '} {mapping[item]}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3">
            {rightCol.map((item, idx) => {
              const isMatched = Object.values(mapping).includes(item);
              return (
                <button
                  key={`r-${idx}`}
                  onClick={() => handleRightClick(item)}
                  className={`p-4 text-left rounded-xl border-2 font-bold transition-colors ${activeMatchLeft ? 'border-dashed border-primary-400 hover:border-primary-500 hover:bg-primary-50 cursor-pointer text-slate-700' : isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-700 cursor-default'}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getOptionUsage = (option: string) => {
    if (!currentSection) return null;
    const secQs = questionsBySection[currentSection.section_id] || [];
    for (const q of secQs) {
      const qId = q.question_id;
      const mapping = fitbAnswers[qId] || {};
      for (const [bIdxStr, assignedOpt] of Object.entries(mapping)) {
        if (assignedOpt === option) {
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
    
    // Unassign from old location
    if (usage) {
      newFitb[usage.qId] = { ...newFitb[usage.qId] };
      delete newFitb[usage.qId][usage.bIdx];
    }
    
    // Assign to active blank
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
                  {assignedOpt || 'Click to select'}
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

  const handleSubmitExam = () => setShowSubmitConfirm(true);

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '--:--';
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
          <Clock className="text-primary-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">{lang === 'bn' ? UI_TEXT.bn.waitingForTeacher : UI_TEXT.en.waitingForTeacher}</h2>
        <p className="text-slate-500 font-medium max-w-sm">
          {lang === 'bn' ? UI_TEXT.bn.waitQuietly : UI_TEXT.en.waitQuietly}
        </p>
      </div>
    );
  }

  if (status === 'PAUSED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-red-600 mb-2">{lang === 'bn' ? UI_TEXT.bn.screenLocked : UI_TEXT.en.screenLocked}</h2>
        <p className="text-slate-600 font-medium max-w-sm mb-6">
          You have changed tabs or minimized the window. Please raise your hand and wait for the teacher to unlock your screen.
        </p>
      </div>
    );
  }
  
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !session_id) return;
    setIsDownloadingPdf(true);

    try {
      // 1. Fetch sanitized PDF data
      const res = await fetch(`${API_BASE}/api/student-sessions/${session_id}/submitted-answers`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setPdfData(data);

      // 2. Wait for React to render the hidden DOM
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Generate PDF
      if (pdfRef.current) {
        const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = pdfHeight;
        let position = 0;
        let page = 1;

        // Header watermark text config
        const addWatermark = () => {
          pdf.setTextColor(200, 200, 200);
          pdf.setFontSize(60);
          pdf.setFont('helvetica', 'bold');
          pdf.saveGraphicsState();
          pdf.setGState(new (pdf as any).GState({opacity: 0.15}));
          pdf.text("STUDENT RESPONSE COPY", pdfWidth / 2, pdf.internal.pageSize.getHeight() / 2, { angle: 45, align: 'center' });
          pdf.restoreGraphicsState();
          
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${page}`, pdfWidth - 20, pdf.internal.pageSize.getHeight() - 10);
          pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, pdf.internal.pageSize.getHeight() - 10);
        };
        
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        addWatermark();
        heightLeft -= pdf.internal.pageSize.getHeight();
        
        while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          page++;
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          addWatermark();
          heightLeft -= pdf.internal.pageSize.getHeight();
        }
        
        pdf.save(`${data.student.name.replace(/\s+/g, '_')}_Answers.pdf`);

        // 4. Log Audit Download
        await fetch(`${API_BASE}/api/student-sessions/${session_id}/audit-log`, { method: 'POST' });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfData(null);
    }
  };

  if (status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="text-green-500" size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-green-600 mb-2">Exam Finished!</h2>
        <p className="text-slate-600 font-medium max-w-sm mb-8">
          Your answers have been saved successfully. You may now close this window or return to the main menu.
        </p>

        <button 
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all transform hover:scale-[1.02]"
        >
          {isDownloadingPdf ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={20} />
          )}
          {isDownloadingPdf ? 'Generating PDF...' : 'Download My Submitted Answer Sheet (PDF)'}
        </button>

        {/* Hidden PDF Layout */}
        {pdfData && (
          <div className="absolute left-[-9999px] top-[-9999px]">
            <div ref={pdfRef} style={{ backgroundColor: '#ffffff', color: '#1e293b' }} className="p-10 w-[800px] text-left">
              <div style={{ borderColor: '#1e293b' }} className="text-center mb-8 border-b-2 pb-6">
                <h1 style={{ color: '#0f172a' }} className="text-2xl font-black tracking-wider">INSTITUTE OF COMPUTER SCIENCE AND TECHNOLOGY CHOWBERIA</h1>
                <h2 style={{ color: '#334155' }} className="text-xl font-bold mt-2">{lang === 'bn' ? UI_TEXT.bn.studentResponse : UI_TEXT.en.studentResponse}</h2>
              </div>

              <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }} className="grid grid-cols-2 gap-4 mb-8 text-sm font-bold p-4 rounded-xl border">
                <div><span style={{ color: '#64748b' }} className="uppercase">Student Name:</span> <br/>{pdfData.student.name}</div>
                <div><span style={{ color: '#64748b' }} className="uppercase">Student ID:</span> <br/>{pdfData.student.student_id}</div>
                <div><span style={{ color: '#64748b' }} className="uppercase">Examination:</span> <br/>{pdfData.student.exam_title}</div>
                <div><span style={{ color: '#64748b' }} className="uppercase">Class:</span> <br/>{pdfData.student.class}</div>
              </div>

              <div className="space-y-6">
                {(() => {
                  let sectionsGroup: any = {};
                  pdfData.answers.forEach((q: any) => {
                    const sec = q.section_title || 'General';
                    if (!sectionsGroup[sec]) sectionsGroup[sec] = [];
                    sectionsGroup[sec].push(q);
                  });

                  return Object.entries(sectionsGroup).map(([secTitle, qs]: [string, any]) => (
                    <div key={secTitle} className="mb-6">
                      <h3 style={{ color: '#334155', backgroundColor: '#f1f5f9' }} className="text-lg font-black uppercase p-2 rounded-lg mb-4">{secTitle}</h3>
                      <div className="space-y-6 pl-4">
                        {qs.map((q: any, idx: number) => {
                          const isBlank = q.student_answer === null || q.student_answer === undefined || q.student_answer === '';
                          return (
                            <div key={q.question_id} style={{ borderColor: '#f1f5f9' }} className="border-b pb-4">
                              <div className="flex gap-3 mb-2">
                                <span style={{ color: '#64748b' }} className="font-black">{idx + 1}.</span>
                                <div style={{ color: '#1e293b' }} className="font-bold leading-relaxed whitespace-pre-wrap">{q.question_text_en}</div>
                              </div>
                              <div style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }} className="ml-7 mt-2 p-3 rounded-lg border">
                                <p style={{ color: '#94a3b8' }} className="text-xs font-black uppercase mb-1">{lang === 'bn' ? UI_TEXT.bn.yourSubmission : UI_TEXT.en.yourSubmission}</p>
                                {q.question_type === 'FITB' ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      try {
                                        const stdAns = JSON.parse(q.student_answer || '[]');
                                        if (stdAns.length === 0) return <span style={{ color: '#64748b' }} className="italic font-bold">{lang === 'bn' ? UI_TEXT.bn.noAnswer : UI_TEXT.en.noAnswer}</span>;
                                        return stdAns.map((ans: string, i: number) => (
                                          <div key={i} className="text-sm font-bold">Blank {i+1}: <span style={{ color: '#1e293b', backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} className="px-2 py-1 rounded border">{ans || '(Left Blank)'}</span></div>
                                        ));
                                      } catch(e) { return <span style={{ color: '#64748b' }} className="italic">Error parsing blanks</span>; }
                                    })()}
                                  </div>
                                ) : (
                                  <p style={{ color: isBlank ? '#64748b' : '#1e293b' }} className={`font-bold ${isBlank ? 'italic' : ''}`}>
                                    {isBlank ? (lang === 'bn' ? UI_TEXT.bn.noAnswer : UI_TEXT.en.noAnswer) : q.student_answer}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`pb-20 ${currentSection?.section_type === 'FITB' ? 'lg:pb-48 pb-64' : ''}`}>
      {/* Exam Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 sticky top-20 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2 rounded-xl text-primary-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Remaining</p>
            <p className={`text-2xl font-extrabold ${secondsLeft && secondsLeft < 300 ? 'text-red-500' : 'text-slate-800'}`}>
              {formatTime(secondsLeft)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSubmitExam}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md transform hover:scale-[1.02]"
          >
            <CheckCircle2 size={20} /> {lang === 'bn' ? UI_TEXT.bn.submit : UI_TEXT.en.submit}
          </button>
          
          <button 
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
          >
            <Languages size={20} />
          {lang === 'en' ? 'বাংলা' : 'English'}
        </button>
      </div>
    </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Main Question Area */}
        <div className="w-full lg:w-3/4 flex flex-col">
          {questions.length > 0 && currentQuestion && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              
              {currentSection && (
                <div className="bg-slate-50 border-b border-slate-100 px-8 py-4 flex items-center gap-2 text-slate-600 font-bold uppercase tracking-wider text-sm">
                  <span>{getLocalizedSectionTitle(currentSection.title, lang)}</span>
                  <ChevronRight size={16} className="text-slate-400" />
                  <span className="text-slate-400">{lang === 'bn' ? UI_TEXT.bn.question : UI_TEXT.en.question} {currentQuestionIndex + 1}</span>
                </div>
              )}

              <div className="p-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-accent text-white font-black rounded-2xl flex items-center justify-center text-xl shadow-md">
                    {currentQuestionIndex + 1}
                  </div>
                  <div className="flex-grow">
                    
                    {currentQuestion.question_type === 'FITB' ? (
                      renderFitbQuestion(currentQuestion)
                    ) : currentQuestion.question_type === 'MATCH' ? (
                      renderMatchQuestion(currentQuestion)
                    ) : (
                      <>
                        <h3 className="text-2xl font-semibold text-slate-800 mb-8 mt-2 leading-relaxed">
                          {getLocalizedText(currentQuestion.question_text_en, currentQuestion.question_text_bn, lang)}
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(currentQuestion.question_type === 'TF' ? ['True', 'False'] : (currentQuestion.options_json || [])).map((option, optIdx) => {
                            const isSelected = answers[currentQuestion.question_id] === option;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleAnswerSelect(currentQuestion.question_id, option)}
                                className={`text-left px-6 py-5 rounded-2xl border-2 font-bold transition-all transform hover:scale-[1.01] ${
                                  isSelected 
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' 
                                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                {option}
                              </button>
                            )
                          })}
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
                  className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                    currentQuestionIndex === 0 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
                  }`}
                >
                  {lang === 'bn' ? UI_TEXT.bn.previous : UI_TEXT.en.previous}
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                    currentQuestionIndex === questions.length - 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md'
                  }`}
                >
                  {lang === 'bn' ? UI_TEXT.bn.next : UI_TEXT.en.next}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Section-wise Question Palette Sidebar */}
        <div className="w-full lg:w-1/4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-48">
          <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center justify-between">
            <span>{lang === 'bn' ? UI_TEXT.bn.palette : UI_TEXT.en.palette}</span>
            <span className="text-sm font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
              {Object.keys(answers).length} / {questions.length}
            </span>
          </h3>
          
          <div className="space-y-6">
            {sections.map(sec => {
              const secQs = questionsBySection[sec.section_id] || [];
              if (secQs.length === 0) return null;
              
              return (
                <div key={sec.section_id}>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 pl-1">
                    {getLocalizedSectionTitle(sec.title, lang)}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {secQs.map((q) => {
                      const idx = questions.findIndex(x => x.question_id === q.question_id);
                      
                      let isAnswered = false;
                      if (q.question_type === 'FITB') {
                         const mapping = fitbAnswers[q.question_id] || {};
                         const hasAnyBlankFilled = Object.values(mapping).some(v => v.trim() !== '');
                         isAnswered = hasAnyBlankFilled;
                      } else {
                         isAnswered = answers[q.question_id] !== undefined;
                      }
                      const isCurrent = idx === currentQuestionIndex;
                      
                      return (
                        <button
                          key={q.question_id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-full aspect-square rounded-xl font-black text-sm flex items-center justify-center transition-all ${
                            isCurrent ? 'ring-4 ring-primary-300 scale-110 z-10' : 'hover:scale-105'
                          } ${
                            isAnswered 
                              ? 'bg-green-500 text-white shadow-md' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
          
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
              <div className="w-4 h-4 rounded-md bg-green-500 shadow-sm"></div>
              <span>{lang === 'bn' ? UI_TEXT.bn.answered : UI_TEXT.en.answered}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
              <div className="w-4 h-4 rounded-md bg-slate-100 border border-slate-200"></div>
              <span>{lang === 'bn' ? UI_TEXT.bn.notVisited : UI_TEXT.en.notVisited}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Bank Drawer */}
      {currentSection?.section_type === 'FITB' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <h4 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              {activeBlank ? <span className="text-primary-600 animate-pulse">Select an option below</span> : 'Answer Bank'}
            </h4>
            <div className="flex flex-wrap gap-3">
              {(shuffledBanks[currentSection.section_id] || []).map((opt, idx) => {
                const usage = getOptionUsage(opt);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleBankOptionClick(opt)}
                    disabled={!activeBlank && !usage}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all border-2 flex items-center gap-3 ${
                      usage 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200' 
                        : activeBlank
                          ? 'bg-white border-primary-300 text-primary-700 hover:bg-primary-50 hover:scale-105 cursor-pointer shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <span className="text-base">{opt}</span>
                    {usage && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-300 text-slate-600 px-2.5 py-1 rounded-full">
                        Q{usage.qIndex + 1}
                      </span>
                    )}
                  </button>
                )
              })}
              {(shuffledBanks[currentSection.section_id] || []).length === 0 && (
                <p className="text-slate-400 font-medium italic">No options available in this section.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-amber-500" size={32} />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 text-center mb-2">{lang === 'bn' ? UI_TEXT.bn.submit : UI_TEXT.en.submit}?</h3>
            <p className="text-slate-600 text-center mb-8 font-medium">
              {lang === 'bn' ? UI_TEXT.bn.submitDesc : UI_TEXT.en.submitDesc}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                {lang === 'bn' ? UI_TEXT.bn.cancel : UI_TEXT.en.cancel}
              </button>
              <button onClick={() => { setShowSubmitConfirm(false); socket.emit('student_submit_exam', { session_id }); setStatus('COMPLETED'); }} className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-sm">
                {lang === 'bn' ? UI_TEXT.bn.yesSubmit : UI_TEXT.en.yesSubmit}
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
    submitConfirm: "Submit Exam?",
    submitDesc: "Are you sure you want to submit your exam? You cannot change your answers after submitting.",
    cancel: "Cancel",
    yesSubmit: "Yes, Submit",
    clear: "Clear Match",
    noAnswer: "No Answer Submitted",
    studentResponse: "Student Response Sheet (Not Evaluated)",
    clickLeftRight: "Click a left item, then a right item to draw a line. Double-click a left item to remove its match.",
    yourSubmission: "Your Submission:",
    timeRemaining: "{lang === 'bn' ? UI_TEXT.bn.timeRemaining : UI_TEXT.en.timeRemaining}",
    palette: "Palette",
    answered: "Answered",
    notVisited: "Not Visited / Left",
    question: "QUESTION",
    waitingForTeacher: "Waiting for Teacher",
    waitQuietly: "Please wait quietly. The exam will start automatically when the teacher is ready.",
    screenLocked: "Screen Locked",
    pausedDesc: "{lang === 'bn' ? UI_TEXT.bn.pausedDesc : UI_TEXT.en.pausedDesc}"
  },
  bn: {
    next: "পরবর্তী",
    previous: "পূর্ববর্তী",
    submit: "পরীক্ষা জমা দিন",
    submitConfirm: "পরীক্ষা জমা দেবেন?",
    submitDesc: "আপনি কি আপনার পরীক্ষা জমা দিতে নিশ্চিত? জমা দেওয়ার পরে আপনি আপনার উত্তর পরিবর্তন করতে পারবেন না।",
    cancel: "বাতিল",
    yesSubmit: "হ্যাঁ, জমা দিন",
    clear: "ম্যাচ মুছুন",
    noAnswer: "কোনো উত্তর জমা দেওয়া হয়নি",
    studentResponse: "শিক্ষার্থীর উত্তরপত্র (মূল্যায়ন করা হয়নি)",
    clickLeftRight: "একটি লাইন আঁকতে বাম দিকের আইটেম এবং তারপর ডান দিকের আইটেমে ক্লিক করুন। ম্যাচ মুছতে বাম আইটেমে ডাবল-ক্লিক করুন।",
    yourSubmission: "আপনার জমা দেওয়া উত্তর:",
    timeRemaining: "অবশিষ্ট সময়",
    palette: "প্যালেট",
    answered: "উত্তর দেওয়া হয়েছে",
    notVisited: "দেখা হয়নি / বাকি আছে",
    question: "প্রশ্ন",
    waitingForTeacher: "শিক্ষকের জন্য অপেক্ষা করা হচ্ছে",
    waitQuietly: "দয়া করে শান্ত হয়ে অপেক্ষা করুন। শিক্ষক প্রস্তুত হলে পরীক্ষা স্বয়ংক্রিয়ভাবে শুরু হবে।",
    screenLocked: "স্ক্রিন লক করা হয়েছে",
    pausedDesc: "আপনার পরীক্ষা বিরতিতে আছে। শিক্ষকের পুনরায় শুরু করার জন্য অপেক্ষা করুন।"
  }
};


