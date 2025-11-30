
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, AlertTriangle, Plus, Search, Loader2, X, Send, Sparkles, 
  User, FileWarning, Check, BarChart2, Printer, TrendingUp, Filter, 
  Trash2, Edit, ArrowRight, LayoutGrid, FileText, School, Inbox, ChevronLeft,
  Calendar, AlertCircle, PieChart as PieIcon, List, Activity, ShieldAlert, Gavel, Forward, CheckCircle, Phone, Clock,
  Medal, Star, ClipboardList, GitCommit, Eye, ArrowUpRight, CheckSquare, FileBadge
} from 'lucide-react';
import { 
  getStudents, 
  getBehaviorRecords, 
  addBehaviorRecord, 
  updateBehaviorRecord,
  deleteBehaviorRecord,
  addReferral,
  getReferrals,
  getConsecutiveAbsences,
  resolveAbsenceAlert,
  sendAdminInsight,
  suggestBehaviorAction,
  addStudentObservation,
  addStudentPoints,
  getStudentPoints,
  updateReferralStatus
} from '../../services/storage';
import { Student, BehaviorRecord, StaffUser, Referral, StudentObservation } from '../../types';
import { BEHAVIOR_VIOLATIONS, GRADES } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AttendanceMonitor from './AttendanceMonitor';

// --- Official Header Component (Print Only) ---
const OfficialHeader = ({ schoolName, subTitle }: { schoolName: string, subTitle: string }) => (
  <div className="print-header">
    <div className="print-header-right">
        <p>المملكة العربية السعودية</p>
        <p>وزارة التعليم</p>
        <p>إدارة التعليم ....................</p>
        <p>{schoolName}</p>
        <p>{subTitle}</p>
    </div>
    <div className="print-header-center">
        <img
          src="https://www.raed.net/img?id=1474173"
          alt="شعار وزارة التعليم"
          className="print-logo"
        />
    </div>
    <div className="print-header-left">
         <p>Kingdom of Saudi Arabia</p>
         <p>Ministry of Education</p>
         <p>Student Affairs</p>
         <img src="https://upload.wikimedia.org/wikipedia/en/d/d4/Vision_2030_Kingdom_of_Saudi_Arabia_logo.svg" alt="Vision 2030" className="w-20 mx-auto mt-2 opacity-80 grayscale" />
    </div>
  </div>
);

