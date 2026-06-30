import { useState, useEffect, useRef } from 'react';
import { socket, API_BASE } from '../App';
import { Users, Play, Unlock, UserPlus, BookOpen, Plus, Save, AlertTriangle, ArrowLeft, Trash2, Square, Award, Download, Lock, Edit, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

interface StudentSession {
  session_id: string;
  student_id: string;
  name: string;
  status: 'LOGGED_IN' | 'EXAMINEE' | 'PAUSED' | 'COMPLETED' | 'ABSENT';
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

interface Exam {
  exam_id: string;
  title: string;
  duration_minutes: number;
  target_batch: string;
  full_marks: number;
  status: 'DRAFT' | 'CREATED' | 'STARTED' | 'PAUSED' | 'ENDED';
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
}

const BATCHES = [
  'V,VI Batch 1',
  'V,VI,VII Batch -2',
  'VIII,IX Batch - 1',
  'VII,VIII,IX Batch 2',
  'JDX IX,X'
];

export default function TeacherDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'MONITOR' | 'REGISTRATION' | 'EXAMS' | 'RESULTS'>('MONITOR');
  
  // Registration State
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: BATCHES[0] });
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // Exams Management State
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [creatingExam, setCreatingExam] = useState(false);
  const [examForm, setExamForm] = useState({ title: '', duration_minutes: 30, target_batch: BATCHES[0], full_marks: 100 });
  const [selectedExamIdBuilder, setSelectedExamIdBuilder] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamForm, setEditExamForm] = useState({ title: '', duration_minutes: 30, full_marks: 100 });
  
  // Section & Question Builder State
  const [builderSections, setBuilderSections] = useState<Section[]>([]);
  const [newSectionForm, setNewSectionForm] = useState({ title: '', section_marks: 20, section_type: 'MCQ' });
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ text_en: '', text_bn: '', options: ['', '', '', ''], correct_answer: '', marks: 1, fitb_blanks: [''], fitb_extras: [] as string[] });
  const [builderStatus, setBuilderStatus] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Monitor State
  const [selectedMonitorExamId, setSelectedMonitorExamId] = useState<string>('');
  const [studentsSession, setStudentsSession] = useState<StudentSession[]>([]);
  const [recoveryPrompt, setRecoveryPrompt] = useState<Exam | null>(null);
  const [examSecondsLeft, setExamSecondsLeft] = useState<number | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Results State
  const [selectedResultExamId, setSelectedResultExamId] = useState<string>('');
  const [resultsData, setResultsData] = useState<ResultData[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Answer Sheet View State
  const [selectedStudentForAnswers, setSelectedStudentForAnswers] = useState<string | null>(null);
  const [answerSheetData, setAnswerSheetData] = useState<any>(null);
  const [isAnswerSheetLoading, setIsAnswerSheetLoading] = useState(false);

  const openAnswerSheet = async (student_id: string) => {
    setSelectedStudentForAnswers(student_id);
    setAnswerSheetData(null);
    setIsAnswerSheetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/exams/${selectedResultExamId}/results/${student_id}/answers`);
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
    if (!selectedStudentForAnswers || resultsData.length === 0) return;
    const currentIndex = resultsData.findIndex(r => r.student_id === selectedStudentForAnswers);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'next' && currentIndex < resultsData.length - 1) newIndex = currentIndex + 1;
    
    if (newIndex !== currentIndex) {
      openAnswerSheet(resultsData[newIndex].student_id);
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
          setRecoveryPrompt(data.active_exam);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    socket.emit('join_teacher_dashboard');
    fetchData();
    checkRecovery();
    
    socket.on('dashboard_update', (data: { students: StudentSession[], status: any, global_seconds_left?: number }) => {
      setStudentsSession(data.students);
      if (data.global_seconds_left !== undefined) {
        setExamSecondsLeft(data.global_seconds_left);
      }
      // Status is now derived directly from examsList
    });

    socket.on('student_status_update', (data: Partial<StudentSession>) => {
      setStudentsSession(prev => prev.map(s => s.student_id === data.student_id ? { ...s, ...data } : s));
    });

    socket.on('exam_status_update', (data: { exam_id: string, status: string }) => {
      setExamsList(prev => prev.map(e => e.exam_id === data.exam_id ? { ...e, status: data.status as any } : e));
      if (data.status === 'ENDED') {
        setIsEnding(false);
      }
    });

    return () => {
      socket.off('dashboard_update');
      socket.off('student_status_update');
      socket.off('exam_status_update');
    };
  }, []);

  // Local timer for TeacherDashboard to tick down active sessions and main exam
  useEffect(() => {
    const timer = setInterval(() => {
      setStudentsSession(prev => prev.map(student => {
        if (student.status === 'EXAMINEE' && student.seconds_left !== null && student.seconds_left > 0) {
          return { ...student, seconds_left: student.seconds_left - 1 };
        }
        return student;
      }));
      setExamSecondsLeft(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Whenever the builder exam changes, fetch its sections
  const fetchSections = async () => {
    if (!selectedExamIdBuilder) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/${selectedExamIdBuilder}/sections`);
      if (res.ok) setBuilderSections(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSections();
    setActiveSectionId(null);
  }, [selectedExamIdBuilder]);

  // Whenever the monitor exam changes, fetch its students
  useEffect(() => {
    if (selectedMonitorExamId) {
      setStudentsSession([]); // Clear immediately for visual feedback
      socket.emit('monitor_exam', { exam_id: selectedMonitorExamId });
    }
  }, [selectedMonitorExamId]);

  // Whenever the results exam changes or exam ends, fetch its results
  useEffect(() => {
    const fetchResults = async () => {
      if (!selectedResultExamId) return;
      try {
        const res = await fetch(`${API_BASE}/api/exams/${selectedResultExamId}/results`);
        if (res.ok) {
          setResultsData(await res.json());
        }
      } catch (e) { console.error(e); }
    };
    fetchResults();
  }, [selectedResultExamId, examsList.find(e => e.exam_id === selectedResultExamId)?.status]);

  // Result Export Handlers
  const handleDownloadPDF = async () => {
    try {
      if (!resultsRef.current) return;
      const imgData = await htmlToImage.toJpeg(resultsRef.current, { quality: 1.0, backgroundColor: '#ffffff', pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (resultsRef.current.offsetHeight * pdfWidth) / resultsRef.current.offsetWidth;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Exam_Results_${selectedResultExamId}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  const handleDownloadJPG = async () => {
    try {
      if (!resultsRef.current) return;
      const imgData = await htmlToImage.toJpeg(resultsRef.current, { quality: 1.0, backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Exam_Results_${selectedResultExamId}.jpg`;
      link.href = imgData;
      link.click();
    } catch (e) {
      console.error(e);
      alert("Failed to generate JPG. Check console for details.");
    }
  };

  // Handlers for Monitor
  const handleStartExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to start this exam?");
    if (confirm) {
      socket.emit('teacher_start_exam', { exam_id: selectedMonitorExamId });
      fetchData(); // Refresh list to update status
    }
  };

  const handleEndExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to end this examination? All students will be submitted immediately.");
    if (confirm) {
      setIsEnding(true);
      socket.emit('teacher_stop_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handlePauseExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to pause this exam for all students?");
    if (confirm) {
      socket.emit('teacher_pause_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handleResumeExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to resume this exam?");
    if (confirm) {
      socket.emit('teacher_resume_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handleRestartExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to restart this ended exam? Students will be able to log back in.");
    if (confirm) {
      socket.emit('teacher_restart_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handleUnpauseStudent = (session_id: string) => {
    socket.emit('teacher_unpause_student', { session_id });
  };

  const handleInitializeAll = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to initialize all students? This will assign them passwords and get them ready for the exam.");
    if (confirm) {
      socket.emit('teacher_initialize_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handleInitializeStudent = (student_id: string) => {
    if (!selectedMonitorExamId) return;
    socket.emit('teacher_initialize_student', { exam_id: selectedMonitorExamId, student_id });
  };

  const handleHardResetStudent = (student_id: string) => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("Are you sure you want to HARD RESET this student? This will permanently delete their entire session, clear all answers, and revoke their password. They will need to be initialized again.");
    if (confirm) {
      socket.emit('teacher_hard_reset_student', { exam_id: selectedMonitorExamId, student_id });
    }
  };

  const handleHardResetExam = () => {
    if (!selectedMonitorExamId) return;
    const confirm = window.confirm("WARNING: Are you sure you want to HARD RESET THE ENTIRE EXAM? This will permanently delete ALL student sessions, passwords, results, and progress for this exam. It cannot be undone.");
    if (confirm) {
      socket.emit('teacher_hard_reset_exam', { exam_id: selectedMonitorExamId });
      setTimeout(fetchData, 500);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === 'ICST') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect Password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <div className="bg-primary-50 p-4 rounded-full inline-flex mb-4 text-primary-500 ring-8 ring-primary-50/50">
              <Lock size={32} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Teacher Access</h2>
            <p className="text-slate-500 font-medium mt-2">Enter the master password to access the panel.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password" 
                className={`w-full p-4 border rounded-xl focus:ring-2 outline-none font-bold text-center text-xl tracking-widest ${
                  authError ? 'border-red-300 bg-red-50 focus:ring-red-500 text-red-800' : 'border-slate-200 focus:ring-primary-500'
                }`}
                autoFocus
              />
              {authError && <p className="text-red-500 text-sm font-bold text-center mt-2">{authError}</p>}
            </div>
            <button type="submit" className="w-full bg-gradient-accent hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all text-lg">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Handlers for Registration
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingStudent && students.some(s => s.student_id === newStudent.student_id)) {
      return; // Block submission if ID exists and we aren't editing
    }
    
    try {
      await fetch(API_BASE + '/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      fetchData();
      setNewStudent({ ...newStudent, student_id: '', name: '', phone_no: '' });
      setIsEditingStudent(false);
    } catch (e) { console.error(e); }
  };

  const handleEditStudentClick = (student: Student) => {
    setNewStudent({
      student_id: student.student_id,
      name: student.name,
      phone_no: student.phone_no,
      student_class: student.class,
      batch: student.batch
    });
    setIsEditingStudent(true);
  };

  const handleDeleteStudent = async (student_id: string) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this student and all their exam data?");
    if (confirm) {
      try {
        await fetch(`${API_BASE}/api/students/${student_id}`, { method: 'DELETE' });
        fetchData();
        // If we are currently editing the deleted student, reset the form
        if (isEditingStudent && newStudent.student_id === student_id) {
          setIsEditingStudent(false);
          setNewStudent({ student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: BATCHES[0] });
        }
      } catch (e) { console.error(e); }
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) || 
    s.student_id.includes(searchStudentQuery)
  );

  // Handlers for Exams Management
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(API_BASE + '/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examForm)
      });
      const data = await res.json();
      if (data.success && data.exam) {
        setCreatingExam(false);
        setExamForm({ title: '', duration_minutes: 30, target_batch: BATCHES[0], full_marks: 100 });
        fetchData();
        setSelectedExamIdBuilder(data.exam.exam_id);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteExam = async (exam_id: string) => {
    const password = window.prompt("WARNING: This will permanently delete this exam and all its questions/sessions.\n\nEnter password to confirm deletion:");
    if (password === 'ICST') {
      try {
        await fetch(`${API_BASE}/api/exams/${exam_id}`, { method: 'DELETE' });
        if (selectedMonitorExamId === exam_id) setSelectedMonitorExamId('');
        fetchData();
      } catch (e) { console.error(e); }
    } else if (password !== null) {
      alert("Incorrect password!");
    }
  };

  const handleUpdateExam = async () => {
    if (!editingExamId) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/${editingExamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editExamForm)
      });
      if (res.ok) {
        setEditingExamId(null);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  // Handlers for Exam Builder

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamIdBuilder) return;
    try {
      await fetch(API_BASE + '/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: selectedExamIdBuilder, ...newSectionForm })
      });
      fetchSections();
      setNewSectionForm({ title: '', section_marks: 20, section_type: 'MCQ' });
    } catch (e) { console.error(e); }
  };

  const handleEditQuestion = (q: any, sectionId: string) => {
    setActiveSectionId(sectionId);
    setEditingQuestionId(q.question_id);
    
    let fitb_blanks = [''];
    let fitb_extras: string[] = [];
    
    if (q.question_type === 'FITB') {
      try {
        fitb_blanks = JSON.parse(q.correct_answer);
        const allOptions = q.options_json || [];
        fitb_extras = allOptions.filter((opt: string) => !fitb_blanks.includes(opt));
      } catch(e) {}
    }
    
    setQuestionForm({
      text_en: q.question_text_en,
      text_bn: q.question_text_bn,
      options: q.question_type === 'MCQ' ? [...(q.options_json || []), '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correct_answer: q.question_type === 'MCQ' || q.question_type === 'TF' ? q.correct_answer : '',
      marks: q.marks,
      fitb_blanks: fitb_blanks.length ? fitb_blanks : [''],
      fitb_extras
    });
  };

  const handleDeleteSection = async (section_id: string) => {
    if (!window.confirm("Delete this section and all its questions?")) return;
    try {
      await fetch(`${API_BASE}/api/sections/${section_id}`, { method: 'DELETE' });
      fetchSections();
    } catch (e) { console.error(e); }
  };

  const handlePublishExam = async () => {
    if (!selectedExamIdBuilder) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/${selectedExamIdBuilder}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSelectedExamIdBuilder(null);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) { console.error(e); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamIdBuilder || !activeSectionId) return;

    const currentSection = builderSections.find(s => s.section_id === activeSectionId);
    const qType = currentSection ? currentSection.section_type : 'MCQ';

    let finalOptions = questionForm.options;
    let finalCorrect = questionForm.correct_answer;

    if (qType === 'MCQ') {
      finalOptions = questionForm.options.filter(o => o.trim() !== '');
    } else if (qType === 'TF') {
      finalOptions = ['True', 'False'];
      if (!finalCorrect) finalCorrect = 'True';
    } else if (qType === 'FITB') {
      const validBlanks = questionForm.fitb_blanks.map(b => b.trim()).filter(b => b !== '');
      const validExtras = questionForm.fitb_extras.map(e => e.trim()).filter(e => e !== '');
      finalCorrect = JSON.stringify(validBlanks);
      finalOptions = [...validBlanks, ...validExtras];
    }
    
    try {
      const url = editingQuestionId 
        ? `${API_BASE}/api/questions/${editingQuestionId}`
        : `${API_BASE}/api/questions`;
      const method = editingQuestionId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamIdBuilder,
          section_id: activeSectionId,
          question_type: qType,
          question_text_en: questionForm.text_en,
          question_text_bn: questionForm.text_bn,
          options_json: finalOptions,
          correct_answer: finalCorrect.trim(),
          marks: questionForm.marks
        })
      });
      fetchSections();
      setBuilderStatus(editingQuestionId ? 'Question updated successfully!' : 'Question added successfully!');
      setTimeout(() => setBuilderStatus(''), 3000);
      setEditingQuestionId(null);
      setQuestionForm({ ...questionForm, text_en: '', text_bn: '', options: ['', '', '', ''], correct_answer: '', fitb_blanks: [''], fitb_extras: [] });
    } catch (e) { console.error(e); }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'LOGGED_IN': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Ready</span>;
      case 'EXAMINEE': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>;
      case 'PAUSED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">Locked Out</span>;
      case 'COMPLETED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Finished</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Absent</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Recovery Prompt */}
      {recoveryPrompt && (
        <div className="bg-red-50 border-2 border-red-500 p-6 rounded-2xl shadow-lg relative z-50">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-xl text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-red-800 tracking-tight">Power Cut / Interruption Detected</h3>
              <p className="text-red-700 font-medium mt-1">
                The exam <strong>"{recoveryPrompt.title}"</strong> was marked as STARTED but the server was restarted. 
                Do you want to resume this session?
              </p>
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={() => { 
                    setSelectedMonitorExamId(recoveryPrompt.exam_id);
                    setRecoveryPrompt(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm"
                >
                  Yes, Resume Session
                </button>
                <button 
                  onClick={() => setRecoveryPrompt(null)}
                  className="bg-white hover:bg-red-100 text-red-700 px-6 py-2 rounded-xl font-bold transition-colors border border-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        {[
          { id: 'MONITOR', label: 'Live Monitor', icon: <Users size={18} /> },
          { id: 'REGISTRATION', label: 'Student Registration', icon: <UserPlus size={18} /> },
          { id: 'EXAMS', label: 'Exams Management', icon: <BookOpen size={18} /> },
          { id: 'RESULTS', label: 'Results & Export', icon: <Award size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSelectedExamIdBuilder(null); setCreatingExam(false); }}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.id 
                ? 'bg-primary-500 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* MONITOR TAB */}
      {activeTab === 'MONITOR' && (() => {
        const currentMonitorExam = examsList.find(e => e.exam_id === selectedMonitorExamId);
        const derivedStatus = currentMonitorExam ? currentMonitorExam.status : 'CREATED';
        
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Master Control Panel</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-500 font-bold text-sm">Select Target Exam:</span>
                  <select 
                    value={selectedMonitorExamId} 
                    onChange={(e) => setSelectedMonitorExamId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 font-bold"
                  >
                    {examsList.map(ex => (
                      <option key={ex.exam_id} value={ex.exam_id}>
                        {ex.title} ({ex.target_batch}) - {ex.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {derivedStatus === 'STARTED' && (
                  <>
                    <button onClick={handlePauseExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-md">
                      Pause Exam
                    </button>
                    <button onClick={handleEndExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md transform hover:scale-[1.02]">
                      <Square size={16} fill="currentColor" /> End Exam
                    </button>
                  </>
                )}
                {derivedStatus === 'PAUSED' && (
                  <>
                    <button onClick={handleResumeExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white shadow-md">
                      <Play size={16} /> Resume Exam
                    </button>
                    <button onClick={handleEndExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md transform hover:scale-[1.02]">
                      <Square size={16} fill="currentColor" /> End Exam
                    </button>
                  </>
                )}
                {derivedStatus === 'ENDED' && (
                  <button onClick={handleRestartExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transform hover:scale-[1.02]">
                    <Play size={16} /> Restart Exam
                  </button>
                )}
                {derivedStatus === 'CREATED' && (
                  <button onClick={handleStartExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-gradient-accent hover:opacity-90 text-white shadow-md transform hover:scale-[1.02]">
                    <Play size={16} /> Start Exam
                  </button>
                )}
                {/* Global Hard Reset Exam */}
                <button onClick={handleHardResetExam} className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 shadow-md transform hover:scale-[1.02]">
                  <RotateCcw size={16} /> Hard Reset Exam
                </button>
              </div>
            </div>


          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-50 p-2 rounded-lg text-primary-600">
                    <Users size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Active Sessions Tracker</h3>
                </div>
                {/* Global Timer added here */}
                {(derivedStatus === 'STARTED' || derivedStatus === 'PAUSED' || isEnding) && (
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <div className="text-sm font-bold text-slate-500">Live Exam Time:</div>
                    <div className={`text-xl font-black font-mono tracking-wider ${isEnding ? 'text-amber-500' : examSecondsLeft && examSecondsLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                      {isEnding ? 'ENDING...' : examSecondsLeft !== null ? `${Math.floor(examSecondsLeft / 60).toString().padStart(2, '0')}:${(examSecondsLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleInitializeAll} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                  Initialize All
                </button>
                <span className="text-sm font-bold text-slate-400 border border-slate-200 bg-white px-3 py-1 rounded-lg">Total Assigned: {studentsSession.length}</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-4 border-b border-slate-100">Roll No</th>
                    <th className="p-4 border-b border-slate-100">Name</th>
                    <th className="p-4 border-b border-slate-100">Password</th>
                    <th className="p-4 border-b border-slate-100">Status</th>
                    <th className="p-4 border-b border-slate-100 text-center">Time Left</th>
                    <th className="p-4 border-b border-slate-100 text-center">Warnings</th>
                    <th className="p-4 border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsSession.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        No students found for this exam. Ensure the batch has registered students.
                      </td>
                    </tr>
                  ) : (
                    studentsSession.map((student) => (
                      <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">{student.student_id}</td>
                        <td className="p-4 font-medium text-slate-700">{student.name}</td>
                        <td className="p-4 font-mono text-sm text-slate-600 font-bold bg-slate-100 rounded px-2">{student.password_provided || 'N/A'}</td>
                        <td className="p-4">{getStatusBadge(student.status)}</td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700">
                          {student.seconds_left !== null ? `${Math.floor(student.seconds_left / 60).toString().padStart(2, '0')}:${(student.seconds_left % 60).toString().padStart(2, '0')}` : '--:--'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-bold ${student.tab_violation_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {student.tab_violation_count}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {student.status === 'PAUSED' && (
                              <button 
                                onClick={() => handleUnpauseStudent(student.session_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Unlock size={14} />
                                Unpause
                              </button>
                            )}
                            {(!student.password_provided || student.password_provided === '') && (
                              <button 
                                onClick={() => handleInitializeStudent(student.student_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Initialize
                              </button>
                            )}
                            {student.password_provided && (
                              <button 
                                onClick={() => handleHardResetStudent(student.student_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Hard Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      })()}

      {/* REGISTRATION TAB */}
      {activeTab === 'REGISTRATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 self-start">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-primary-500" /> {isEditingStudent ? 'Edit Student' : 'Register Student'}
            </h3>
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Student ID (3-digit)</label>
                <input required type="text" maxLength={3} disabled={isEditingStudent} value={newStudent.student_id} onChange={e => setNewStudent({...newStudent, student_id: e.target.value})} className={`w-full p-2.5 border rounded-xl focus:ring-2 outline-none ${isEditingStudent ? 'bg-slate-100 text-slate-500 border-slate-200' : (!isEditingStudent && students.some(s => s.student_id === newStudent.student_id) ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-primary-500')}`} placeholder="001" />
                {isEditingStudent && <p className="text-xs text-slate-400 mt-1">ID cannot be changed while editing.</p>}
                {!isEditingStudent && newStudent.student_id && students.some(s => s.student_id === newStudent.student_id) && (
                  <p className="text-xs text-red-500 font-bold mt-1">Warning: ID already exists!</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Rahul Kumar" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone No</label>
                <input required type="text" value={newStudent.phone_no} onChange={e => setNewStudent({...newStudent, phone_no: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="9876543210" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Class</label>
                  <select value={newStudent.student_class} onChange={e => setNewStudent({...newStudent, student_class: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium">
                    {[2,3,4,5,6,7,8,9,10,11,12].map(c => <option key={c} value={`Class ${c}`}>Class {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Assigned Batch</label>
                  <select value={newStudent.batch} onChange={e => setNewStudent({...newStudent, batch: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium">
                    {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={!isEditingStudent && students.some(s => s.student_id === newStudent.student_id)} className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors">
                  {isEditingStudent ? 'Update Student' : 'Save Student'}
                </button>
                {isEditingStudent && (
                  <button type="button" onClick={() => { setIsEditingStudent(false); setNewStudent({ ...newStudent, student_id: '', name: '', phone_no: '', student_class: 'Class 5', batch: BATCHES[0] }); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-lg">Registered Students ({filteredStudents.length})</h3>
              <input 
                type="text" 
                value={searchStudentQuery}
                onChange={e => setSearchStudentQuery(e.target.value)}
                placeholder="Search by ID or Name..." 
                className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
              />
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-4 border-b border-slate-100">ID</th>
                    <th className="p-4 border-b border-slate-100">Name</th>
                    <th className="p-4 border-b border-slate-100">Phone</th>
                    <th className="p-4 border-b border-slate-100">Class</th>
                    <th className="p-4 border-b border-slate-100">Batch</th>
                    <th className="p-4 border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No students found.</td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.student_id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-700">{student.student_id}</td>
                        <td className="p-4 font-medium text-slate-800">{student.name}</td>
                        <td className="p-4 text-slate-600">{student.phone_no}</td>
                        <td className="p-4 text-slate-600">{student.class}</td>
                        <td className="p-4 font-bold text-primary-700">{student.batch}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEditStudentClick(student)}
                              className="text-primary-600 hover:text-primary-800 font-bold text-xs bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.student_id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXAMS MANAGEMENT TAB */}
      {activeTab === 'EXAMS' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {!selectedExamIdBuilder && !creatingExam && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                  <BookOpen className="text-primary-500" /> Exams Master List
                </h3>
                <button 
                  onClick={() => setCreatingExam(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus size={18} /> Create New Exam
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white">
                    <tr className="text-slate-500 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4 border-b border-slate-100">Title</th>
                      <th className="p-4 border-b border-slate-100">Target Batch</th>
                      <th className="p-4 border-b border-slate-100">Duration</th>
                      <th className="p-4 border-b border-slate-100">Status</th>
                      <th className="p-4 border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examsList.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">No exams created yet.</td></tr>
                    ) : examsList.map(exam => editingExamId === exam.exam_id ? (
                      <tr key={exam.exam_id} className="bg-slate-50 border-b border-slate-100">
                        <td colSpan={5} className="p-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <input value={editExamForm.title} onChange={e => setEditExamForm({...editExamForm, title: e.target.value})} className="flex-1 w-full sm:w-auto p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Exam Title" />
                            <input type="number" value={editExamForm.duration_minutes} onChange={e => setEditExamForm({...editExamForm, duration_minutes: parseInt(e.target.value)})} className="w-full sm:w-24 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Mins" />
                            <input type="number" value={editExamForm.full_marks} onChange={e => setEditExamForm({...editExamForm, full_marks: parseInt(e.target.value)})} className="w-full sm:w-24 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Marks" />
                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <button onClick={handleUpdateExam} className="flex-1 sm:flex-none bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm">Save</button>
                              <button onClick={() => setEditingExamId(null)} className="flex-1 sm:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-bold transition-colors">Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={exam.exam_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800 text-base">{exam.title}</td>
                        <td className="p-4 font-bold text-primary-700">{exam.target_batch}</td>
                        <td className="p-4 font-medium text-slate-600">{exam.duration_minutes} mins</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            exam.status === 'CREATED' ? 'bg-blue-100 text-blue-700' :
                            exam.status === 'STARTED' ? 'bg-green-100 text-green-700' :
                            exam.status === 'DRAFT' ? 'bg-slate-200 text-slate-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {exam.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {exam.status === 'DRAFT' && (
                              <button 
                                onClick={() => { setEditingExamId(exam.exam_id); setEditExamForm({ title: exam.title, duration_minutes: exam.duration_minutes, full_marks: exam.full_marks }); }}
                                className="text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors"
                                title="Edit Exam"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {exam.status === 'DRAFT' ? (
                              <button 
                                onClick={() => setSelectedExamIdBuilder(exam.exam_id)}
                                className="text-primary-600 hover:text-primary-800 font-bold text-sm bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                              >
                                Resume Draft
                              </button>
                            ) : exam.status === 'CREATED' && (
                              <button 
                                onClick={() => setSelectedExamIdBuilder(exam.exam_id)}
                                className="text-primary-600 hover:text-primary-800 font-bold text-sm bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
                              >
                                View Questions
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteExam(exam.exam_id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                              title="Delete Exam"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CREATE EXAM VIEW */}
          {creatingExam && (
            <div className="bg-white p-6 rounded-2xl shadow border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-primary-500" /> New Exam Details
              </h3>
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Exam Title</label>
                    <input required type="text" value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} className="w-full p-2.5 border rounded-xl focus:ring-2 outline-none border-slate-200 focus:ring-primary-500" placeholder="e.g. Mid Term Mathematics" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Target Batch</label>
                    <select value={examForm.target_batch} onChange={e => setExamForm({...examForm, target_batch: e.target.value})} className="w-full p-2.5 border rounded-xl focus:ring-2 outline-none border-slate-200 focus:ring-primary-500 bg-white">
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                    <input required type="number" min="1" value={examForm.duration_minutes} onChange={e => setExamForm({...examForm, duration_minutes: parseInt(e.target.value)})} className="w-full p-2.5 border rounded-xl focus:ring-2 outline-none border-slate-200 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Marks</label>
                    <input required type="number" min="1" value={examForm.full_marks} onChange={e => setExamForm({...examForm, full_marks: parseInt(e.target.value)})} className="w-full p-2.5 border rounded-xl focus:ring-2 outline-none border-slate-200 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">Start Building Draft</button>
                  <button type="button" onClick={() => setCreatingExam(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* QUESTION BUILDER VIEW */}
          {selectedExamIdBuilder && (
            <div className="animate-in fade-in slide-in-from-right-8 pb-12">
              {(() => {
                const exam = examsList.find(e => e.exam_id === selectedExamIdBuilder);
                if (!exam) return null;
                const distributedMarks = builderSections.reduce((sum, sec) => sum + sec.section_marks, 0);
                const globalMarksLeft = exam.full_marks - distributedMarks;

                // Validate if all sections are fully filled
                const allSectionsFilled = builderSections.every(sec => {
                  const secQuestionsMarks = sec.questions.reduce((sum, q) => sum + q.marks, 0);
                  return sec.section_marks - secQuestionsMarks === 0;
                });
                const canPublish = exam.status === 'DRAFT' && globalMarksLeft === 0 && allSectionsFilled && builderSections.length > 0;

                return (
                  <>
                    <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 py-4 shadow-sm border-b border-slate-200 px-4 -mx-4">
                      <div>
                        <button onClick={() => setSelectedExamIdBuilder(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-2">
                          <ArrowLeft size={16} /> Back to Master List
                        </button>
                        <div className="flex items-center gap-3">
                          {exam.status === 'DRAFT' && <span className="bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">DRAFT</span>}
                          <h3 className="text-2xl font-extrabold text-slate-800">{exam.title}</h3>
                        </div>
                        <p className="text-slate-500 font-medium">{exam.target_batch} • {exam.duration_minutes} mins</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex gap-4 items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                          <div className="text-center px-4 border-r border-slate-100">
                            <p className="text-xs text-slate-500 font-bold tracking-wider">FULL MARKS</p>
                            <p className="text-xl font-black text-slate-800">{exam.full_marks}</p>
                          </div>
                          <div className="text-center px-4">
                            <p className="text-xs text-slate-500 font-bold tracking-wider">SECTION TOTAL</p>
                            <p className="text-xl font-black text-primary-600">{distributedMarks}</p>
                          </div>
                          <div className="text-center px-4 border-l border-slate-100 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 font-bold tracking-wider">LEFT TO DISTRIBUTE</p>
                            <p className={`text-2xl font-black ${globalMarksLeft === 0 ? 'text-green-500' : 'text-orange-500'}`}>{globalMarksLeft}</p>
                          </div>
                        </div>
                        {exam.status === 'DRAFT' && (
                          <button 
                            onClick={handlePublishExam}
                            disabled={!canPublish}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                          >
                            <Save size={20} /> Publish Exam
                          </button>
                        )}
                      </div>
                    </div>

                    {builderStatus && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <Save size={18} /> {builderStatus}
                      </div>
                    )}

                    {/* Builder Main Area */}
                    <div className="space-y-6">
                      
                      {/* Sections List */}
                      {builderSections.map((sec, idx) => {
                        const secQuestionsMarks = sec.questions.reduce((sum, q) => sum + q.marks, 0);
                        const secMarksLeft = sec.section_marks - secQuestionsMarks;
                        return (
                          <div key={sec.section_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                              <h4 className="font-extrabold text-lg text-slate-800">Section {idx + 1}: {sec.title}</h4>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-sm font-bold text-slate-500 mr-2">Allocated:</span>
                                  <span className="font-black text-lg text-slate-700">{sec.section_marks}</span>
                                </div>
                                <div className="text-right pl-4 border-l border-slate-300">
                                  <span className="text-sm font-bold text-slate-500 mr-2">Left to Fill:</span>
                                  <span className={`font-black text-lg ${secMarksLeft === 0 ? 'text-green-500' : 'text-orange-500'}`}>{secMarksLeft}</span>
                                </div>
                                {exam.status === 'DRAFT' && (
                                  <button onClick={() => handleDeleteSection(sec.section_id)} className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                              {/* Questions inside section */}
                              {sec.questions.map((q, qidx) => (
                                <div key={q.question_id} className={`p-4 rounded-xl border ${editingQuestionId === q.question_id ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-slate-700 text-lg">Q{qidx + 1}. {q.question_text_en}</h5>
                                    <div className="flex items-center gap-2">
                                      <span className="bg-primary-100 text-primary-700 font-bold px-3 py-1 rounded-lg text-sm">{q.marks} Marks</span>
                                      {exam.status === 'DRAFT' && (
                                        <button onClick={() => handleEditQuestion(q, sec.section_id)} className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">
                                          <Edit size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-slate-600 mb-3">{q.question_text_bn}</p>
                                  {q.question_type === 'MCQ' && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      {q.options_json.map((opt: string, i: number) => (
                                        <div key={i} className={`p-2 rounded-lg text-sm font-medium border ${opt === q.correct_answer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                                          {opt} {opt === q.correct_answer && '✓'}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {q.question_type === 'TF' && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <div className={`p-2 rounded-lg text-sm font-medium border ${'True' === q.correct_answer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>True {'True' === q.correct_answer && '✓'}</div>
                                      <div className={`p-2 rounded-lg text-sm font-medium border ${'False' === q.correct_answer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>False {'False' === q.correct_answer && '✓'}</div>
                                    </div>
                                  )}
                                  {q.question_type === 'FITB' && (
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 inline-block font-bold">
                                      Answer: {q.correct_answer}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Add Question Form for this section */}
                              {exam.status === 'DRAFT' && (
                                secMarksLeft > 0 ? (
                                  activeSectionId === sec.section_id ? (
                                    <div className="bg-primary-50 p-6 rounded-xl border border-primary-100 mt-4 animate-in fade-in slide-in-from-top-2">
                                      <h5 className="font-bold text-primary-800 mb-4 flex items-center gap-2"><Plus size={18} /> Add {sec.section_type} Question to {sec.title}</h5>
                                      <form onSubmit={handleAddQuestion} className="space-y-4">
                                        <div>
                                          <label className="block text-sm font-bold text-slate-700 mb-1">Marks (Max {secMarksLeft})</label>
                                          <input required type="number" min="1" max={secMarksLeft} value={questionForm.marks} onChange={e => setQuestionForm({...questionForm, marks: parseInt(e.target.value)})} className="w-full p-2.5 border rounded-xl outline-none" />
                                        </div>
                                        
                                        <div>
                                          <label className="block text-sm font-bold text-slate-700 mb-1">Question (English)</label>
                                          <textarea required value={questionForm.text_en} onChange={e => setQuestionForm({...questionForm, text_en: e.target.value})} className="w-full p-3 border rounded-xl outline-none" rows={2}></textarea>
                                          {sec.section_type === 'FITB' && <p className="text-xs text-primary-600 mt-1 font-bold">Use `___` for the blank space.</p>}
                                        </div>
                                        
                                        <div>
                                          <label className="block text-sm font-bold text-slate-700 mb-1">Question (Bengali)</label>
                                          <textarea required value={questionForm.text_bn} onChange={e => setQuestionForm({...questionForm, text_bn: e.target.value})} className="w-full p-3 border rounded-xl outline-none" rows={2}></textarea>
                                        </div>

                                        {sec.section_type === 'MCQ' && (
                                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                                            <label className="block text-sm font-bold text-slate-700">Options</label>
                                            <div className="grid grid-cols-2 gap-3">
                                              {[0, 1, 2, 3].map(i => (
                                                <input key={i} required={i < 2} type="text" placeholder={`Option ${i+1}`} value={questionForm.options[i]} onChange={e => {
                                                  const newOpts = [...questionForm.options];
                                                  newOpts[i] = e.target.value;
                                                  setQuestionForm({...questionForm, options: newOpts});
                                                }} className="w-full p-2.5 border rounded-lg text-sm outline-none" />
                                              ))}
                                            </div>
                                            <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-1 mt-2">Correct Answer (Must match one option exactly)</label>
                                              <select required value={questionForm.correct_answer} onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none">
                                                <option value="" disabled>Select Correct Option...</option>
                                                {questionForm.options.filter(o => o.trim() !== '').map((opt, i) => (
                                                  <option key={i} value={opt}>{opt}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        {sec.section_type === 'TF' && (
                                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                                            <label className="block text-sm font-bold text-slate-700">Correct Answer</label>
                                            <select required value={questionForm.correct_answer} onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none">
                                              <option value="" disabled>Select Correct Answer...</option>
                                              <option value="True">True</option>
                                              <option value="False">False</option>
                                            </select>
                                          </div>
                                        )}

                                        {sec.section_type === 'FITB' && (
                                          <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                                            <div>
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Blank Answers</label>
                                              <p className="text-xs text-slate-500 mb-3">Add the correct answers for each blank in order. Use `___` in the question text above to indicate where these blanks appear.</p>
                                              <div className="space-y-2">
                                                {questionForm.fitb_blanks.map((blank, i) => (
                                                  <div key={`blank-${i}`} className="flex gap-2 items-center">
                                                    <span className="font-bold text-slate-400 text-sm w-16">Blank {i+1}</span>
                                                    <input required type="text" value={blank} onChange={e => {
                                                      const newBlanks = [...questionForm.fitb_blanks];
                                                      newBlanks[i] = e.target.value;
                                                      setQuestionForm({...questionForm, fitb_blanks: newBlanks});
                                                    }} className="flex-1 p-2 border rounded-lg text-sm outline-none" placeholder="Correct word..." />
                                                    {questionForm.fitb_blanks.length > 1 && (
                                                      <button type="button" onClick={() => {
                                                        const newBlanks = questionForm.fitb_blanks.filter((_, idx) => idx !== i);
                                                        setQuestionForm({...questionForm, fitb_blanks: newBlanks});
                                                      }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                              <button type="button" onClick={() => setQuestionForm({...questionForm, fitb_blanks: [...questionForm.fitb_blanks, '']})} className="mt-3 text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                                <Plus size={16} /> Add Another Blank
                                              </button>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100">
                                              <label className="block text-sm font-bold text-slate-700 mb-2">Extra Distractor Options (Optional)</label>
                                              <p className="text-xs text-slate-500 mb-3">Add incorrect words to the word bank to make the question harder.</p>
                                              <div className="space-y-2">
                                                {questionForm.fitb_extras.map((extra, i) => (
                                                  <div key={`extra-${i}`} className="flex gap-2 items-center">
                                                    <input type="text" value={extra} onChange={e => {
                                                      const newExtras = [...questionForm.fitb_extras];
                                                      newExtras[i] = e.target.value;
                                                      setQuestionForm({...questionForm, fitb_extras: newExtras});
                                                    }} className="flex-1 p-2 border rounded-lg text-sm outline-none" placeholder="Distractor word..." />
                                                    <button type="button" onClick={() => {
                                                      const newExtras = questionForm.fitb_extras.filter((_, idx) => idx !== i);
                                                      setQuestionForm({...questionForm, fitb_extras: newExtras});
                                                    }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                  </div>
                                                ))}
                                              </div>
                                              <button type="button" onClick={() => setQuestionForm({...questionForm, fitb_extras: [...questionForm.fitb_extras, '']})} className="mt-3 text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                                <Plus size={16} /> Add Distractor Option
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex justify-between items-center pt-4">
                                          <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm w-full md:w-auto">
                                            {editingQuestionId ? 'Update Question' : 'Add Question'}
                                          </button>
                                          {editingQuestionId && (
                                            <button type="button" onClick={() => { setEditingQuestionId(null); setActiveSectionId(null); setQuestionForm({ text_en: '', text_bn: '', options: ['', '', '', ''], correct_answer: '', marks: 1, fitb_blanks: [''], fitb_extras: [] }); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-3 rounded-xl font-bold transition-colors w-full md:w-auto ml-2">
                                              Cancel
                                            </button>
                                          )}
                                        </div>
                                      </form>
                                    </div>
                                  ) : (
                                    <button onClick={() => {
                                      setActiveSectionId(sec.section_id);
                                      setQuestionForm({ text_en: '', text_bn: '', options: ['', '', '', ''], correct_answer: '', marks: Math.min(1, secMarksLeft), fitb_blanks: [''], fitb_extras: [] });
                                    }} className="mt-4 w-full border-2 border-dashed border-slate-300 hover:border-primary-400 text-slate-500 hover:text-primary-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                      <Plus size={20} /> Add Question
                                    </button>
                                  )
                                ) : (
                                  <div className="mt-4 text-center p-4 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 flex items-center justify-center gap-2">
                                    <Award size={20} /> Section marks fully allocated.
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add New Section Form */}
                      {exam.status === 'DRAFT' && globalMarksLeft > 0 && (
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300">
                          <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-primary-500" /> Create New Section
                          </h4>
                          <form onSubmit={handleCreateSection} className="flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div className="flex-1">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Section Title</label>
                              <input required type="text" value={newSectionForm.title} onChange={e => setNewSectionForm({...newSectionForm, title: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none" placeholder="e.g. Multiple Choice" />
                            </div>
                            <div className="sm:w-48">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Section Type</label>
                              <select value={newSectionForm.section_type} onChange={e => setNewSectionForm({...newSectionForm, section_type: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none bg-white">
                                <option value="MCQ">Multiple Choice</option>
                                <option value="FITB">Fill in the Blanks</option>
                                <option value="TF">True / False</option>
                              </select>
                            </div>
                            <div className="sm:w-32">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Marks</label>
                              <input required type="number" min="1" max={globalMarksLeft} value={newSectionForm.section_marks} onChange={e => setNewSectionForm({...newSectionForm, section_marks: parseInt(e.target.value)})} className="w-full p-2.5 border rounded-xl outline-none" />
                            </div>
                            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl flex justify-center items-center gap-2">
                              Create Section
                            </button>
                          </form>
                          <p className="text-sm font-bold text-slate-500 mt-3">You can allocate up to {globalMarksLeft} more marks for new sections.</p>
                        </div>
                      )}
                      
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Examination Results</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-500 font-bold text-sm">Select Ended Exam:</span>
                <select 
                  value={selectedResultExamId} 
                  onChange={(e) => setSelectedResultExamId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 font-bold"
                >
                  <option value="" disabled>Choose an exam...</option>
                  {examsList.filter(e => e.status === 'ENDED').map(ex => (
                    <option key={ex.exam_id} value={ex.exam_id}>
                      {ex.title} ({ex.target_batch})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedResultExamId && resultsData.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleDownloadJPG}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm border border-slate-200"
                >
                  <Download size={16} /> Download JPG
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>
            )}
          </div>

          {selectedResultExamId ? (
            resultsData.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto p-4">
                {/* Wrap in a div specifically for capturing image */}
                <div ref={resultsRef} className="bg-white p-6">
                  {/* Print Header */}
                  <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-wider">
                      INSTITUTE OF COMPUTER SCIENCE AND TECHNOLOGY CHOWBERIA
                    </h1>
                    <h2 className="text-xl font-bold text-slate-700 mt-2">
                      Result Sheet: {examsList.find(e => e.exam_id === selectedResultExamId)?.title}
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                      Target Batch: {examsList.find(e => e.exam_id === selectedResultExamId)?.target_batch}
                    </p>
                  </div>

                  {/* Result Table */}
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead className="bg-slate-100">
                      <tr className="text-slate-700 text-sm uppercase tracking-wider font-extrabold border-b border-slate-300">
                        <th className="p-4 border-r border-slate-200">Rank</th>
                        <th className="p-4 border-r border-slate-200">Student ID</th>
                        <th className="p-4 border-r border-slate-200">Name</th>
                        <th className="p-4 border-r border-slate-200">Score / Full Marks</th>
                        <th className="p-4 border-r border-slate-200 text-center">Violations</th>
                        <th className="p-4 border-r border-slate-200">Status</th>
                        <th className="p-4 border-l border-slate-200 text-center" data-html2canvas-ignore="true">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {resultsData.map((res, index) => (
                        <tr key={res.student_id} className="hover:bg-slate-50 text-slate-800 font-medium">
                          <td className="p-4 border-r border-slate-200 text-center font-extrabold">#{index + 1}</td>
                          <td className="p-4 border-r border-slate-200 font-bold">{res.student_id}</td>
                          <td className="p-4 border-r border-slate-200">{res.name}</td>
                          <td className="p-4 border-r border-slate-200 font-extrabold text-primary-700">
                            {res.score} <span className="text-slate-400 font-medium text-sm">/ {res.full_marks}</span>
                          </td>
                          <td className="p-4 border-r border-slate-200 text-center font-bold text-red-600">
                            {res.tab_violation_count > 0 ? res.tab_violation_count : '-'}
                          </td>
                          <td className="p-4 border-r border-slate-200 font-bold text-sm">
                            <span className={`${res.status === 'COMPLETED' ? 'text-green-600' : 'text-slate-500'}`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="p-4 border-l border-slate-200 text-center" data-html2canvas-ignore="true">
                            <button onClick={() => openAnswerSheet(res.student_id)} className="text-primary-600 hover:text-primary-800 transition-colors p-2 rounded-full hover:bg-primary-50" title="View Answer Sheet">
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Print Footer */}
                  <div className="mt-8 text-right pr-8">
                    <p className="text-slate-800 font-bold">Authorized Signature</p>
                    <div className="w-48 border-t border-slate-800 mt-12 ml-auto"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                <p className="text-slate-500 font-bold text-lg">No results found for this exam.</p>
              </div>
            )
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <div className="bg-primary-50 p-4 rounded-full inline-block mb-4 text-primary-500">
                <Award size={48} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl">Select an Exam</h3>
              <p className="text-slate-500 font-medium mt-2">Only exams that have ended will appear in the list above.</p>
            </div>
          )}
        </div>
      )}

      {/* ANSWER SHEET MODAL */}
      {selectedStudentForAnswers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col md:flex-row justify-center items-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-800 text-white p-6 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => navigateAnswerSheet('prev')} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title="Previous Student">
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Answer Sheet Review</h2>
                  {answerSheetData && (
                    <p className="text-slate-300 font-medium text-sm mt-1">
                      {answerSheetData.student.name} ({answerSheetData.student.student_id}) - {answerSheetData.student.class}
                    </p>
                  )}
                </div>
                <button onClick={() => navigateAnswerSheet('next')} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title="Next Student">
                  <ChevronRight size={24} />
                </button>
              </div>
              <button onClick={closeAnswerSheet} className="p-2 bg-slate-700 hover:bg-red-500 rounded-full transition-colors shadow-sm">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 custom-scrollbar">
              {isAnswerSheetLoading || !answerSheetData ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold tracking-wider uppercase text-sm">Loading Answer Sheet...</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Summary Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exam</p>
                      <p className="font-bold text-slate-800">{answerSheetData.student.exam_title}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                      <p className="font-extrabold text-2xl text-primary-700">{answerSheetData.student.score} <span className="text-lg text-slate-400">/ {answerSheetData.student.full_marks}</span></p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Percentage</p>
                      <p className="font-bold text-slate-800">{answerSheetData.student.full_marks > 0 ? Math.round((answerSheetData.student.score / answerSheetData.student.full_marks) * 100) : 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                      <p className={`font-bold ${answerSheetData.student.status === 'COMPLETED' ? 'text-green-600' : 'text-amber-500'}`}>{answerSheetData.student.status}</p>
                    </div>
                  </div>

                  {/* Group Questions by Section */}
                  {(() => {
                    let qData = answerSheetData.answers || [];
                    
                    const sectionsObj: Record<string, { title: string, type: string, questions: any[] }> = {};
                    qData.forEach((q: any) => {
                      const secId = q.section_id || (q.question_type === 'FITB' ? 'default_fitb' : 'default_mcq');
                      const secTitle = q.section_title || (q.question_type === 'FITB' ? 'Fill in the Blanks' : 'General Questions');
                      if (!sectionsObj[secId]) sectionsObj[secId] = { title: secTitle, type: q.question_type, questions: [] };
                      sectionsObj[secId].questions.push(q);
                    });

                    return Object.entries(sectionsObj).map(([secId, sec]) => (
                      <div key={secId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center gap-2 text-slate-700 font-extrabold uppercase tracking-wider text-sm">
                          {sec.title}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {sec.questions.map((q: any, idx: number) => {
                            const studentAns = q.student_answer;
                            const isCorrect = q.is_correct;
                            
                            return (
                              <div key={q.question_id} className="p-6 md:p-8">
                                <div className="flex gap-4 mb-6">
                                  <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-600 font-black rounded-xl flex items-center justify-center text-lg">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-grow">
                                    {q.question_type === 'FITB' ? (
                                      <h3 className="text-xl font-semibold text-slate-800 leading-relaxed">
                                        {q.question_text_en.split('___').map((part: string, pIdx: number, partsArr: string[]) => {
                                          if (pIdx === partsArr.length - 1) return <span key={pIdx}>{part}</span>;
                                          return <span key={pIdx}>{part}<span className="inline-block mx-1 w-16 border-b-2 border-slate-300"></span></span>;
                                        })}
                                      </h3>
                                    ) : (
                                      <h3 className="text-xl font-semibold text-slate-800 leading-relaxed">{q.question_text_en}</h3>
                                    )}
                                  </div>
                                </div>

                                {/* Render Answers Based on Question Type */}
                                <div className="ml-14 bg-slate-50 p-5 rounded-xl border border-slate-200">
                                  {q.question_type === 'FITB' ? (
                                    <div className="space-y-4">
                                      {(() => {
                                        try {
                                          const correctArr = JSON.parse(q.correct_answer || '[]');
                                          const studentArr = studentAns ? JSON.parse(studentAns) : [];
                                          return correctArr.map((corrOpt: string, bIdx: number) => {
                                            const sOpt = studentArr[bIdx];
                                            const isBlankCorrect = sOpt === corrOpt;
                                            return (
                                              <div key={bIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                                                <div className="w-20 font-bold text-slate-400 text-sm uppercase tracking-wider">Blank {bIdx + 1}</div>
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-500 w-16">Student:</span>
                                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${!sOpt ? 'bg-slate-200 text-slate-500 italic' : isBlankCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                      {sOpt || '(Left Blank)'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-500 w-16">Correct:</span>
                                                    <span className="px-3 py-1 rounded-lg text-sm font-bold bg-slate-200 text-slate-700">
                                                      {corrOpt}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-end w-10">
                                                  {isBlankCorrect ? <CheckCircle2 className="text-green-500" size={24} /> : <XCircle className="text-red-500" size={24} />}
                                                </div>
                                              </div>
                                            );
                                          });
                                        } catch (e) { return <p className="text-red-500 font-bold">Error parsing FITB answers.</p>; }
                                      })()}
                                    </div>
                                  ) : q.question_type === 'MCQ' || q.question_type === 'TF' ? (
                                    <div className="flex flex-col sm:flex-row gap-6">
                                      <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Answer</div>
                                        <div className={`p-3 rounded-xl border-2 font-bold ${!studentAns ? 'bg-slate-100 border-slate-200 text-slate-500 italic' : isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                          {studentAns || 'Not Answered'}
                                        </div>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correct Answer</div>
                                        <div className="p-3 rounded-xl border-2 bg-slate-100 border-slate-200 text-slate-700 font-bold">
                                          {q.correct_answer}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                        <AlertTriangle size={16} /> Generic Text View
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Answer</span>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap font-medium">
                                          {studentAns || '(Left Blank)'}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Correct Answer / Reference</span>
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap font-medium">
                                          {q.correct_answer}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Marks Banner */}
                                  <div className={`mt-5 flex items-center justify-between px-4 py-2 rounded-lg font-extrabold text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                    <div className="flex items-center gap-2">
                                      {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                      <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                    </div>
                                    <div className="text-right">
                                      {isCorrect ? q.marks : 0} <span className="opacity-60">/ {q.marks} Marks</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
