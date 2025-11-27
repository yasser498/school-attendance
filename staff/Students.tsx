import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, MessageCircle, X, Loader2, BookUser, Copy, Check, School, Smartphone, AlertTriangle, Printer, History, ClipboardList, Briefcase, FileWarning, Sparkles, Bell, Inbox, ArrowLeft, LayoutGrid } from 'lucide-react';
import { getStudents, getResolvedAlerts, getStudentAttendanceHistory, getAttendanceRecords, getAdminInsights, getReferrals, updateReferralStatus, getStaffUsers } from '../../services/storage';
import { Student, StaffUser, AttendanceStatus, ResolvedAlert, AdminInsight, Referral } from '../../types';
import { GRADES } from '../../constants';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface RiskCase {
  student: Student;
  absentCount: number;
  lateCount: number;
  actionRequired: 'counselor' | 'parent' | 'authority' | 'none';
}

const StaffStudents: React.FC = () => {
  const navigate = useNavigate();
  const SCHOOL_NAME = localStorage.getItem('school_name') || "متوسطة عماد الدين زنكي";

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View State: 'menu' is the entry point
  const [activeView, setActiveView] = useState<'menu' | 'actions' | 'directory' | 'insights' | 'referrals'>('menu');

  // Risk Analysis State
  const [riskCases, setRiskCases] = useState<RiskCase[]>([]);
  
  // Referrals (From Admin)
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Modal State for Student File
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'procedures' | 'contact'>('procedures');
  
  // Data for Student File
  const [studentHistory, setStudentHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
  const [studentAlerts, setStudentAlerts] = useState<ResolvedAlert[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Insights
  const [insights, setInsights] = useState<AdminInsight[]>([]);
  
  // Print State
  const [printLetterType, setPrintLetterType] = useState<'counselor' | 'parent' | 'authority' | 'history' | null>(null);
  
  // Dynamic Roles for Printing
  const [deputyName, setDeputyName] = useState('');

  // Responsive List
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const itemSize = isMobile ? 120 : 70; 

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }
    setCurrentUser(JSON.parse(session));
  }, [navigate]);

  // Fetch Data & Calculate Risks
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsData, attendanceData, insightsData, referralData, allStaff] = await Promise.all([
            getStudents(),
            getAttendanceRecords(),
            getAdminInsights('counselor'),
            getReferrals(),
            getStaffUsers()
        ]);
        setStudents(studentsData);
        setInsights(insightsData);
        setReferrals(referralData.filter(r => r.status !== 'resolved'));
        
        // Find Deputy Name
        const deputyUser = allStaff.find(u => u.permissions?.includes('deputy'));
        if (deputyUser) {
            setDeputyName(deputyUser.name);
        }

        // Calculate Risks
        const risks: RiskCase[] = [];
        const counts: Record<string, { absent: number, late: number }> = {};
        
        attendanceData.forEach(record => {
            record.records.forEach(r => {
                let sid = r.studentId;
                if (!sid) {
                    const found = studentsData.find(s => s.name === r.studentName);
                    if (found) sid = found.studentId;
                }
                if (sid) {
                    if (!counts[sid]) counts[sid] = { absent: 0, late: 0 };
                    if (r.status === AttendanceStatus.ABSENT) counts[sid].absent++;
                    if (r.status === AttendanceStatus.LATE) counts[sid].late++;
                }
            });
        });

        studentsData.forEach(s => {
            const stats = counts[s.studentId] || { absent: 0, late: 0 };
            let action: 'counselor' | 'parent' | 'authority' | 'none' = 'none';

            if (stats.absent >= 10) action = 'authority';
            else if (stats.absent >= 5) action = 'parent';
            else if (stats.absent >= 3) action = 'counselor';

            if (action !== 'none') {
                risks.push({
                    student: s,
                    absentCount: stats.absent,
                    lateCount: stats.late,
                    actionRequired: action
                });
            }
        });

        setRiskCases(risks.sort((a, b) => b.absentCount - a.absentCount));

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolveReferral = async (id: string) => {
      if (window.confirm("هل تم الانتهاء من متابعة هذه الحالة؟")) {
          await updateReferralStatus(id, 'resolved');
          setReferrals(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleOpenStudentFile = (studentId: string) => {
      const s = students.find(st => st.studentId === studentId);
      if (s) {
          setSelectedStudent(s);
          setActiveTab('procedures');
      }
  };

  useEffect(() => {
    if (selectedStudent) {
        setLoadingDetails(true);
        Promise.all([
            getStudentAttendanceHistory(selectedStudent.studentId, selectedStudent.grade, selectedStudent.className),
            new Promise(r => setTimeout(r, 300))
        ]).then(([history]) => {
            setStudentHistory(history);
            const allAlerts = getResolvedAlerts();
            const myAlerts = allAlerts
                .filter(a => a.studentId === selectedStudent.studentId)
                .sort((a, b) => new Date(b.dateResolved).getTime() - new Date(a.dateResolved).getTime());
            setStudentAlerts(myAlerts);
        }).finally(() => {
            setLoadingDetails(false);
        });
    }
  }, [selectedStudent]);

  const handlePrint = (type: 'counselor' | 'parent' | 'authority' | 'history') => {
    setPrintLetterType(type);
    // Delay ensuring rendering happens before print dialog on mobile
    setTimeout(() => {
        window.print();
        setPrintLetterType(null);
    }, 1500); 
  };

  const availableClasses = useMemo(() => {
    if (!filterGrade) return [];
    const relevantStudents = students.filter(s => s.grade === filterGrade);
    const classes = new Set(relevantStudents.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students, filterGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || s.studentId.includes(searchTerm) || s.phone.includes(searchTerm);
      const matchesGrade = filterGrade ? s.grade === filterGrade : true;
      const matchesClass = filterClass ? s.className === filterClass : true;
      return matchesSearch && matchesGrade && matchesClass;
    });
  }, [students, searchTerm, filterGrade, filterClass]);

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.substring(1);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const currentStudentStats = useMemo(() => {
      if (!selectedStudent) return { absent: 0, late: 0 };
      const historyAbsent = studentHistory.filter(r => r.status === AttendanceStatus.ABSENT).length;
      const historyLate = studentHistory.filter(r => r.status === AttendanceStatus.LATE).length;
      return { absent: historyAbsent, late: historyLate };
  }, [studentHistory, selectedStudent]);

  // Helper to get dynamic title for PARENT SUMMONS (Depends on who is logged in)
  const getUserTitle = () => {
      if (!currentUser) return 'المسؤول الإداري';
      if (currentUser.permissions?.includes('deputy')) return 'وكيل شؤون الطلاب';
      if (currentUser.permissions?.includes('students')) return 'الموجه الطلابي'; 
      return 'وكيل شؤون الطلاب'; 
  };

  const Row = ({ index, style }: ListChildComponentProps) => {
    const student = filteredStudents[index];
    const hasPhone = student.phone && student.phone.length > 5;
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (student.phone) {
        navigator.clipboard.writeText(student.phone);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };
    
    return (
      <div style={style} className="flex items-center border-b border-slate-50 hover:bg-slate-50 transition-colors px-4 py-2">
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
             {student.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedStudent(student)}>
             <p className="font-bold text-slate-800 text-sm truncate mb-1 hover:text-blue-900">{student.name}</p>
             <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-mono text-slate-500 dir-ltr">
                   {student.phone || '---'} <Smartphone size={10} />
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                    <School size={10} /> {student.grade} - {student.className}
                </span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
             {hasPhone ? (
                <>
                <button onClick={handleCopy} className={`w-8 h-8 flex items-center justify-center rounded-lg border ${copied ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>
                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                </button>
                <a href={`tel:${student.phone}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Phone size={14} />
                </a>
                <button onClick={() => openWhatsApp(student.phone)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <MessageCircle size={14} />
                </button>
                </>
             ) : (
                <span className="text-xs text-slate-300 italic">لا يوجد رقم</span>
             )}
        </div>
      </div>
    );
  };

  if (!currentUser) return null;

  return (
    <>
    {/* Print Templates */}
    <style>
        {`
          @media print {
            body * { visibility: hidden; }
            /* Hide Main App Content */
            .no-print, .no-print * { display: none !important; }
            
            /* Show Print Container */
            #staff-print-container { 
                display: block !important; 
                visibility: visible !important;
                position: absolute !important; 
                top: 0 !important; 
                left: 0 !important; 
                width: 100% !important; 
                height: 100% !important;
                margin: 0 !important; 
                padding: 20px !important;
                z-index: 9999 !important;
            }
            #staff-print-container * { 
                visibility: visible !important; 
            }
            @page { size: auto; margin: 0mm; }
            
            .print-border {
                border: 2px solid #000;
                padding: 20px;
                min-height: 95vh;
            }
          }
        `}
    </style>

    <div id="staff-print-container" className="hidden print:block">
        
        {/* Parent Summons Template */}
        {printLetterType === 'parent' && selectedStudent && (
            <div className="print-border p-8 text-right space-y-8" dir="rtl">
                {/* Logo Resized Small */}
                <img src="https://www.raed.net/img?id=1473202" alt="Header" className="w-32 h-auto object-contain mb-4 mx-auto" />
                
                <h2 className="text-2xl font-extrabold text-center underline mb-8">إشعار غياب واستدعاء ولي أمر</h2>
                
                {/* Student Data Grid */}
                <div className="border-2 border-black mb-8">
                    <div className="grid grid-cols-2">
                        <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">اسم الطالب</div>
                        <div className="border-b border-black p-2 font-bold">{selectedStudent.name}</div>
                        
                        <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">الصف والفصل</div>
                        <div className="border-b border-black p-2">{selectedStudent.grade} - {selectedStudent.className}</div>
                        
                        <div className="border-l border-black p-2 bg-gray-100 font-bold">رقم الهوية</div>
                        <div className="p-2 font-mono">{selectedStudent.studentId}</div>
                    </div>
                </div>

                <div className="text-xl leading-relaxed space-y-6 font-medium">
                    <p>المكرم ولي أمر الطالب.. وفقه الله</p>
                    <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>
                        نفيدكم بأن ابنكم الموضح بياناته أعلاه قد تكرر غيابه عن المدرسة حيث بلغ مجموع أيام غيابه 
                        <strong> ({currentStudentStats.absent}) </strong> أيام خلال هذا الفصل الدراسي، 
                        وذلك دون تقديم عذر مقبول لإدارة المدرسة.
                    </p>
                    <p>
                        وحيث أن هذا الغياب يؤثر سلباً على مستواه الدراسي وتحصيله العلمي، ويعد مخالفة صريحة لقواعد السلوك والمواظبة،
                        نأمل منكم الحضور للمدرسة يوم ..................... الموافق ...../...../.....هـ 
                        لمناقشة أسباب الغياب والتعاون معنا لمعالجة الوضع قبل تفاقمه.
                    </p>
                    <p>شاكرين لكم حسن تعاونكم وحرصكم على مصلحة ابنكم.</p>
                </div>

                <div className="flex justify-between mt-24 px-12 text-xl">
                    <div className="text-center">
                        {/* Dynamic Title based on User Role */}
                        <p className="font-bold mb-4">{getUserTitle()}</p>
                        <p className="text-lg font-bold">{currentUser?.name}</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-4">مدير المدرسة</p>
                        <p className="text-lg">.............................</p>
                    </div>
                </div>
                
                <div className="mt-12 text-center text-sm text-gray-500 border-t pt-4">
                    حرر بتاريخ: {new Date().toLocaleDateString('ar-SA')}
                </div>
            </div>
        )}

        {/* Counselor Referral Template */}
        {printLetterType === 'counselor' && selectedStudent && (
            <div className="print-border p-8 text-right space-y-8" dir="rtl">
                {/* Logo Resized Small */}
                <img src="https://www.raed.net/img?id=1473202" alt="Header" className="w-32 h-auto object-contain mb-4 mx-auto" />
                
                <h2 className="text-2xl font-extrabold text-center underline mb-8">نموذج إحالة للموجه الطلابي</h2>
                
                {/* Student Data Grid */}
                <div className="border-2 border-black mb-8">
                    <div className="grid grid-cols-2">
                        <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">اسم الطالب</div>
                        <div className="border-b border-black p-2 font-bold">{selectedStudent.name}</div>
                        
                        <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">الصف والفصل</div>
                        <div className="border-b border-black p-2">{selectedStudent.grade} - {selectedStudent.className}</div>
                        
                        <div className="border-l border-black p-2 bg-gray-100 font-bold">عدد أيام الغياب</div>
                        <div className="p-2 font-bold">{currentStudentStats.absent} أيام</div>
                    </div>
                </div>

                <div className="text-xl leading-relaxed space-y-6 font-medium">
                    <p>المكرم الموجه الطلابي بالمدرسة.. وفقه الله</p>
                    <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                    <p>
                        نحيل إليكم الطالب الموضح بياناته أعلاه، وذلك نظراً لتكرار غيابه عن المدرسة وتجاوزه الحد الذي يستدعي التدخل التربوي والإرشادي.
                    </p>
                    <p>
                        نأمل منكم الجلوس مع الطالب ودراسة حالته للتعرف على الأسباب الحقيقية وراء هذا الغياب، 
                        واتخاذ الإجراءات التربوية المناسبة لمساعدته على الانتظام في الدراسة وتحسين سلوك المواظبة لديه.
                    </p>
                    <p>كما نرجو إفادتنا بما يتم اتخاذه من إجراءات ونتائج المتابعة.</p>
                    <p>ولكم جزيل الشكر،،،</p>
                </div>

                <div className="mt-24 px-12 text-xl">
                    <div className="text-left pl-12">
                        {/* Referral Signature is ALWAYS the Deputy (Fetched from DB) or current user as fallback */}
                        <p className="font-bold mb-4">وكيل شؤون الطلاب</p>
                        <p className="text-lg font-bold">{deputyName || currentUser?.name}</p>
                        <p className="mt-4">التوقيع: .............................</p>
                    </div>
                </div>
                
                <div className="mt-12 text-center text-sm text-gray-500 border-t pt-4">
                    حرر بتاريخ: {new Date().toLocaleDateString('ar-SA')}
                </div>
            </div>
        )}
        
        {/* Authority Referral Template (Optional) */}
        {printLetterType === 'authority' && selectedStudent && (
             <div className="print-border p-8 text-right space-y-8" dir="rtl">
                <img src="https://www.raed.net/img?id=1473202" alt="Header" className="w-32 h-auto object-contain mb-4 mx-auto" />
                <h2 className="text-2xl font-extrabold text-center underline mb-8">إحالة للجهات المختصة</h2>
                <p className="text-center text-xl">نموذج رسمي لإدارة التعليم (قيد التنفيذ)</p>
             </div>
        )}
    </div>

    <div className="no-print space-y-6 pb-20 animate-fade-in relative">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
         <div className="flex items-center gap-3">
             <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                 <BookUser size={24} />
             </div>
             <div>
                 <h1 className="text-xl font-bold text-slate-900">منصة التوجيه والإرشاد</h1>
                 <p className="text-xs text-slate-500">متابعة الغياب والانضباط</p>
             </div>
         </div>
         {activeView !== 'menu' && (
             <button 
                 onClick={() => setActiveView('menu')}
                 className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-900 bg-slate-50 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
             >
                 <LayoutGrid size={16} />
                 القائمة الرئيسية
             </button>
         )}
      </div>

      {/* MENU VIEW */}
      {activeView === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
              <button onClick={() => setActiveView('actions')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-300 transition-all text-right relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-200">
                          <FileWarning size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">الإجراءات التلقائية</h3>
                      <p className="text-slate-500 text-xs">الطلاب المتجاوزين لحد الغياب المسموح.</p>
                      <div className="mt-4 flex justify-end">
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">{riskCases.length} حالة</span>
                      </div>
                  </div>
              </button>

              <button onClick={() => setActiveView('referrals')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-right relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                          <Inbox size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">المحالة من الإدارة</h3>
                      <p className="text-slate-500 text-xs">الحالات المحولة من المدير للمتابعة.</p>
                      <div className="mt-4 flex justify-end">
                          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{referrals.length} حالة</span>
                      </div>
                  </div>
              </button>

              <button onClick={() => setActiveView('directory')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all text-right relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                          <Smartphone size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">دليل الاتصال</h3>
                      <p className="text-slate-500 text-xs">البحث عن طالب والتواصل مع ولي الأمر.</p>
                  </div>
              </button>

              <button onClick={() => setActiveView('insights')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all text-right relative overflow-hidden lg:col-span-3">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
                              <Sparkles size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-800 mb-1">توجيهات الإدارة الذكية</h3>
                              <p className="text-slate-500 text-xs">التقارير والتحليلات المرسلة من مدير المدرسة.</p>
                          </div>
                      </div>
                      {insights.length > 0 && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">رسائل جديدة</span>}
                  </div>
              </button>
          </div>
      )}

      {/* VIEW 1: Administrative Actions */}
      {activeView === 'actions' && (
          <div className="animate-fade-in space-y-6">
              {loading ? <div className="py-20 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/>جاري التحليل...</div> : riskCases.length === 0 ? (
                 <div className="py-20 text-center text-emerald-600 bg-emerald-50 rounded-2xl border border-emerald-100">
                     <Check size={48} className="mx-auto mb-4" />
                     <h3 className="text-xl font-bold">حالة ممتازة!</h3>
                     <p className="text-emerald-800 opacity-80 mt-1">لا يوجد طلاب تجاوزوا حدود الغياب المسموحة اليوم.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {riskCases.map((caseItem, idx) => (
                         <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
                             <div className={`absolute top-0 right-0 w-1 h-full ${caseItem.actionRequired === 'authority' ? 'bg-red-600' : caseItem.actionRequired === 'parent' ? 'bg-orange-500' : 'bg-amber-400'}`}></div>
                             <div className="flex justify-between items-start mb-4 pl-2">
                                 <div>
                                     <h3 className="font-bold text-slate-900 text-lg">{caseItem.student.name}</h3>
                                     <p className="text-xs text-slate-500 mt-1">{caseItem.student.grade} - {caseItem.student.className}</p>
                                 </div>
                                 <div className="bg-slate-100 px-3 py-1 rounded-lg text-center">
                                     <span className="block text-xl font-bold text-slate-800">{caseItem.absentCount}</span>
                                     <span className="text-[10px] font-bold uppercase text-slate-400">غياب</span>
                                 </div>
                             </div>
                             <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                                 <div className="flex justify-between mb-1">
                                     <span className="text-slate-500">الإجراء المستحق:</span>
                                     <span className="font-bold text-blue-900">
                                         {caseItem.actionRequired === 'counselor' ? 'تحويل للموجه' : caseItem.actionRequired === 'parent' ? 'استدعاء ولي أمر' : 'إحالة للجهات المختصة'}
                                     </span>
                                 </div>
                             </div>
                             <button onClick={() => { setSelectedStudent(caseItem.student); setActiveTab('procedures'); }} className="mt-auto w-full py-3 bg-blue-900 text-white rounded-xl font-bold text-sm hover:bg-blue-800 flex items-center justify-center gap-2">
                                <Briefcase size={16} /> فتح الملف واتخاذ إجراء
                             </button>
                         </div>
                     ))}
                 </div>
              )}
          </div>
      )}

      {/* VIEW 2: REFERRALS (FROM ADMIN) */}
      {activeView === 'referrals' && (
          <div className="animate-fade-in">
              {referrals.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                      <Inbox size={48} className="mx-auto mb-4 opacity-50"/>
                      <p>لا توجد حالات محالة من الإدارة حالياً</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {referrals.map(ref => (
                          <div key={ref.id} className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                          <AlertTriangle size={20} />
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-slate-900">{ref.studentName}</h3>
                                          <p className="text-xs text-slate-500">{ref.grade} - {ref.className}</p>
                                      </div>
                                  </div>
                                  <span className="text-xs font-mono bg-slate-50 px-2 py-1 rounded text-slate-500">{ref.referralDate}</span>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm mb-4">
                                  <p className="text-slate-600"><span className="font-bold text-slate-700">السبب:</span> {ref.reason}</p>
                                  <p className="text-xs text-slate-400 mt-1">محال من: الإدارة المدرسية</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleOpenStudentFile(ref.studentId)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
                                      فتح الملف
                                  </button>
                                  <button onClick={() => handleResolveReferral(ref.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                                      <Check size={16}/> تم المتابعة
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* VIEW 3: DIRECTORY */}
      {activeView === 'directory' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث سريع..." className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-sm" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterClass(''); }} className="bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg text-sm font-bold text-slate-700 focus:outline-none">
                            <option value="">كل الصفوف</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} disabled={!filterGrade} className="bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg text-sm font-bold text-slate-700 focus:outline-none disabled:opacity-50">
                            <option value="">{filterGrade ? 'كل الفصول' : '-'}</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[500px]">
                <div className="h-full" style={{ direction: 'ltr' }}>
                    <List height={500} itemCount={filteredStudents.length} itemSize={itemSize} width={'100%'} direction="rtl">
                        {Row}
                    </List>
                </div>
              </div>
          </div>
      )}

      {/* VIEW 4: INSIGHTS */}
      {activeView === 'insights' && (
           <div className="animate-fade-in">
               <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-2xl p-8 text-white mb-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                   <div className="relative z-10">
                       <h2 className="text-2xl font-bold flex items-center gap-3 mb-2"><Sparkles className="text-amber-400" /> التوجيه الإداري الذكي</h2>
                       <p className="text-purple-200 opacity-80">التقارير والتحليلات المرسلة من مدير المدرسة</p>
                   </div>
               </div>
               {insights.length === 0 ? (
                   <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400"><Bell size={48} className="mx-auto mb-4 opacity-50"/><p>لا توجد توجيهات جديدة</p></div>
               ) : (
                   <div className="space-y-4">
                       {insights.map(insight => (
                           <div key={insight.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                   <span className="flex items-center gap-2 text-purple-700 font-bold text-sm"><Sparkles size={16}/> تحليل ذكي</span>
                                   <span className="text-xs text-slate-400">{new Date(insight.createdAt).toLocaleDateString('ar-SA')}</span>
                               </div>
                               <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-line font-medium text-sm">{insight.content}</div>
                           </div>
                       ))}
                   </div>
               )}
           </div>
       )}

      {/* Student File Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center text-2xl font-bold border border-white/20">{selectedStudent.name.charAt(0)}</div>
                      <div>
                          <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                          <div className="flex items-center gap-3 text-slate-300 text-sm mt-1"><span className="flex items-center gap-1"><School size={12}/> {selectedStudent.grade}</span><span className="flex items-center gap-1 font-mono"><Smartphone size={12}/> {selectedStudent.phone || 'N/A'}</span></div>
                      </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex border-b border-slate-100 px-6 pt-2 shrink-0 bg-white">
                  <button onClick={() => setActiveTab('procedures')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'procedures' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><AlertTriangle size={14}/> الملف والإجراءات</button>
                  <button onClick={() => setActiveTab('contact')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'contact' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>بيانات التواصل</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  {loadingDetails ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400"/></div> : (
                      <>
                        {activeTab === 'contact' && (
                            <div className="text-center space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm inline-block">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tel:${selectedStudent.phone}`} alt="Phone QR" className="w-32 h-32 object-contain"/>
                                    <p className="text-xs text-slate-400 mt-2">امسح للاتصال</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                                    <button onClick={() => window.location.href=`tel:${selectedStudent.phone}`} className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"><Phone size={18}/> اتصال</button>
                                    <button onClick={() => openWhatsApp(selectedStudent.phone)} className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700"><MessageCircle size={18}/> واتساب</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'procedures' && (
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-white text-red-700 p-4 rounded-xl border border-red-100 text-center shadow-sm"><p className="text-3xl font-bold">{currentStudentStats.absent}</p><p className="text-xs font-bold uppercase text-red-400">أيام الغياب</p></div>
                                    <div className="flex-1 bg-white text-amber-700 p-4 rounded-xl border border-amber-100 text-center shadow-sm"><p className="text-3xl font-bold">{currentStudentStats.late}</p><p className="text-xs font-bold uppercase text-amber-400">أيام التأخر</p></div>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Printer size={16}/> طباعة الخطابات الرسمية</h3>
                                    <div className="space-y-2">
                                        <button onClick={() => handlePrint('counselor')} disabled={currentStudentStats.absent < 3} className="w-full flex justify-between items-center px-4 py-3 rounded-lg border border-slate-100 hover:border-amber-200 bg-slate-50 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"><span className="font-bold text-sm text-slate-600 group-hover:text-amber-800">1. إحالة للموجه الطلابي</span><span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">3 أيام</span></button>
                                        <button onClick={() => handlePrint('parent')} disabled={currentStudentStats.absent < 5} className="w-full flex justify-between items-center px-4 py-3 rounded-lg border border-slate-100 hover:border-orange-200 bg-slate-50 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"><span className="font-bold text-sm text-slate-600 group-hover:text-orange-800">2. استدعاء ولي أمر</span><span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">5 أيام</span></button>
                                        <button onClick={() => handlePrint('authority')} disabled={currentStudentStats.absent < 10} className="w-full flex justify-between items-center px-4 py-3 rounded-lg border border-slate-100 hover:border-red-200 bg-slate-50 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"><span className="font-bold text-sm text-slate-600 group-hover:text-red-800">3. إحالة للجهات المختصة</span><span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">10 أيام</span></button>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><History size={16}/> سجل الإجراءات</h3></div>
                                    <div className="divide-y divide-slate-100">
                                        {studentAlerts.length === 0 ? <div className="p-4 text-center text-slate-400 text-xs">لا يوجد إجراءات</div> : studentAlerts.map((alert, idx) => (
                                            <div key={idx} className="p-3 text-sm flex justify-between items-center"><div><span className="block font-bold text-slate-800 text-xs mb-1">{alert.dateResolved}</span><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">{alert.actionType}</span></div><Check size={16} className="text-emerald-500"/></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                      </>
                  )}
              </div>
           </div>
        </div>
      )}
    </div>
    </>
  );
};

export default StaffStudents;