const StaffDeputy: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const SCHOOL_NAME = localStorage.getItem('school_name') || "متوسطة عماد الدين زنكي";
  
  // Navigation View State
  const [activeView, setActiveView] = useState<'dashboard' | 'attendance' | 'referrals' | 'log' | 'positive'>('dashboard');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]); 
  const [riskList, setRiskList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // --- Modals State ---
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showPositiveModal, setShowPositiveModal] = useState(false);
  const [violationStep, setViolationStep] = useState<'form' | 'success'>('form'); // New Workflow Step

  // --- Form State (Violation) ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formGrade, setFormGrade] = useState('');
  const [formClass, setFormClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDegree, setSelectedDegree] = useState(BEHAVIOR_VIOLATIONS[0].degree);
  const [selectedViolation, setSelectedViolation] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [lastSavedRecord, setLastSavedRecord] = useState<BehaviorRecord | null>(null); // To track what was just saved

  // --- Form State (Positive) ---
  const [positiveReason, setPositiveReason] = useState('');
  const [positivePoints, setPositivePoints] = useState(5);
  
  // Printing State
  const [printMode, setPrintMode] = useState<'none' | 'commitment' | 'summons' | 'certificate' | 'referral_report'>('none');
  const [recordToPrint, setRecordToPrint] = useState<BehaviorRecord | null>(null);
  const [studentToPrint, setStudentToPrint] = useState<Student | null>(null); 
  const [certificateData, setCertificateData] = useState<{reason: string} | null>(null);
  const [referralToPrint, setReferralToPrint] = useState<Referral | null>(null);

  // Search & Date State
  const [search, setSearch] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (session) setCurrentUser(JSON.parse(session));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, r, refs, risks] = await Promise.all([
        getStudents(), 
        getBehaviorRecords(),
        getReferrals(),
        getConsecutiveAbsences()
      ]);
      setStudents(s);
      setRecords(r);
      setReferrals(refs); 
      setRiskList(risks);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
      const totalViolations = records.length;
      const todayViolations = records.filter(r => r.date === new Date().toISOString().split('T')[0]).length;
      const atRiskCount = riskList.length;
      // Count referrals sent by deputy
      const myReferrals = referrals.filter(r => r.referredBy === 'deputy');
      const resolvedReferrals = myReferrals.filter(r => r.status === 'resolved').length;

      // Chart Data: Violations by Type
      const typeCounts: Record<string, number> = {};
      records.forEach(r => typeCounts[r.violationName] = (typeCounts[r.violationName] || 0) + 1);
      const chartData = Object.entries(typeCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a,b) => b.value - a.value)
          .slice(0, 5);

      return { totalViolations, todayViolations, atRiskCount, myReferralsCount: myReferrals.length, resolvedReferrals, chartData };
  }, [records, riskList, referrals]);

  // --- Form Helpers ---
  const availableClasses = useMemo(() => {
    if (!formGrade) return [];
    const classes = new Set(students.filter(s => s.grade === formGrade).map(s => s.className));
    return Array.from(classes).sort();
  }, [students, formGrade]);

  const availableStudents = useMemo(() => {
    return students.filter(s => s.grade === formGrade && s.className === formClass);
  }, [students, formGrade, formClass]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormGrade('');
    setFormClass('');
    setSelectedStudentId('');
    setViolationStep('form'); // Reset step
    setSelectedDegree(BEHAVIOR_VIOLATIONS[0].degree);
    setSelectedViolation('');
    setActionTaken('');
    setNotes('');
    setPositiveReason('');
    setPositivePoints(5);
    setLastSavedRecord(null);
  };

  // --- Actions ---

  const handleViolationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !selectedViolation) return;
      
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      const violationObj = BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree);
      const todayISO = new Date().toISOString();

      const recordData: BehaviorRecord = {
          id: editingId || '', // DB will ignore empty string on insert usually, but let's assume storage handles it
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          className: student.className,
          date: todayISO.split('T')[0],
          violationDegree: selectedDegree,
          violationName: selectedViolation,
          articleNumber: violationObj?.article || '',
          actionTaken: actionTaken,
          notes: notes,
          staffId: currentUser?.id,
          createdAt: isEditing ? (records.find(r => r.id === editingId)?.createdAt || todayISO) : todayISO
      };

      if (isEditing) {
          await updateBehaviorRecord(recordData);
          alert("تم التعديل بنجاح");
          resetForm();
          setShowViolationModal(false);
      } else {
          // Add record
          await addBehaviorRecord(recordData);
          // For UX, we need the record to print. We'll assume the state we have is enough for printing.
          setLastSavedRecord(recordData); // This is local, doesn't have real DB ID but has data needed for print
          setViolationStep('success'); // Switch to success view
      }
      fetchData();
  };

  const handlePositiveSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !positiveReason) return;
      
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      await addStudentPoints(student.studentId, positivePoints, positiveReason, 'behavior');
      
      await addStudentObservation({
          id: '',
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          className: student.className,
          date: new Date().toISOString().split('T')[0],
          type: 'positive',
          content: `تعزيز سلوكي: ${positiveReason}`,
          staffId: currentUser?.id || '',
          staffName: currentUser?.name || 'وكيل شؤون الطلاب',
          sentiment: 'positive'
      });

      // Show print dialog
      setStudentToPrint(student);
      setCertificateData({ reason: positiveReason });
      setPrintMode('certificate');
      setTimeout(() => { window.print(); setPrintMode('none'); }, 300);

      resetForm();
      setShowPositiveModal(false);
  };

  // Helper for printing Commitment/Summons
  const handlePrintViolationAction = (record: BehaviorRecord, type: 'commitment' | 'summons') => {
      setRecordToPrint(record);
      setPrintMode(type);
      setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
  };

  // Helper for printing Referral Report
  const handlePrintReferral = (referral: Referral) => {
      setReferralToPrint(referral);
      setPrintMode('referral_report');
      setTimeout(() => { window.print(); setPrintMode('none'); }, 500);
  };

  // Used by Attendance Monitor
  const handlePrintAttendanceAction = (student: Student, type: 'pledge' | 'summons') => {
      setRecordToPrint({
          id: 'temp',
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          className: student.className,
          violationName: type === 'pledge' ? 'تجاوز حد الغياب المسموح' : 'الغياب المتكرر بدون عذر',
          actionTaken: type === 'pledge' ? 'تعهد خطي' : 'استدعاء ولي أمر',
          date: new Date().toISOString().split('T')[0],
          violationDegree: 'مواظبة',
          articleNumber: ''
      });
      setPrintMode(type === 'pledge' ? 'commitment' : 'summons');
      setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
  };

  const handleCreateReferralFromRecord = async (record: BehaviorRecord) => {
      if(!window.confirm(`هل أنت متأكد من إحالة الطالب ${record.studentName} للموجه الطلابي؟`)) return;
      
      const newReferral: Referral = {
          id: '',
          studentId: record.studentId,
          studentName: record.studentName,
          grade: record.grade,
          className: record.className,
          referralDate: new Date().toISOString().split('T')[0],
          reason: `إحالة بسبب مخالفة: ${record.violationName} (${record.violationDegree})`,
          status: 'pending',
          referredBy: 'deputy',
          notes: record.notes
      };
      
      await addReferral(newReferral);
      alert("تم إرسال الإحالة للموجه بنجاح.");
      if (showViolationModal) setShowViolationModal(false);
      resetForm();
      fetchData();
  };

  const handleCloseReferral = async (id: string) => {
      if(!window.confirm('هل تريد إغلاق هذه الحالة واعتماد الإجراء؟')) return;
      await updateReferralStatus(id, 'resolved');
      fetchData();
  };

  const getReferralStatusBadge = (status: string) => {
      switch(status) {
          case 'pending': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">بانتظار الموجه</span>;
          case 'in_progress': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">قيد المعالجة</span>;
          case 'returned_to_deputy': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200 animate-pulse">رد الموجه (يحتاج قرار)</span>;
          case 'resolved': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">مغلق (تم)</span>;
          default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{status}</span>;
      }
  };

  return (
    <>
      {/* --- PRINT CONTAINER --- */}
      <div id="print-container" className="hidden print:block text-[14px] leading-relaxed" dir="rtl">
        <div className="print-page-a4">
            <img src="https://www.raed.net/img?id=1474173" className="print-watermark" alt="Watermark" />
            
            {/* 1. COMMITMENT / SUMMONS */}
            {(printMode === 'commitment' || printMode === 'summons') && recordToPrint && (
            <div>
                <OfficialHeader schoolName={SCHOOL_NAME} subTitle="وكالة شؤون الطلاب" />
                
                <div className="mt-12 px-8 relative z-10">
                    <h1 className="text-2xl font-extrabold text-center mb-10 underline underline-offset-8">
                        {printMode === 'commitment' ? 'تعهد خطي (انضباطي)' : 'خطاب استدعاء ولي أمر'}
                    </h1>
                    
                    {printMode === 'commitment' ? (
                        <div className="text-right space-y-10 text-lg font-medium mt-12">
                            <p>أقر أنا الطالب/ة: <strong>{recordToPrint.studentName}</strong> بالصف: <strong>{recordToPrint.grade} - {recordToPrint.className}</strong></p>
                            <p>بأنني قمت بالمخالفة التالية:</p>
                            <div className="bg-gray-50/50 p-6 border border-gray-400 rounded-lg text-center font-bold text-xl">{recordToPrint.violationName}</div>
                            <p className="leading-loose text-justify">وأتعهد بعدم تكرار هذا السلوك مستقبلاً، والالتزام بالأنظمة والتعليمات المدرسية. وفي حال التكرار، أتحمل كافة الإجراءات النظامية المترتبة على ذلك وفق لائحة السلوك والمواظبة.</p>
                        </div>
                    ) : (
                        <div className="text-lg leading-loose space-y-8 font-medium mt-12 text-justify">
                            <p>المكرم ولي أمر الطالب.. وفقه الله</p>
                            <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                            <p>نفيدكم بأنه تم رصد ملاحظات انضباطية/سلوكية على ابنكم <strong>({recordToPrint.studentName})</strong> بالصف <strong>({recordToPrint.grade})</strong>.</p>
                            <p>الموضوع: <strong className="underline">{recordToPrint.violationName}</strong>.</p>
                            <p>لذا نأمل منكم التكرم بالحضور للمدرسة يوم ................................ الموافق ...../...../.....هـ لمناقشة وضع الطالب والتعاون معنا في تقويمه.</p>
                            <p className="text-center mt-8 font-bold">شاكرين ومقدرين حسن تعاونكم،،،</p>
                        </div>
                    )}
                    
                    <div className="footer-signatures">
                        {printMode === 'commitment' && <div className="text-center"><p className="font-bold mb-8">الطالب/ة</p><p>.............................</p></div>}
                        <div className="text-center"><p className="font-bold mb-8">وكيل شؤون الطلاب</p><p>{currentUser?.name}</p></div>
                        {printMode === 'summons' && <div className="text-center"><p className="font-bold mb-8">مدير المدرسة</p><p>.............................</p></div>}
                    </div>
                    <div className="mt-16 text-center text-sm">حرر بتاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
                </div>
            </div>
            )}

            {/* 2. REFERRAL REPORT */}
            {printMode === 'referral_report' && referralToPrint && (
                <div>
                    <OfficialHeader schoolName={SCHOOL_NAME} subTitle="نموذج إحالة طالب (توجيه طلابي)" />
                    <div className="mt-8 px-4 relative z-10">
                        <h1 className="text-xl font-bold text-center mb-6 border-b-2 border-black inline-block pb-1">تقرير حالة طالب</h1>
                        
                        {/* Student Info */}
                        <div className="referral-box">
                            <span className="referral-box-title">بيانات الطالب</span>
                            <div className="referral-grid">
                                <div className="referral-row"><span className="referral-label">الاسم:</span> {referralToPrint.studentName}</div>
                                <div className="referral-row"><span className="referral-label">الصف:</span> {referralToPrint.grade} - {referralToPrint.className}</div>
                                <div className="referral-row"><span className="referral-label">تاريخ الإحالة:</span> {referralToPrint.referralDate}</div>
                                <div className="referral-row"><span className="referral-label">جهة الإحالة:</span> {referralToPrint.referredBy === 'deputy' ? 'وكيل شؤون الطلاب' : 'معلم/إداري'}</div>
                            </div>
                        </div>

                        {/* Case Details */}
                        <div className="referral-box">
                            <span className="referral-box-title">أسباب الإحالة</span>
                            <p className="leading-relaxed p-2">{referralToPrint.reason}</p>
                            {referralToPrint.notes && <p className="mt-2 text-sm text-gray-600 p-2 border-t border-gray-300">ملاحظات: {referralToPrint.notes}</p>}
                        </div>

                        {/* Counselor Reply */}
                        <div className="referral-box">
                            <span className="referral-box-title">مرئيات الموجه الطلابي</span>
                            <div className="min-h-[100px] p-2">
                                {referralToPrint.outcome ? (
                                    <p className="leading-relaxed">{referralToPrint.outcome}</p>
                                ) : (
                                    <p className="text-gray-400 italic text-center mt-8">لا يوجد رد مسجل في النظام حتى الآن.</p>
                                )}
                            </div>
                        </div>

                        {/* Final Decision */}
                        <div className="referral-box">
                            <span className="referral-box-title">الإجراء الإداري / القرار</span>
                            <div className="min-h-[60px] p-2">
                                {referralToPrint.status === 'resolved' ? 'تم إنهاء الحالة وحفظها.' : '...........................................................................................'}
                            </div>
                        </div>

                        <div className="footer-signatures">
                            <div className="text-center"><p className="font-bold mb-6">الموجه الطلابي</p><p>.............................</p></div>
                            <div className="text-center"><p className="font-bold mb-6">وكيل شؤون الطلاب</p><p>{currentUser?.name}</p></div>
                            <div className="text-center"><p className="font-bold mb-6">مدير المدرسة</p><p>.............................</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. CERTIFICATE (Enhanced) */}
            {printMode === 'certificate' && studentToPrint && (
                <div className="certificate-border relative">
                    <div className="certificate-corner corner-tl"></div>
                    <div className="certificate-corner corner-tr"></div>
                    <div className="certificate-corner corner-bl"></div>
                    <div className="certificate-corner corner-br"></div>
                    
                    <div className="text-center pt-8 relative z-10">
                        <img src="https://www.raed.net/img?id=1474173" alt="Ministry" className="h-28 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-700">المملكة العربية السعودية <br/> وزارة التعليم <br/> {SCHOOL_NAME}</h2>
                        
                        <h1 className="text-5xl font-extrabold text-blue-900 mt-16 mb-10 certificate-title">شهادة شكر وتقدير</h1>
                        
                        <p className="text-2xl leading-loose mt-8 font-medium">تتقدم إدارة المدرسة ووكالة شؤون الطلاب بالشكر والتقدير للطالب:</p>
                        <h2 className="text-4xl font-extrabold text-blue-800 my-8 border-b-2 border-blue-900/20 inline-block pb-4 px-12">{studentToPrint.name}</h2>
                        
                        <p className="text-2xl mt-4">وذلك لتميزه في:</p>
                        <h3 className="text-3xl font-bold text-amber-600 mt-6 mb-16 bg-amber-50 inline-block px-8 py-2 rounded-full border border-amber-200">"{certificateData?.reason}"</h3>
                        
                        <p className="text-xl text-gray-600">متمنين له دوام التوفيق والنجاح.</p>
                        
                        <div className="flex justify-between px-16 mt-24">
                            <div className="text-center">
                                <p className="font-bold text-xl mb-10">وكيل شؤون الطلاب</p>
                                <p className="font-mono text-gray-700 text-lg">{currentUser?.name}</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-xl mb-10">مدير المدرسة</p>
                                <p className="font-mono text-gray-700 text-lg">.......................</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- APP UI --- */}
      <div className="space-y-6 animate-fade-in pb-24 no-print relative min-h-screen">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-red-50 to-transparent"></div>
            <div className="relative z-10">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-xl text-red-600"><Briefcase size={28} /></div>
                    مكتب وكيل الشؤون الطلابية
                </h1>
                <p className="text-slate-500 mt-1 mr-14">المنصة المركزية لإدارة السلوك، الغياب، والإحالات.</p>
            </div>
            <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-400 uppercase">مستخدم حالياً</p>
                <p className="font-bold text-slate-800">{currentUser?.name}</p>
            </div>
        </div>

        {/* VIEW SWITCHER */}
        {activeView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
                {/* Stats Cards */}
                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">مخالفات اليوم</span>
                    <span className="text-3xl font-extrabold text-red-600 mt-1">{stats.todayViolations}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">إحالاتي</span>
                    <span className="text-3xl font-extrabold text-blue-900 mt-1">{stats.myReferralsCount}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">مؤشر الخطر</span>
                    <span className="text-3xl font-extrabold text-amber-600 mt-1">{stats.atRiskCount}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">حالات عولجت</span>
                    <span className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.resolvedReferrals}</span>
                </div>

                {/* Quick Chart */}
                <div className="md:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> أكثر السلوكيات تكراراً</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData} barSize={40}>
                                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: ATTENDANCE MONITOR */}
        {activeView === 'attendance' && (
            <AttendanceMonitor onPrintAction={handlePrintAttendanceAction} />
        )}

        {/* VIEW: REFERRALS TRACKING */}
        {activeView === 'referrals' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><GitCommit size={18}/> تتبع الإحالات المرسلة للموجه</h3>
                </div>
                {referrals.filter(r => r.referredBy === 'deputy').length === 0 ? (
                    <p className="text-center py-10 text-slate-400">لا يوجد إحالات مرسلة.</p>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {referrals.filter(r => r.referredBy === 'deputy').map(ref => (
                            <div key={ref.id} className="p-6 hover:bg-slate-50 transition-colors group">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-lg text-slate-900">{ref.studentName}</h4>
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{ref.grade}</span>
                                            {getReferralStatusBadge(ref.status)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                                            <AlertCircle size={14} className="text-slate-400" />
                                            {ref.reason}
                                        </div>
                                        
                                        {/* Status Line Visual */}
                                        <div className="flex items-center gap-2 text-xs mt-3">
                                            <span className={`flex items-center gap-1 ${ref.status !== 'pending' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                                <CheckCircle size={12}/> تم الإرسال
                                            </span>
                                            <span className="w-8 h-0.5 bg-slate-200"></span>
                                            <span className={`flex items-center gap-1 ${ref.outcome ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                                <CheckCircle size={12}/> رد الموجه
                                            </span>
                                            <span className="w-8 h-0.5 bg-slate-200"></span>
                                            <span className={`flex items-center gap-1 ${ref.status === 'resolved' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                                <CheckCircle size={12}/> قرار الوكيل (إغلاق)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Referral */}
                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <button onClick={() => handlePrintReferral(ref)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                                            <Printer size={14}/> طباعة التقرير
                                        </button>
                                        
                                        {ref.status === 'returned_to_deputy' && (
                                            <button onClick={() => handleCloseReferral(ref.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm animate-pulse">
                                                <CheckCircle size={14}/> اعتماد وإغلاق
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Counselor Outcome Box */}
                                {ref.outcome && (
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm mt-4 relative">
                                        <div className="absolute top-0 right-4 -mt-2 bg-white px-2 text-xs font-bold text-purple-700 border border-purple-100 rounded">رد الموجه الطلابي</div>
                                        <p className="text-slate-700 leading-relaxed mt-1">{ref.outcome}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* VIEW: POSITIVE BEHAVIOR */}
        {activeView === 'positive' && (
            <div className="animate-fade-in space-y-6">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Medal size={28} className="text-amber-300"/> سجل السلوك الإيجابي</h2>
                            <p className="text-emerald-100 opacity-90">رصد التميز وطباعة شهادات الشكر والتقدير.</p>
                        </div>
                        <button onClick={() => setShowPositiveModal(true)} className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2">
                            <Plus size={20}/> تسجيل تميز جديد
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                </div>
                
                {/* List of recent positive observations */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">أحدث المكرمين</h3>
                    <div className="text-center text-slate-400 py-4 text-sm">
                        السجل يعرض آخر الإدخالات التي تمت طباعة شهادات لها.
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: VIOLATIONS LOG (ENHANCED) */}
        {activeView === 'log' && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                        <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full p-3 pr-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-100" placeholder="بحث باسم الطالب..."/>
                    </div>
                </div>
                <div className="grid gap-3">
                    {records.filter(r => r.studentName.includes(search)).map(rec => (
                        <div key={rec.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-bold text-slate-800 text-lg">{rec.studentName}</h4>
                                        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold border border-red-100">{rec.violationName}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1"><span className="font-bold">الإجراء:</span> {rec.actionTaken}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{rec.date}</p>
                                </div>
                                
                                {/* Actions Toolbar */}
                                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handlePrintViolationAction(rec, 'commitment')} className="bg-slate-50 text-slate-600 p-2 rounded-lg hover:bg-slate-100 border border-slate-200" title="طباعة تعهد">
                                        <FileText size={16}/>
                                    </button>
                                    <button onClick={() => handlePrintViolationAction(rec, 'summons')} className="bg-slate-50 text-slate-600 p-2 rounded-lg hover:bg-slate-100 border border-slate-200" title="طباعة استدعاء">
                                        <Phone size={16}/>
                                    </button>
                                    <button onClick={() => handleCreateReferralFromRecord(rec)} className="bg-purple-50 text-purple-600 p-2 rounded-lg hover:bg-purple-100 border border-purple-200" title="إحالة للموجه">
                                        <Forward size={16}/>
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                    <button onClick={()=>deleteBehaviorRecord(rec.id).then(fetchData)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* FLOATING DOCK (Navigation) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-slate-700 flex gap-2 z-40 transition-all hover:scale-105 floating-dock">
            {[
                { id: 'dashboard', icon: LayoutGrid, label: 'الرئيسية', color: 'text-blue-400' },
                { id: 'attendance', icon: Activity, label: 'متابعة الغياب', color: 'text-orange-400' },
                { id: 'add', icon: FileWarning, label: 'رصد مخالفة', color: 'text-red-400' },
                { id: 'positive', icon: Star, label: 'سلوك إيجابي', color: 'text-yellow-400' },
                { id: 'referrals', icon: GitCommit, label: 'الإحالات', color: 'text-purple-400' },
                { id: 'log', icon: List, label: 'السجل', color: 'text-slate-400' },
            ].map(btn => (
                <button
                    key={btn.id}
                    onClick={() => {
                        if (btn.id === 'add') {
                            setViolationStep('form');
                            setShowViolationModal(true);
                        }
                        else setActiveView(btn.id as any);
                    }}
                    className={`p-3 rounded-xl transition-all relative group ${activeView === btn.id && btn.id !== 'add' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    title={btn.label}
                >
                    <btn.icon size={24} className={btn.color} />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {btn.label}
                    </span>
                    {activeView === btn.id && btn.id !== 'add' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
                </button>
            ))}
        </div>

        {/* MODAL: ADD VIOLATION (With Workflow) */}
        {showViolationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="bg-red-600 p-6 text-white flex justify-between items-center shrink-0">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Gavel size={24}/> رصد مخالفة سلوكية</h2>
                        <button onClick={() => setShowViolationModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={20}/></button>
                    </div>
                    
                    {/* STEP 1: FORM */}
                    {violationStep === 'form' && (
                        <form onSubmit={handleViolationSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <select required className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm" value={formGrade} onChange={e=>{setFormGrade(e.target.value); setFormClass(''); setSelectedStudentId('');}}>
                                    <option value="">الصف</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                                </select>
                                <select required disabled={!formGrade} className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm" value={formClass} onChange={e=>{setFormClass(e.target.value); setSelectedStudentId('');}}>
                                    <option value="">الفصل</option>{availableClasses.map(c=><option key={c} value={c}>{c}</option>)}
                                </select>
                                <select required disabled={!formClass} className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                    <option value="">الطالب</option>{availableStudents.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">درجة المخالفة</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {BEHAVIOR_VIOLATIONS.map(v => (
                                        <button type="button" key={v.degree} onClick={()=>setSelectedDegree(v.degree)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border ${selectedDegree === v.degree ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                                            {v.degree}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={selectedViolation} onChange={e=>setSelectedViolation(e.target.value)}>
                                    <option value="">اختر المخالفة...</option>
                                    {BEHAVIOR_VIOLATIONS.find(v=>v.degree===selectedDegree)?.violations.map(v=><option key={v} value={v}>{v}</option>)}
                                </select>
                                <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={actionTaken} onChange={e=>setActionTaken(e.target.value)}>
                                    <option value="">اختر الإجراء المتخذ...</option>
                                    {BEHAVIOR_VIOLATIONS.find(v=>v.degree===selectedDegree)?.actions.map(a=><option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>

                            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg">
                                {isEditing ? 'تحديث البيانات' : 'حفظ المخالفة'}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: POST-ACTION WORKFLOW */}
                    {violationStep === 'success' && lastSavedRecord && (
                        <div className="p-8 text-center space-y-8 animate-fade-in-up">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                                <CheckCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">تم رصد المخالفة بنجاح</h3>
                                <p className="text-slate-500 mt-2">ما هو الإجراء التالي المطلوب؟</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handlePrintViolationAction(lastSavedRecord, 'commitment')}
                                        className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <FileText size={32} className="text-slate-400 group-hover:text-blue-600 mb-2"/>
                                        <span className="font-bold text-slate-700 group-hover:text-blue-800">طباعة تعهد</span>
                                    </button>
                                    <button 
                                        onClick={() => handlePrintViolationAction(lastSavedRecord, 'summons')}
                                        className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-red-500 hover:bg-red-50 transition-all group"
                                    >
                                        <Phone size={32} className="text-slate-400 group-hover:text-red-600 mb-2"/>
                                        <span className="font-bold text-slate-700 group-hover:text-red-800">طباعة استدعاء</span>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleCreateReferralFromRecord(lastSavedRecord)}
                                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg hover:bg-purple-700 flex items-center justify-center gap-3 transition-all"
                                >
                                    <Forward size={24}/> تحويل للموجه الطلابي
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button onClick={() => { setShowViolationModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                                    اكتفِ بالحفظ فقط (إغلاق)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* MODAL: POSITIVE BEHAVIOR */}
        {showPositiveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-900/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white flex justify-between items-center shrink-0">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Star size={24} className="text-yellow-300"/> تسجيل سلوك إيجابي</h2>
                        <button onClick={() => setShowPositiveModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={20}/></button>
                    </div>
                    <form onSubmit={handlePositiveSubmit} className="p-6 space-y-6">
                        {/* Simplified Student Selector for Demo */}
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <label className="text-xs font-bold text-emerald-800 uppercase block mb-2">اختر الطالب</label>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <select className="p-2 rounded-lg text-sm" value={formGrade} onChange={e=>{setFormGrade(e.target.value); setFormClass('');}}><option value="">الصف</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select>
                                <select disabled={!formGrade} className="p-2 rounded-lg text-sm" value={formClass} onChange={e=>{setFormClass(e.target.value);}}><option value="">الفصل</option>{availableClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <select required disabled={!formClass} className="w-full p-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                <option value="">-- الطالب --</option>{availableStudents.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">سبب التكريم / السلوك الإيجابي</label>
                            <input required value={positiveReason} onChange={e=>setPositiveReason(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="مثال: تحسن دراسي، أمانة، مساعدة زملاء..."/>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">نقاط التميز الممنوحة</label>
                            <div className="flex gap-4">
                                {[5, 10, 20].map(p => (
                                    <button type="button" key={p} onClick={()=>setPositivePoints(p)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${positivePoints === p ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>
                                        +{p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2">
                            <Printer size={20}/> حفظ وطباعة الشهادة
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </>
  );
};

export default StaffDeputy;
