import { useState, useEffect } from 'react';
import { socket, API_BASE } from '../App';
import { Users, Play, Unlock, UserPlus, BookOpen, Plus, AlertTriangle, ArrowLeft, Trash2, Square, Award, Download, Lock, Edit, Eye, X, ChevronLeft, ChevronRight, RotateCcw, Search, Shuffle, Layers, ArrowRightLeft, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface StudentSession {
  session_id: string;
  student_id: string;
  name: string;
  batch?: string;
  class?: string;
  status: 'LOGGED_IN' | 'EXAMINEE' | 'PAUSED' | 'COMPLETED' | 'ABSENT' | 'READY';
  tab_violation_count: number;
  seconds_left: number | null;
  password_provided?: string;
}

interface Student {
  student_id: string;
  name: string;
  phone_no: string;
  class: string;
  batch: string;
}

interface BatchItem {
  batch_id: string;
  name: string;
  course_class: string;
  session: string;
  description: string;
  status: string;
  student_count: number;
  created_at: string;
}

interface ExamBatchConfig {
  batch_name: string;
  shuffle_enabled: boolean;
}

interface Exam {
  exam_id: string;
  title: string;
  duration_minutes: number;
  target_batch: string;
  full_marks: number;
  status: 'DRAFT' | 'CREATED' | 'STARTED' | 'PAUSED' | 'ENDED';
  assigned_batches?: ExamBatchConfig[];
}

interface Section {
  section_id: string;
  exam_id: string;
  title: string;
  section_marks: number;
  section_type: string;
  questions: any[];
}

interface ResultData {
  student_id: string;
  name: string;
  score: number;
  full_marks: number;
  status: string;
  tab_violation_count: number;
  batch?: string;
  class?: string;
  session_id?: string;
}

interface ExamRun {
  run_id: string;
  exam_id: string;
  exam_name: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  exam_title: string;
  duration_minutes: number;
  full_marks: number;
  total_students: number;
  completed_students: number;
}

const DEFAULT_BATCHES = [
  'V,VI Batch 1',
  'V,VI,VII Batch -2',
  'VIII,IX Batch - 1',
  'VII,VIII,IX Batch 2',
  'KIDS III, IV, V',
  'JDX IX,X',
  'CJE (Java)'
];

const CLASSES = [
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'UG'
];



export default function TeacherDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    document.title = "Teacher Panel - ICST";
  }, []);

  const [activeTab, setActiveTab] = useState<'MONITOR' | 'REGISTRATION' | 'BATCHES' | 'EXAMS' | 'RESULTS'>('MONITOR');
  
  // Registration State
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: DEFAULT_BATCHES[0] });
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // Batches State
  const [batchesList, setBatchesList] = useState<BatchItem[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [newBatchForm, setNewBatchForm] = useState({ name: '', course_class: 'Class 5', session: '2026', description: '', status: 'ACTIVE' });
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [viewingBatchStudents, setViewingBatchStudents] = useState<BatchItem | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [selectedStudentsToMove, setSelectedStudentsToMove] = useState<string[]>([]);
  const [targetMoveBatch, setTargetMoveBatch] = useState<string>('');

  // Exams Management State
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [creatingExam, setCreatingExam] = useState(false);
  const [examForm, setExamForm] = useState({ 
    title: '', 
    duration_minutes: 30, 
    full_marks: 100, 
    assigned_batches: [{ batch_name: DEFAULT_BATCHES[0], shuffle_enabled: false }] 
  });
  const [selectedExamIdBuilder, setSelectedExamIdBuilder] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamForm, setEditExamForm] = useState({ 
    title: '', 
    duration_minutes: 30, 
    full_marks: 100, 
    assigned_batches: [] as ExamBatchConfig[] 
  });
  
  // Section & Question Builder State
  const [builderSections, setBuilderSections] = useState<Section[]>([]);
  const [newSectionForm, setNewSectionForm] = useState({ title: '', section_marks: 20, section_type: 'MCQ' });
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ 
    text_en: '', text_bn: '', 
    options: ['', '', '', ''], 
    correct_answer: '', 
    marks: 1, 
    fitb_blanks: [''], 
    fitb_extras: [] as string[], 
    match_pairs: [{ left: '', right: '' }, { left: '', right: '' }] 
  });
  const [builderStatus, setBuilderStatus] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isDownloadingQuestionPaper, setIsDownloadingQuestionPaper] = useState(false);

  // Monitor State
  const [selectedMonitorExamId, setSelectedMonitorExamId] = useState<string>('');
  const [studentsSession, setStudentsSession] = useState<StudentSession[]>([]);
  const [examSecondsLeft, setExamSecondsLeft] = useState<number | null>(null);

  // Examination Name Initialization Modal
  const [showInitModal, setShowInitModal] = useState(false);
  const [initExamName, setInitExamName] = useState('');
  const [initTargetStudentId, setInitTargetStudentId] = useState<string | null>(null);

  // Results State (Paginated Runs)
  const [examRuns, setExamRuns] = useState<ExamRun[]>([]);
  const [examRunsSearch, setExamRunsSearch] = useState('');
  const [examRunsOffset, setExamRunsOffset] = useState(0);
  const [examRunsTotal, setExamRunsTotal] = useState(0);
  const [isRunsLoading, setIsRunsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ExamRun | null>(null);
  const [runResultsData, setRunResultsData] = useState<ResultData[]>([]);

  // Answer Sheet View State
  const [selectedStudentForAnswers, setSelectedStudentForAnswers] = useState<string | null>(null);
  const [answerSheetData, setAnswerSheetData] = useState<any>(null);
  const [isAnswerSheetLoading, setIsAnswerSheetLoading] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/batches`);
      if (res.ok) setBatchesList(await res.json());
    } catch (e) { console.error('Error fetching batches:', e); }
  };

  const fetchExamRuns = async (offset = 0, search = '') => {
    setIsRunsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/exam-runs?limit=10&offset=${offset}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setExamRuns(data.runs || []);
        setExamRunsTotal(data.total_count || 0);
        setExamRunsOffset(data.offset || 0);
      }
    } catch (e) {
      console.error('Error fetching exam runs:', e);
    } finally {
      setIsRunsLoading(false);
    }
  };

  const openRunResults = async (run: ExamRun) => {
    setSelectedRun(run);
    setRunResultsData([]);
    try {
      const res = await fetch(`${API_BASE}/api/exam-runs/${run.run_id}/results`);
      if (res.ok) {
        const data = await res.json();
        setRunResultsData(data.results || []);
      }
    } catch (e) {
      console.error('Error loading run results:', e);
    }
  };

  const deleteExamRun = async (runId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this examination run and its student results?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/exam-runs/${runId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedRun?.run_id === runId) {
          setSelectedRun(null);
          setRunResultsData([]);
        }
        fetchExamRuns(examRunsOffset, examRunsSearch);
      }
    } catch (e) {
      console.error('Error deleting exam run:', e);
    }
  };

  const openAnswerSheet = async (student_id: string, exam_id?: string) => {
    setSelectedStudentForAnswers(student_id);
    setAnswerSheetData(null);
    setIsAnswerSheetLoading(true);
    try {
      const targetExamId = exam_id || selectedRun?.exam_id || selectedMonitorExamId;
      const res = await fetch(`${API_BASE}/api/exams/${targetExamId}/results/${student_id}/answers`);
      if (res.ok) {
        setAnswerSheetData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnswerSheetLoading(false);
    }
  };

  const closeAnswerSheet = () => {
    setSelectedStudentForAnswers(null);
    setAnswerSheetData(null);
  };
  
  const navigateAnswerSheet = (direction: 'prev' | 'next') => {
    if (!selectedStudentForAnswers || runResultsData.length === 0) return;
    const currentIndex = runResultsData.findIndex(r => r.student_id === selectedStudentForAnswers);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'next' && currentIndex < runResultsData.length - 1) newIndex = currentIndex + 1;
    
    if (newIndex !== currentIndex) {
      openAnswerSheet(runResultsData[newIndex].student_id);
    }
  };

  const handleDownloadTeacherQuestionPaper = async (exam_id: string, exam_title: string) => {
    setIsDownloadingQuestionPaper(true);
    try {
      const res = await fetch(`${API_BASE}/api/exams/${exam_id}/teacher-question-paper`);
      if (!res.ok) throw new Error('Failed to fetch question paper data');
      const data = await res.json();
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("INSTITUTE OF COMPUTER SCIENCE & TECHNOLOGY CHOWBERIA", pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text(`TEACHER QUESTION PAPER WITH ANSWER KEY: ${data.exam.title}`, pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Duration: ${data.exam.duration_minutes} Mins | Full Marks: ${data.exam.full_marks}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.line(14, y, pageWidth - 14, y);
      y += 7;

      let qCounter = 1;
      (data.sections || []).forEach((sec: any) => {
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setFillColor(240, 243, 246);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
        doc.text(`${sec.title} (${sec.section_type}) - Section Marks: ${sec.section_marks}`, 16, y + 1);
        y += 9;

        (sec.questions || []).forEach((q: any) => {
          if (y > 255) { doc.addPage(); y = 15; }
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          const qEnLines = doc.splitTextToSize(`Q${qCounter}. ${q.question_text_en}`, pageWidth - 32);
          doc.text(qEnLines, 16, y);
          y += qEnLines.length * 5;

          if (q.question_text_bn && q.question_text_bn.trim() !== '') {
            doc.setFont('helvetica', 'italic');
            const qBnLines = doc.splitTextToSize(`(Bengali): ${q.question_text_bn}`, pageWidth - 32);
            doc.text(qBnLines, 20, y);
            y += qBnLines.length * 4.5;
          }

          doc.setFont('helvetica', 'normal');
          let parsedOpts: any[] = [];
          try {
            parsedOpts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
          } catch(e) { parsedOpts = []; }

          if (q.question_type === 'MCQ' || q.question_type === 'TF') {
            const opts = Array.isArray(parsedOpts) ? parsedOpts : (q.question_type === 'TF' ? ['True', 'False'] : []);
            opts.forEach((opt: any, optIdx: number) => {
              const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
              const optId = typeof opt === 'object' && opt !== null ? opt.id : opt;
              const isCorrect = q.correct_answer === optId || q.correct_answer === optText;
              
              if (isCorrect) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 130, 50);
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
              }

              const optLabel = String.fromCharCode(65 + optIdx);
              const optLine = `${optLabel}. ${optText} ${isCorrect ? ' [ CORRECT ANSWER ]' : ''}`;
              doc.text(optLine, 22, y);
              y += 4.5;
            });
            doc.setTextColor(0, 0, 0);
          } else if (q.question_type === 'FITB') {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 130, 50);
            doc.text(`Correct Blanks: ${q.correct_answer}`, 22, y);
            y += 5;
            doc.setTextColor(0, 0, 0);
          } else if (q.question_type === 'MATCH') {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 130, 50);
            doc.text(`Correct Matching: ${q.correct_answer}`, 22, y);
            y += 5;
            doc.setTextColor(0, 0, 0);
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`[ Marks: ${q.marks} ]`, pageWidth - 35, y);
          doc.setTextColor(0, 0, 0);
          y += 6;
          qCounter++;
        });
      });

      doc.save(`${exam_title.replace(/\s+/g, '_')}_Question_Paper_With_Answers.pdf`);
    } catch (e) {
      console.error('Error downloading question paper:', e);
      alert('Failed to generate Teacher Question Paper.');
    } finally {
      setIsDownloadingQuestionPaper(false);
    }
  };

  const fetchData = async () => {
    try {
      const [studentsRes, examsRes] = await Promise.all([
        fetch(API_BASE + '/api/students'),
        fetch(API_BASE + '/api/exams')
      ]);
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (examsRes.ok) {
        const exams = await examsRes.json();
        setExamsList(exams);
        if (!selectedMonitorExamId && exams.length > 0) {
          const defaultExam = exams.find((e: Exam) => e.status !== 'ENDED') || exams[0];
          setSelectedMonitorExamId(defaultExam.exam_id);
        }
      }
    } catch (e) { console.error(e); }
  };

  const checkRecovery = async () => {
    try {
      const res = await fetch(API_BASE + '/api/exams/active');
      if (res.ok) {
        const data = await res.json();
        if (data.active_exam) {
          setSelectedMonitorExamId(data.active_exam.exam_id);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    socket.emit('join_teacher_dashboard');
    fetchData();
    fetchBatches();
    checkRecovery();
    
    socket.on('dashboard_update', (data: { students: StudentSession[], status: any, global_seconds_left?: number }) => {
      setStudentsSession(data.students);
      if (data.global_seconds_left !== undefined) {
        setExamSecondsLeft(data.global_seconds_left);
      }
    });

    socket.on('student_status_update', (data: { student_id: string, status: any, tab_violation_count?: number }) => {
      setStudentsSession(prev => prev.map(s => {
        if (s.student_id === data.student_id) {
          return {
            ...s,
            status: data.status,
            tab_violation_count: data.tab_violation_count !== undefined ? data.tab_violation_count : s.tab_violation_count
          };
        }
        return s;
      }));
    });

    socket.on('exam_status_update', (data: { exam_id: string, status: any }) => {
      setExamsList(prev => prev.map(e => e.exam_id === data.exam_id ? { ...e, status: data.status } : e));
    });

    return () => {
      socket.off('dashboard_update');
      socket.off('student_status_update');
      socket.off('exam_status_update');
    };
  }, []);

  useEffect(() => {
    if (selectedMonitorExamId) {
      socket.emit('monitor_exam', { exam_id: selectedMonitorExamId });
    }
  }, [selectedMonitorExamId]);

  useEffect(() => {
    if (activeTab === 'RESULTS') {
      fetchExamRuns(0, examRunsSearch);
    }
  }, [activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === 'ICST') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect teacher password');
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      if (res.ok) {
        fetchData();
        fetchBatches();
        setNewStudent({ student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: batchesList[0]?.name || DEFAULT_BATCHES[0] });
        setIsEditingStudent(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete student ${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        fetchBatches();
      }
    } catch (e) { console.error(e); }
  };

  // Batch Management Handlers
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatchForm)
      });
      if (res.ok) {
        fetchBatches();
        setCreatingBatch(false);
        setNewBatchForm({ name: '', course_class: 'Class 5', session: '2026', description: '', status: 'ACTIVE' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create batch');
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      const res = await fetch(`${API_BASE}/api/batches/${editingBatch.batch_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBatch)
      });
      if (res.ok) {
        fetchBatches();
        fetchData();
        setEditingBatch(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update batch');
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/batches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBatches();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete batch');
      }
    } catch (e) { console.error(e); }
  };

  const openViewBatchStudents = async (batch: BatchItem) => {
    setViewingBatchStudents(batch);
    setSelectedStudentsToMove([]);
    try {
      const res = await fetch(`${API_BASE}/api/batches/${batch.batch_id}/students`);
      if (res.ok) {
        const data = await res.json();
        setBatchStudents(data.students || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleMoveStudents = async () => {
    if (!targetMoveBatch || selectedStudentsToMove.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/batches/move-students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: selectedStudentsToMove,
          target_batch: targetMoveBatch
        })
      });
      if (res.ok) {
        alert(`Successfully moved ${selectedStudentsToMove.length} student(s) to ${targetMoveBatch}!`);
        if (viewingBatchStudents) {
          openViewBatchStudents(viewingBatchStudents);
        }
        fetchBatches();
        fetchData();
        setSelectedStudentsToMove([]);
      }
    } catch (e) { console.error(e); }
  };

  // Exam Builder Handlers
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examForm.title,
          duration_minutes: examForm.duration_minutes,
          full_marks: examForm.full_marks,
          batches: examForm.assigned_batches
        })
      });
      if (res.ok) {
        const data = await res.json();
        fetchData();
        setCreatingExam(false);
        setSelectedExamIdBuilder(data.exam.exam_id);
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenEditExam = async (exam: Exam) => {
    setEditingExamId(exam.exam_id);
    let assigned = exam.assigned_batches || [];
    if (!assigned || assigned.length === 0) {
      try {
        const res = await fetch(`${API_BASE}/api/exams/${exam.exam_id}/batches`);
        if (res.ok) assigned = await res.json();
      } catch (e) {}
    }
    setEditExamForm({
      title: exam.title,
      duration_minutes: exam.duration_minutes,
      full_marks: exam.full_marks,
      assigned_batches: assigned.length > 0 ? assigned : [{ batch_name: exam.target_batch, shuffle_enabled: false }]
    });
  };

  const handleSaveEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamId) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/${editingExamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editExamForm.title,
          duration_minutes: editExamForm.duration_minutes,
          full_marks: editExamForm.full_marks,
          batches: editExamForm.assigned_batches
        })
      });
      if (res.ok) {
        fetchData();
        setEditingExamId(null);
      }
    } catch (e) { console.error(e); }
  };

  // Section Builder Handlers
  const fetchSections = async (exam_id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/exams/${exam_id}/sections`);
      if (res.ok) {
        const data = await res.json();
        setBuilderSections(data);
        if (!activeSectionId && data.length > 0) {
          setActiveSectionId(data[0].section_id);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedExamIdBuilder) {
      fetchSections(selectedExamIdBuilder);
    }
  }, [selectedExamIdBuilder]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamIdBuilder) return;
    try {
      const res = await fetch(`${API_BASE}/api/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamIdBuilder,
          title: newSectionForm.title,
          section_marks: newSectionForm.section_marks,
          section_type: newSectionForm.section_type
        })
      });
      if (res.ok) {
        setNewSectionForm({ title: '', section_marks: 20, section_type: 'MCQ' });
        fetchSections(selectedExamIdBuilder);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamIdBuilder || !activeSectionId) return;

    const currentSection = builderSections.find(s => s.section_id === activeSectionId);
    if (!currentSection) return;

    let payloadOptions: any = questionForm.options;
    let payloadAnswer = questionForm.correct_answer;

    if (currentSection.section_type === 'TF') {
      payloadOptions = ['True', 'False'];
    } else if (currentSection.section_type === 'FITB') {
      const allBlanks = questionForm.fitb_blanks.filter(b => b.trim() !== '');
      const allExtras = questionForm.fitb_extras.filter(b => b.trim() !== '');
      payloadOptions = [...allBlanks, ...allExtras];
      payloadAnswer = JSON.stringify(allBlanks);
    } else if (currentSection.section_type === 'MATCH') {
      const leftItems = questionForm.match_pairs.map((p, idx) => ({ id: `L${idx + 1}`, text: p.left }));
      const rightItems = questionForm.match_pairs.map((p, idx) => ({ id: `R${idx + 1}`, text: p.right }));
      payloadOptions = { left: leftItems, right: rightItems };
      const correctMap: Record<string, string> = {};
      questionForm.match_pairs.forEach((_, idx) => {
        correctMap[`L${idx + 1}`] = `R${idx + 1}`;
      });
      payloadAnswer = JSON.stringify(correctMap);
    }

    try {
      let res;
      if (editingQuestionId) {
        res = await fetch(`${API_BASE}/api/questions/${editingQuestionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text_en: questionForm.text_en,
            question_text_bn: questionForm.text_bn,
            options_json: payloadOptions,
            correct_answer: payloadAnswer,
            marks: questionForm.marks
          })
        });
      } else {
        res = await fetch(`${API_BASE}/api/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: selectedExamIdBuilder,
            section_id: activeSectionId,
            question_type: currentSection.section_type,
            question_text_en: questionForm.text_en,
            question_text_bn: questionForm.text_bn,
            options_json: payloadOptions,
            correct_answer: payloadAnswer,
            marks: questionForm.marks
          })
        });
      }

      if (res.ok) {
        fetchSections(selectedExamIdBuilder);
        setEditingQuestionId(null);
        setQuestionForm({
          text_en: '',
          text_bn: '',
          options: ['', '', '', ''],
          correct_answer: '',
          marks: 1,
          fitb_blanks: [''],
          fitb_extras: [],
          match_pairs: [{ left: '', right: '' }, { left: '', right: '' }]
        });
        setBuilderStatus('Question saved successfully!');
        setTimeout(() => setBuilderStatus(''), 3000);
      }
    } catch (e) { console.error(e); }
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q.question_id);
    let opts = ['', '', '', ''];
    let blanks = [''];
    let extras: string[] = [];
    let pairs = [{ left: '', right: '' }, { left: '', right: '' }];

    if (q.question_type === 'FITB') {
      try {
        const correctArr = JSON.parse(q.correct_answer);
        blanks = Array.isArray(correctArr) ? correctArr : [''];
        let allOpts: string[] = [];
        try { allOpts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json; } catch(e) {}
        extras = allOpts.filter(o => !blanks.includes(o));
      } catch(e) {}
    } else if (q.question_type === 'MATCH') {
      let optObj: any = { left: [], right: [] };
      try { optObj = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json; } catch(e) {}
      if (optObj.left && optObj.right) {
        pairs = optObj.left.map((l: any, i: number) => ({
          left: l.text,
          right: optObj.right[i] ? optObj.right[i].text : ''
        }));
      }
    } else {
      try {
        const parsed = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
        if (Array.isArray(parsed)) opts = parsed;
      } catch(e) {}
    }

    setQuestionForm({
      text_en: q.question_text_en,
      text_bn: q.question_text_bn,
      options: opts,
      correct_answer: q.correct_answer,
      marks: q.marks,
      fitb_blanks: blanks,
      fitb_extras: extras,
      match_pairs: pairs
    });
  };

  // Monitor Exam Controls
  const triggerInitializeExam = () => {
    const activeExam = examsList.find(e => e.exam_id === selectedMonitorExamId);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    setInitExamName(activeExam ? `${activeExam.title} - ${dateStr}` : `Exam Attempt - ${dateStr}`);
    setInitTargetStudentId(null);
    setShowInitModal(true);
  };

  const triggerInitializeStudent = (student_id: string) => {
    const activeExam = examsList.find(e => e.exam_id === selectedMonitorExamId);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    setInitExamName(activeExam ? `${activeExam.title} - ${dateStr}` : `Exam Run - ${dateStr}`);
    setInitTargetStudentId(student_id);
    setShowInitModal(true);
  };

  const handleConfirmInitialize = () => {
    if (initTargetStudentId) {
      socket.emit('teacher_initialize_student', {
        exam_id: selectedMonitorExamId,
        student_id: initTargetStudentId,
        exam_name: initExamName
      });
    } else {
      socket.emit('teacher_initialize_exam', {
        exam_id: selectedMonitorExamId,
        exam_name: initExamName
      });
    }
    setShowInitModal(false);
  };

  const handleStartExam = () => {
    socket.emit('teacher_start_exam', { exam_id: selectedMonitorExamId });
  };

  const handlePauseExam = () => {
    socket.emit('teacher_pause_exam', { exam_id: selectedMonitorExamId });
  };

  const handleResumeExam = () => {
    socket.emit('teacher_resume_exam', { exam_id: selectedMonitorExamId });
  };

  const handleStopExam = () => {
    if (window.confirm('Are you sure you want to stop the exam? All active student sessions will be automatically submitted.')) {
      socket.emit('teacher_stop_exam', { exam_id: selectedMonitorExamId });
    }
  };

  const handleSafeResetExam = () => {
    if (window.confirm('Reset this examination for a new run/attempt? Note: All previous completed scores and answer sheets will be safely preserved in Results.')) {
      socket.emit('teacher_reset_exam', { exam_id: selectedMonitorExamId });
    }
  };

  const handleUnpauseStudent = (session_id: string) => {
    socket.emit('teacher_unpause_student', { session_id });
  };

  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null || totalSeconds === undefined) return '--:--';
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Teacher Control Panel</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Please enter the teacher master password to proceed</p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-bold mb-6 text-center border border-red-100 flex items-center justify-center gap-2">
              <AlertTriangle size={18} /> {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Master Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password (e.g. ICST)"
                className="block w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-4"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedMonitorExam = examsList.find(e => e.exam_id === selectedMonitorExamId);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'MONITOR' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Play size={18} /> Monitor
          </button>
          <button
            onClick={() => setActiveTab('REGISTRATION')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'REGISTRATION' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserPlus size={18} /> Registration
          </button>
          <button
            onClick={() => setActiveTab('BATCHES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'BATCHES' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers size={18} /> Batches
          </button>
          <button
            onClick={() => setActiveTab('EXAMS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'EXAMS' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen size={18} /> Exams
          </button>
          <button
            onClick={() => setActiveTab('RESULTS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
              activeTab === 'RESULTS' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award size={18} /> Results
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span> LAN Online
          </span>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50"
          >
            Lock Panel
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MONITOR TAB */}
      {/* ========================================================================= */}
      {activeTab === 'MONITOR' && (
        <div className="space-y-6">
          {/* Exam Selector & Controls */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Select Active Exam to Monitor</label>
              <select
                value={selectedMonitorExamId}
                onChange={(e) => setSelectedMonitorExamId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-base focus:ring-2 focus:ring-primary-500"
              >
                {examsList.map(e => (
                  <option key={e.exam_id} value={e.exam_id}>
                    {e.title} ({e.target_batch}) — [{e.status}]
                  </option>
                ))}
              </select>
            </div>

            {selectedMonitorExam && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining Time</p>
                  <p className="text-xl font-black text-slate-800">{formatTimer(examSecondsLeft)}</p>
                </div>

                {selectedMonitorExam.status === 'CREATED' && (
                  <>
                    <button
                      onClick={triggerInitializeExam}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                      <RotateCcw size={16} /> Initialize Exam
                    </button>
                    <button
                      onClick={handleStartExam}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-md transition-all transform hover:scale-105"
                    >
                      <Play size={16} /> Start Exam
                    </button>
                  </>
                )}

                {selectedMonitorExam.status === 'STARTED' && (
                  <>
                    <button
                      onClick={handlePauseExam}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Lock size={16} /> Pause Exam
                    </button>
                    <button
                      onClick={handleStopExam}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Square size={16} /> Stop Exam
                    </button>
                  </>
                )}

                {selectedMonitorExam.status === 'PAUSED' && (
                  <>
                    <button
                      onClick={handleResumeExam}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Play size={16} /> Resume Exam
                    </button>
                    <button
                      onClick={handleStopExam}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Square size={16} /> Stop Exam
                    </button>
                  </>
                )}

                {selectedMonitorExam.status === 'ENDED' && (
                  <button
                    onClick={handleSafeResetExam}
                    className="bg-slate-800 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                  >
                    <RotateCcw size={16} /> New Attempt / Retest
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Student Live Monitor Grid */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">Student Live Monitor</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Real-time examinee connection and status</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300"></span> Ready</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Logged In</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> Examinee</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Paused</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Completed</span>
              </div>
            </div>

            {studentsSession.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No examinees initialized for this exam yet. Click &quot;Initialize Exam&quot; to assign passwords and prepare sessions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {studentsSession.map((st) => {
                  let statusBg = 'bg-slate-50 border-slate-200 text-slate-600';
                  let statusBadge = 'bg-slate-200 text-slate-700';
                  if (st.status === 'LOGGED_IN') {
                    statusBg = 'bg-blue-50/50 border-blue-200';
                    statusBadge = 'bg-blue-500 text-white';
                  } else if (st.status === 'EXAMINEE') {
                    statusBg = 'bg-green-50/50 border-green-200';
                    statusBadge = 'bg-green-500 text-white';
                  } else if (st.status === 'PAUSED') {
                    statusBg = 'bg-amber-50/50 border-amber-300';
                    statusBadge = 'bg-amber-500 text-white animate-pulse';
                  } else if (st.status === 'COMPLETED') {
                    statusBg = 'bg-purple-50/50 border-purple-200';
                    statusBadge = 'bg-purple-500 text-white';
                  }

                  return (
                    <div key={st.student_id} className={`p-4 rounded-2xl border transition-all ${statusBg}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-black text-slate-400">ID: {st.student_id}</span>
                          <h4 className="font-extrabold text-slate-800 text-base leading-snug">{st.name}</h4>
                          {st.batch && <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{st.batch}</span>}
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusBadge}`}>
                          {st.status || 'READY'}
                        </span>
                      </div>

                      {st.password_provided && (
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60 my-2 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Password</span>
                          <span className="font-mono font-black text-slate-700">{st.password_provided}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 text-xs">
                        <span className="font-bold text-slate-500">Violations: <b className="text-red-500">{st.tab_violation_count || 0}</b></span>
                        
                        <div className="flex items-center gap-1.5">
                          {st.status === 'PAUSED' && st.session_id && (
                            <button
                              onClick={() => handleUnpauseStudent(st.session_id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-sm"
                            >
                              <Unlock size={12} /> Unlock
                            </button>
                          )}
                          {!st.session_id && (
                            <button
                              onClick={() => triggerInitializeStudent(st.student_id)}
                              className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[11px] rounded-lg shadow-sm"
                            >
                              Init
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REGISTRATION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'REGISTRATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Student Form */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="text-primary-600" size={20} />
              {isEditingStudent ? 'Edit Student Details' : 'Register New Student'}
            </h3>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Student ID (3-Digit)</label>
                <input
                  type="text"
                  required
                  value={newStudent.student_id}
                  onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                  placeholder="e.g. 001, 067"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newStudent.phone_no}
                  onChange={(e) => setNewStudent({ ...newStudent, phone_no: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Class / Standard</label>
                <select
                  value={newStudent.student_class}
                  onChange={(e) => setNewStudent({ ...newStudent, student_class: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Assigned Batch</label>
                <select
                  value={newStudent.batch}
                  onChange={(e) => setNewStudent({ ...newStudent, batch: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {batchesList.map(b => <option key={b.batch_id} value={b.name}>{b.name}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                {isEditingStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingStudent(false);
                      setNewStudent({ student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: batchesList[0]?.name || DEFAULT_BATCHES[0] });
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-sm"
                >
                  {isEditingStudent ? 'Update Student' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>

          {/* Student List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">All Registered Students</h3>
                <p className="text-xs font-bold text-slate-400">Total: {students.length} students</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search name, ID or batch..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Roll ID</th>
                    <th className="pb-3 px-3">Name</th>
                    <th className="pb-3 px-3">Batch</th>
                    <th className="pb-3 px-3">Class</th>
                    <th className="pb-3 px-3">Phone</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter(s => 
                      s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
                      s.student_id.includes(searchStudentQuery) ||
                      (s.batch && s.batch.toLowerCase().includes(searchStudentQuery.toLowerCase()))
                    )
                    .map(s => (
                      <tr key={s.student_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-black text-slate-800">{s.student_id}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{s.name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">
                            {s.batch}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{s.class}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-xs">{s.phone_no}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setNewStudent({
                                  student_id: s.student_id,
                                  name: s.name,
                                  phone_no: s.phone_no,
                                  student_class: s.class,
                                  batch: s.batch
                                });
                                setIsEditingStudent(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.student_id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BATCHES MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'BATCHES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-800">Batch Management</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Create, edit, rename batches and organize students</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search batch..."
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() => setCreatingBatch(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} /> New Batch
              </button>
            </div>
          </div>

          {/* Batches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batchesList
              .filter(b => b.name.toLowerCase().includes(batchSearchQuery.toLowerCase()))
              .map(batch => (
                <div key={batch.batch_id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-black text-slate-800">{batch.name}</h4>
                        <span className="text-xs font-bold text-slate-400">{batch.course_class || 'Class Standard'} • Session {batch.session || '2026'}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        batch.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {batch.status}
                      </span>
                    </div>

                    {batch.description && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{batch.description}</p>
                    )}

                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-100">
                      <Users size={18} className="text-primary-600" />
                      <span className="text-sm font-extrabold text-slate-700">{batch.student_count || 0} Students Assigned</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => openViewBatchStudents(batch)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Eye size={14} /> View Students
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingBatch(batch)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch.batch_id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Create Batch Modal */}
          {creatingBatch && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Create New Batch</h3>
                  <button onClick={() => setCreatingBatch(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Batch Name</label>
                    <input
                      type="text"
                      required
                      value={newBatchForm.name}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, name: e.target.value })}
                      placeholder="e.g. IX,X Batch 3"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Class / Course</label>
                    <input
                      type="text"
                      value={newBatchForm.course_class}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, course_class: e.target.value })}
                      placeholder="e.g. Class 9, 10"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Academic Session</label>
                    <input
                      type="text"
                      value={newBatchForm.session}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, session: e.target.value })}
                      placeholder="e.g. 2026-2027"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={newBatchForm.description}
                      onChange={(e) => setNewBatchForm({ ...newBatchForm, description: e.target.value })}
                      rows={2}
                      placeholder="Optional notes or schedule..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setCreatingBatch(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md">Create Batch</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Batch Modal */}
          {editingBatch && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Edit / Rename Batch</h3>
                  <button onClick={() => setEditingBatch(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateBatch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Batch Name (Rename)</label>
                    <input
                      type="text"
                      required
                      value={editingBatch.name}
                      onChange={(e) => setEditingBatch({ ...editingBatch, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Class / Course</label>
                    <input
                      type="text"
                      value={editingBatch.course_class || ''}
                      onChange={(e) => setEditingBatch({ ...editingBatch, course_class: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={editingBatch.status}
                      onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setEditingBatch(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Batch Students & Transfer Modal */}
          {viewingBatchStudents && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Students in {viewingBatchStudents.name}</h3>
                    <p className="text-xs font-bold text-slate-400">{batchStudents.length} total enrolled student(s)</p>
                  </div>
                  <button onClick={() => setViewingBatchStudents(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                {/* Transfer Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-600">
                    Selected: <b className="text-primary-600 font-black">{selectedStudentsToMove.length}</b> student(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={targetMoveBatch}
                      onChange={(e) => setTargetMoveBatch(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                    >
                      <option value="">Select Destination Batch...</option>
                      {batchesList
                        .filter(b => b.name !== viewingBatchStudents.name)
                        .map(b => <option key={b.batch_id} value={b.name}>{b.name}</option>)}
                    </select>
                    <button
                      onClick={handleMoveStudents}
                      disabled={!targetMoveBatch || selectedStudentsToMove.length === 0}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1"
                    >
                      <ArrowRightLeft size={14} /> Move Selected
                    </button>
                  </div>
                </div>

                {/* Student Table */}
                <div className="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedStudentsToMove.length === batchStudents.length && batchStudents.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedStudentsToMove(batchStudents.map(s => s.student_id));
                              else setSelectedStudentsToMove([]);
                            }}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="p-3">Roll ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">No students in this batch yet.</td>
                        </tr>
                      ) : (
                        batchStudents.map(s => {
                          const isSelected = selectedStudentsToMove.includes(s.student_id);
                          return (
                            <tr key={s.student_id} className={`hover:bg-slate-50 ${isSelected ? 'bg-primary-50/50' : ''}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedStudentsToMove(prev => [...prev, s.student_id]);
                                    else setSelectedStudentsToMove(prev => prev.filter(id => id !== s.student_id));
                                  }}
                                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                              </td>
                              <td className="p-3 font-mono font-black text-slate-800">{s.student_id}</td>
                              <td className="p-3 font-bold text-slate-800">{s.name}</td>
                              <td className="p-3 text-slate-600">{s.class}</td>
                              <td className="p-3 text-slate-500 font-mono text-xs">{s.phone_no}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXAMS & QUESTION BUILDER TAB */}
      {/* ========================================================================= */}
      {activeTab === 'EXAMS' && (
        <div className="space-y-6">
          {!selectedExamIdBuilder ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Examination Sets</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage question sets and multi-batch assignments</p>
                </div>
                <button
                  onClick={() => setCreatingExam(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm"
                >
                  <Plus size={18} /> Create Examination
                </button>
              </div>

              {/* Exams Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Title</th>
                      <th className="pb-3 px-3">Assigned Batches</th>
                      <th className="pb-3 px-3">Duration</th>
                      <th className="pb-3 px-3">Full Marks</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examsList.map(e => (
                      <tr key={e.exam_id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-3 font-bold text-slate-800">{e.title}</td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {e.assigned_batches && e.assigned_batches.length > 0 ? (
                              e.assigned_batches.map(b => (
                                <span key={b.batch_name} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded flex items-center gap-1">
                                  {b.batch_name}
                                  {b.shuffle_enabled && <Shuffle size={10} className="text-primary-600" />}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                {e.target_batch}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">{e.duration_minutes} Mins</td>
                        <td className="py-3.5 px-3 font-bold text-slate-700">{e.full_marks}</td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-0.5 bg-primary-50 text-primary-700 text-xs font-black rounded-full">
                            {e.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownloadTeacherQuestionPaper(e.exam_id, e.title)}
                              title="Download Full Question Set with Answers (PDF)"
                              disabled={isDownloadingQuestionPaper}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                              <Download size={14} /> Download Set
                            </button>
                            <button
                              onClick={() => setSelectedExamIdBuilder(e.exam_id)}
                              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Edit Questions
                            </button>
                            <button
                              onClick={() => handleOpenEditExam(e)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Question & Section Builder Screen */
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <button
                  onClick={() => setSelectedExamIdBuilder(null)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm"
                >
                  <ArrowLeft size={18} /> Back to Exam Sets
                </button>
                
                {builderStatus && (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    {builderStatus}
                  </span>
                )}

                <button
                  onClick={() => {
                    const exam = examsList.find(e => e.exam_id === selectedExamIdBuilder);
                    if (exam) handleDownloadTeacherQuestionPaper(exam.exam_id, exam.title);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Download Question Set (PDF)
                </button>
              </div>

              {/* Sections Bar */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Examination Sections</h4>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  {builderSections.map(sec => (
                    <button
                      key={sec.section_id}
                      onClick={() => setActiveSectionId(sec.section_id)}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeSectionId === sec.section_id
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{sec.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-black/10">
                        {sec.questions ? sec.questions.length : 0} Qs
                      </span>
                    </button>
                  ))}
                </div>

                {/* Add Section Form */}
                <form onSubmit={handleAddSection} className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                  <input
                    type="text"
                    required
                    placeholder="New Section Title (e.g. Section A - Multiple Choice)"
                    value={newSectionForm.title}
                    onChange={(e) => setNewSectionForm({ ...newSectionForm, title: e.target.value })}
                    className="flex-1 min-w-[200px] px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                  />
                  <select
                    value={newSectionForm.section_type}
                    onChange={(e) => setNewSectionForm({ ...newSectionForm, section_type: e.target.value })}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="FITB">Fill in the Blanks (FITB)</option>
                    <option value="TF">True / False</option>
                    <option value="MATCH">Match the Following</option>
                  </select>
                  <input
                    type="number"
                    value={newSectionForm.section_marks}
                    onChange={(e) => setNewSectionForm({ ...newSectionForm, section_marks: parseInt(e.target.value) || 0 })}
                    placeholder="Marks"
                    className="w-24 px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-black text-white font-bold text-sm rounded-xl shadow-sm"
                  >
                    Add Section
                  </button>
                </form>
              </div>

              {/* Question Editor */}
              {activeSectionId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Create / Edit Question Form */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h4 className="text-base font-black text-slate-800 mb-4">
                      {editingQuestionId ? 'Edit Question' : 'Add Question to Section'}
                    </h4>

                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Question Text (English)</label>
                        <textarea
                          required
                          rows={2}
                          value={questionForm.text_en}
                          onChange={(e) => setQuestionForm({ ...questionForm, text_en: e.target.value })}
                          placeholder="e.g. Which keyword is used to inherit a class in Java?"
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Question Text (Bengali Optional)</label>
                        <textarea
                          rows={2}
                          value={questionForm.text_bn}
                          onChange={(e) => setQuestionForm({ ...questionForm, text_bn: e.target.value })}
                          placeholder="বাংলা প্রশ্ন লিখুন (ঐচ্ছিক)..."
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Options rendering by section type */}
                      {(() => {
                        const sec = builderSections.find(s => s.section_id === activeSectionId);
                        if (sec?.section_type === 'MCQ') {
                          return (
                            <div className="space-y-2">
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Options & Correct Answer</label>
                              {questionForm.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="correctOption"
                                    checked={questionForm.correct_answer === opt && opt.trim() !== ''}
                                    onChange={() => setQuestionForm({ ...questionForm, correct_answer: opt })}
                                    className="text-primary-600 focus:ring-primary-500"
                                  />
                                  <input
                                    type="text"
                                    required
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...questionForm.options];
                                      newOpts[optIdx] = e.target.value;
                                      setQuestionForm({ ...questionForm, options: newOpts });
                                    }}
                                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-medium"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        } else if (sec?.section_type === 'TF') {
                          return (
                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Select Correct Answer</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 font-bold text-sm">
                                  <input
                                    type="radio"
                                    name="tfAns"
                                    value="True"
                                    checked={questionForm.correct_answer === 'True'}
                                    onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'True' })}
                                    className="text-primary-600 focus:ring-primary-500"
                                  />
                                  True (সত্য)
                                </label>
                                <label className="flex items-center gap-2 font-bold text-sm">
                                  <input
                                    type="radio"
                                    name="tfAns"
                                    value="False"
                                    checked={questionForm.correct_answer === 'False'}
                                    onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'False' })}
                                    className="text-primary-600 focus:ring-primary-500"
                                  />
                                  False (মিথ্যা)
                                </label>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Marks</label>
                        <input
                          type="number"
                          value={questionForm.marks}
                          onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                          className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-bold"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        {editingQuestionId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(null);
                              setQuestionForm({
                                text_en: '', text_bn: '', options: ['', '', '', ''], correct_answer: '', marks: 1, fitb_blanks: [''], fitb_extras: [], match_pairs: [{ left: '', right: '' }, { left: '', right: '' }]
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-md"
                        >
                          {editingQuestionId ? 'Update Question' : 'Save Question'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Section Questions List */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h4 className="text-base font-black text-slate-800 mb-4">Questions in Section</h4>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {builderSections
                        .find(s => s.section_id === activeSectionId)
                        ?.questions?.map((q, qIdx) => (
                          <div key={q.question_id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-extrabold text-slate-800 text-sm">
                                {qIdx + 1}. {q.question_text_en}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditQuestion(q)}
                                  className="p-1 text-slate-400 hover:text-primary-600"
                                >
                                  <Edit size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-green-700 font-bold">
                              Correct: {q.correct_answer}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Exam Modal with Multi-Batch Checkboxes & Per-Batch Shuffle */}
          {creatingExam && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Create Examination</h3>
                  <button onClick={() => setCreatingExam(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleCreateExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Exam Title</label>
                    <input
                      type="text"
                      required
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                      placeholder="e.g. Mid Term Mathematics 2026"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={examForm.duration_minutes}
                        onChange={(e) => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Full Marks</label>
                      <input
                        type="number"
                        required
                        value={examForm.full_marks}
                        onChange={(e) => setExamForm({ ...examForm, full_marks: parseInt(e.target.value) || 100 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  {/* Multi-Batch Selection & Shuffle Toggle */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      Assign Batches & Question Shuffle
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3">
                      {batchesList.map(batch => {
                        const isAssigned = examForm.assigned_batches.some(b => b.batch_name === batch.name);
                        const assignedObj = examForm.assigned_batches.find(b => b.batch_name === batch.name);
                        const shuffle = assignedObj ? assignedObj.shuffle_enabled : false;

                        return (
                          <div key={batch.batch_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExamForm({
                                      ...examForm,
                                      assigned_batches: [...examForm.assigned_batches, { batch_name: batch.name, shuffle_enabled: false }]
                                    });
                                  } else {
                                    setExamForm({
                                      ...examForm,
                                      assigned_batches: examForm.assigned_batches.filter(b => b.batch_name !== batch.name)
                                    });
                                  }
                                }}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              {batch.name}
                            </label>

                            {isAssigned && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExamForm({
                                    ...examForm,
                                    assigned_batches: examForm.assigned_batches.map(b => 
                                      b.batch_name === batch.name ? { ...b, shuffle_enabled: !b.shuffle_enabled } : b
                                    )
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                                  shuffle ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <Shuffle size={12} /> Shuffle: {shuffle ? 'ON' : 'OFF'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setCreatingExam(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md">Create & Build Set</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Exam Multi-Batch Modal */}
          {editingExamId && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Edit Examination Config</h3>
                  <button onClick={() => setEditingExamId(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveEditExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Exam Title</label>
                    <input
                      type="text"
                      required
                      value={editExamForm.title}
                      onChange={(e) => setEditExamForm({ ...editExamForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={editExamForm.duration_minutes}
                        onChange={(e) => setEditExamForm({ ...editExamForm, duration_minutes: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Full Marks</label>
                      <input
                        type="number"
                        required
                        value={editExamForm.full_marks}
                        onChange={(e) => setEditExamForm({ ...editExamForm, full_marks: parseInt(e.target.value) || 100 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  {/* Multi-Batch Selection & Shuffle Toggle */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      Assigned Batches & Question Shuffle
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-3">
                      {batchesList.map(batch => {
                        const isAssigned = editExamForm.assigned_batches.some(b => b.batch_name === batch.name);
                        const assignedObj = editExamForm.assigned_batches.find(b => b.batch_name === batch.name);
                        const shuffle = assignedObj ? assignedObj.shuffle_enabled : false;

                        return (
                          <div key={batch.batch_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditExamForm({
                                      ...editExamForm,
                                      assigned_batches: [...editExamForm.assigned_batches, { batch_name: batch.name, shuffle_enabled: false }]
                                    });
                                  } else {
                                    setEditExamForm({
                                      ...editExamForm,
                                      assigned_batches: editExamForm.assigned_batches.filter(b => b.batch_name !== batch.name)
                                    });
                                  }
                                }}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              {batch.name}
                            </label>

                            {isAssigned && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditExamForm({
                                    ...editExamForm,
                                    assigned_batches: editExamForm.assigned_batches.map(b => 
                                      b.batch_name === batch.name ? { ...b, shuffle_enabled: !b.shuffle_enabled } : b
                                    )
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                                  shuffle ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <Shuffle size={12} /> Shuffle: {shuffle ? 'ON' : 'OFF'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setEditingExamId(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RESULTS TAB (PAGINATED ATTEMPTS & HISTORICAL SEARCH) */}
      {/* ========================================================================= */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-800">Examination Results & Retest History</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Paginated historical attempts (10 per page)</p>
            </div>
            
            {/* Server-side Search */}
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search exam attempt name..."
                  value={examRunsSearch}
                  onChange={(e) => {
                    setExamRunsSearch(e.target.value);
                    fetchExamRuns(0, e.target.value);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Runs List (10 per request) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Latest 10 Examination Runs</h4>
                <span className="text-xs font-bold text-slate-500">Total: {examRunsTotal}</span>
              </div>

              {isRunsLoading ? (
                <div className="p-8 text-center text-slate-400 font-bold">Loading examination runs...</div>
              ) : examRuns.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">No examination runs found.</div>
              ) : (
                <div className="space-y-2.5">
                  {examRuns.map(run => {
                    const isSelected = selectedRun?.run_id === run.run_id;
                    return (
                      <div
                        key={run.run_id}
                        onClick={() => openRunResults(run)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/60 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h5 className="font-extrabold text-slate-800 text-sm leading-snug">{run.exam_name}</h5>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteExamRun(run.run_id);
                            }}
                            title="Delete this historical run"
                            className="text-slate-300 hover:text-red-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{run.exam_title}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 text-[11px] font-bold text-slate-400">
                          <span>{new Date(run.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-primary-700 bg-primary-100/60 px-2 py-0.5 rounded-full">{run.completed_students} / {run.total_students} submitted</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={examRunsOffset === 0 || isRunsLoading}
                  onClick={() => {
                    const newOffset = Math.max(0, examRunsOffset - 10);
                    fetchExamRuns(newOffset, examRunsSearch);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {Math.floor(examRunsOffset / 10) + 1} of {Math.max(1, Math.ceil(examRunsTotal / 10))}
                </span>
                <button
                  disabled={examRunsOffset + 10 >= examRunsTotal || isRunsLoading}
                  onClick={() => {
                    const newOffset = examRunsOffset + 10;
                    fetchExamRuns(newOffset, examRunsSearch);
                  }}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm"
                >
                  Next 10 <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Run Scorecard / Details View */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              {selectedRun ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                        Attempt Scorecard
                      </span>
                      <h3 className="text-xl font-black text-slate-800 mt-2">{selectedRun.exam_name}</h3>
                      <p className="text-xs font-bold text-slate-400">Exam: {selectedRun.exam_title} • Full Marks: {selectedRun.full_marks}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">Roll ID</th>
                          <th className="pb-3 px-3">Student Name</th>
                          <th className="pb-3 px-3">Batch</th>
                          <th className="pb-3 px-3">Score</th>
                          <th className="pb-3 px-3">Status</th>
                          <th className="pb-3 px-3">Violations</th>
                          <th className="pb-3 px-3 text-right">Answer Sheet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {runResultsData.map((res) => (
                          <tr key={res.student_id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3 font-mono font-black text-slate-800">{res.student_id}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{res.name}</td>
                            <td className="py-3 px-3 text-xs font-bold text-slate-500">{res.batch}</td>
                            <td className="py-3 px-3 font-extrabold text-primary-600 text-base">
                              {res.score} / {res.full_marks}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                res.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {res.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-600">{res.tab_violation_count || 0}</td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => openAnswerSheet(res.student_id, selectedRun.exam_id)}
                                className="px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold rounded-lg transition-colors"
                              >
                                View Sheet
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-400 font-bold">
                  Select an examination run from the left list to view student scorecards and answer sheets.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. INITIALIZATION MODAL (EXAMINATION NAME PROMPT) */}
      {/* ========================================================================= */}
      {showInitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800">Initialize Examination Run</h3>
              <button onClick={() => setShowInitModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mb-6">
              Enter a name for this examination attempt / retest run. This name will appear on the Results panel and will preserve past scores separately.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Examination Attempt Name</label>
                <input
                  type="text"
                  required
                  value={initExamName}
                  onChange={(e) => setInitExamName(e.target.value)}
                  placeholder="e.g. Mid Term Mathematics - Retest 1"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInitModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInitialize}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Initialize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. STUDENT ANSWER SHEET MODAL */}
      {/* ========================================================================= */}
      {selectedStudentForAnswers && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-black">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {answerSheetData ? answerSheetData.student.name : 'Loading Answer Sheet...'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    ID: {answerSheetData?.student?.student_id} • Score: {answerSheetData?.student?.score} / {answerSheetData?.student?.full_marks}
                  </p>
                </div>
              </div>
              <button onClick={closeAnswerSheet} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {isAnswerSheetLoading ? (
                <div className="p-12 text-center text-slate-400 font-bold">Loading submitted answer sheet...</div>
              ) : !answerSheetData ? (
                <div className="p-12 text-center text-slate-400 font-bold">No answers recorded for this session.</div>
              ) : (
                answerSheetData.answers.map((qa: any, idx: number) => {
                  const isCorrect = qa.is_correct;
                  return (
                    <div key={qa.question_id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-extrabold text-slate-800 text-sm">
                          {idx + 1}. {qa.question_text_en}
                        </span>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {isCorrect ? `+${qa.awarded_marks || qa.marks} Marks` : '0 Marks'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-slate-600">
                          Student Answer: <span className="font-black text-slate-800">{qa.student_answer || '(No submission)'}</span>
                        </p>
                        <p className="font-bold text-green-700">
                          Correct Answer: <span className="font-black">{qa.correct_answer}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => navigateAnswerSheet('prev')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Prev Student
              </button>
              <button
                onClick={() => navigateAnswerSheet('next')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                Next Student <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
