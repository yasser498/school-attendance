import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, AlertTriangle, Plus, Search, Sparkles, 
  User, FileWarning, BarChart2, Printer, 
  Trash2, Edit, LayoutGrid, School, Inbox,
  Calendar, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend
} from 'recharts';
import { 
  getStudents, 
  getBehaviorRecords, 
  addBehaviorRecord, 
  updateBehaviorRecord,
  deleteBehaviorRecord,
  generateSmartContent, 
  sendAdminInsight,
  getAdminInsights
} from '../../services/storage';
import { Student, BehaviorRecord, StaffUser, AdminInsight } from '../../types';
import { BEHAVIOR_VIOLATIONS, GRADES } from '../../constants';

const StaffDeputy: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const SCHOOL_NAME = localStorage.getItem('school_name') || "متوسطة عماد الدين زنكي";
  
  // Navigation View State
  const [activeView, setActiveView] = useState<'menu' | 'add' | 'log' | 'daily' | 'analytics' | 'inbox'>('menu');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [adminInsights, setAdminInsights] = useState<AdminInsight[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Placeholder AI state (للتوسع لاحقاً)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // --- Form State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formGrade, setFormGrade] = useState('');
  const [formClass, setFormClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDegree, setSelectedDegree] = useState(BEHAVIOR_VIOLATIONS[0].degree);
  const [selectedViolation, setSelectedViolation] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  
  // Printing State
  const [printMode, setPrintMode] = useState<'none' | 'commitment' | 'daily' | 'summons' | 'monthly'>('none');
  const [recordToPrint, setRecordToPrint] = useState<BehaviorRecord | null>(null);

  // Search & Date State
  const [search, setSearch] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Monthly report state
  const [monthlyMonth, setMonthlyMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (session) setCurrentUser(JSON.parse(session));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, r, i] = await Promise.all([
        getStudents(), 
        getBehaviorRecords(),
        getAdminInsights('deputy')
      ]);
      setStudents(s);
      setRecords(r);
      setAdminInsights(i);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Form Logic ---
  const availableClasses = useMemo(() => {
    if (!formGrade) return [];
    const classes = new Set(students.filter(s => s.grade === formGrade).map(s => s.className));
    return Array.from(classes).sort();
  }, [students, formGrade]);

  const availableStudents = useMemo(() => {
    return students.filter(s => s.grade === formGrade && s.className === formClass);
  }, [students, formGrade, formClass]);

  // Logic to show print buttons based on action content (In Form)
  const showCommitmentPrint = useMemo(() => {
    return actionTaken.includes('تعهد');
  }, [actionTaken]);

  const showSummonsPrint = useMemo(() => {
    return actionTaken.includes('استدعاء');
  }, [actionTaken]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormGrade('');
    setFormClass('');
    setSelectedStudentId('');
    setSelectedDegree(BEHAVIOR_VIOLATIONS[0].degree);
    setSelectedViolation('');
    setActionTaken('');
    setNotes('');
  };

  const handleEdit = (rec: BehaviorRecord) => {
    setIsEditing(true);
    setEditingId(rec.id);
    setFormGrade(rec.grade);
    setFormClass(rec.className);
    
    const studentObj = students.find(s => s.studentId === rec.studentId);
    if (studentObj) {
      setSelectedStudentId(studentObj.id);
    } else {
      setSelectedStudentId(''); 
    }

    setSelectedDegree(rec.violationDegree);
    setSelectedViolation(rec.violationName);
    setActionTaken(rec.actionTaken);
    setNotes(rec.notes || '');
    setActiveView('add');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedViolation) return;
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const violationObj = BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree);
    const article = violationObj?.article || '';
    const now = new Date();
    const todayISO = now.toISOString();

    const recordData: BehaviorRecord = {
      id: editingId || '',
      studentId: student.studentId,
      studentName: student.name,
      grade: student.grade,
      className: student.className,
      date: todayISO.split('T')[0],
      violationDegree: selectedDegree,
      violationName: selectedViolation,
      articleNumber: article,
      actionTaken: actionTaken,
      notes: notes,
      staffId: currentUser?.id,
      createdAt: isEditing 
        ? (records.find(r => r.id === editingId)?.createdAt || todayISO)
        : todayISO
    };

    if (isEditing) {
      await updateBehaviorRecord(recordData);
      alert("تم تعديل المخالفة بنجاح");
    } else {
      await addBehaviorRecord(recordData);
      alert("تم تسجيل المخالفة بنجاح");
    }
    
    resetForm();
    fetchData();
    setActiveView('log');
  };

  // --- طباعة من السجل ---
  const handlePrintFromLog = (rec: BehaviorRecord, mode: 'commitment' | 'summons') => {
    setRecordToPrint(rec);
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode('none');
      setRecordToPrint(null);
    }, 200);
  };

  // إنشاء سجل مؤقت للطباعة من الفورم
  const buildTempRecordFromForm = (): BehaviorRecord | null => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;
    const todayISO = new Date().toISOString();

    return {
      id: 'temp',
      studentId: student.studentId,
      studentName: student.name,
      grade: formGrade,
      className: formClass,
      date: todayISO.split('T')[0],
      violationDegree: selectedDegree,
      violationName: selectedViolation,
      articleNumber: '',
      actionTaken: actionTaken,
      notes: notes,
      staffId: currentUser?.id,
      createdAt: todayISO
    };
  };

  const handlePrintCommitment = () => {
    const temp = buildTempRecordFromForm();
    if (!temp) return;
    setRecordToPrint(temp);
    setPrintMode('commitment');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
      setRecordToPrint(null);
    }, 200);
  };

  const handlePrintSummons = () => {
    const temp = buildTempRecordFromForm();
    if (!temp) return;
    setRecordToPrint(temp);
    setPrintMode('summons');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
      setRecordToPrint(null);
    }, 200);
  };

  const handlePrintDaily = () => {
    setPrintMode('daily');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 200);
  };

  const handlePrintMonthly = () => {
    setPrintMode('monthly');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 200);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await deleteBehaviorRecord(id);
      fetchData();
    }
  };

  // --- Advanced Analytics Logic ---
  const analyticsData = useMemo(() => {
    const total = records.length;
    const studentCounts: Record<string, { name: string, grade: string, count: number, id: string, score: number }> = {};
    const classMap: Record<string, { grade: string, className: string, count: number }> = {};
    const typeMap: Record<string, number> = {};
    const degreeMap: Record<string, number> = {};
    let severeCount = 0;

    records.forEach(r => {
      if (!studentCounts[r.studentId]) {
        studentCounts[r.studentId] = { name: r.studentName, grade: `${r.grade} - ${r.className}`, count: 0, id: r.studentId, score: 0 };
      }
      studentCounts[r.studentId].count++;
      const weight = r.violationDegree.includes('الخامسة') 
        ? 10 
        : r.violationDegree.includes('الرابعة') 
        ? 7 
        : r.violationDegree.includes('الثالثة') 
        ? 5 
        : r.violationDegree.includes('الثانية') 
        ? 3 
        : 1;
      studentCounts[r.studentId].score += weight;

      const key = `${r.grade}-${r.className}`;
      if (!classMap[key]) classMap[key] = { grade: r.grade, className: r.className, count: 0 };
      classMap[key].count++;

      typeMap[r.violationName] = (typeMap[r.violationName] || 0) + 1;
      degreeMap[r.violationDegree] = (degreeMap[r.violationDegree] || 0) + 1;

      if (r.violationDegree.includes('الرابعة') || r.violationDegree.includes('الخامسة')) {
        severeCount++;
      }
    });

    const topOffenders = Object.values(studentCounts).sort((a, b) => b.score - a.score).slice(0, 5);
    const classStats = Object.values(classMap).sort((a, b) => b.count - a.count);
    const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const degreeData = Object.entries(degreeMap).map(([name, value]) => ({ name, value }));

    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    const trendData = last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' }),
      count: records.filter(r => r.date === date).length
    }));

    const uniqueStudentsWithViolations = Object.keys(studentCounts).length;
    const avgPerStudent = uniqueStudentsWithViolations
      ? (total / uniqueStudentsWithViolations)
      : 0;

    const severeRatio = total ? (severeCount / total) * 100 : 0;

    return { 
      total, 
      topOffenders, 
      classStats, 
      trendData, 
      degreeData, 
      typeData,
      uniqueStudentsWithViolations,
      avgPerStudent,
      severeCount,
      severeRatio
    };
  }, [records]);

  const filteredRecords = records.filter(r => 
    r.studentName.includes(search) || r.violationName.includes(search)
  );
  const dailyRecords = records.filter(r => r.date === reportDate);

  const monthlyRecords = useMemo(
    () => records.filter(r => r.date.startsWith(monthlyMonth)),
    [records, monthlyMonth]
  );

  const DEGREE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

  // REUSABLE HEADER COMPONENT FOR PRINTING
  const OfficialHeader = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {/* أعلى يسار: المملكة / الوزارة */}
        <div className="text-left font-bold text-sm space-y-1">
          <p>المملكة العربية السعودية</p>
          <p>وزارة التعليم</p>
        </div>
        {/* المنتصف: الشعار */}
        <div className="flex-1 flex justify-center">
          <img
            src="https://www.raed.net/img?id=1473202"
            alt="شعار وزارة التعليم"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>
      {/* خط فاصل أسفل الكليشة */}
      <hr className="border-t-2 border-black mt-4" />
      {/* اسم المدرسة في المنتصف بشكل رسمي */}
      <div className="mt-2 text-center text-sm font-bold">
        {SCHOOL_NAME}
      </div>
    </div>
  );

  const formatMonthLabel = (ym: string) => {
    try {
      const d = new Date(ym + '-01');
      return d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  return (
    <>
      {/* --- GLOBAL PRINT STYLES --- */}
      <style>
        {`
          @page {
            size: A4;
            margin: 15mm;
          }

          @media print {
            html, body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body * { 
              visibility: hidden; 
            }

            #print-container, #print-container * {
              visibility: visible;
            }

            #print-container { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              background: white; 
              padding: 0 15mm; 
              box-sizing: border-box;
              z-index: 9999; 
            }

            .no-print { 
              display: none !important; 
            }

            .print-border {
              border: 2px solid #000;
              padding: 16px;
              min-height: 260mm;
              box-sizing: border-box;
            }

            #print-container table {
              width: 100%;
              border-collapse: collapse;
            }

            #print-container th,
            #print-container td {
              border: 1px solid #000;
            }

            .avoid-break {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* --- PRINT CONTAINER --- */}
      <div
        id="print-container"
        className="hidden print:block text-[14px] leading-relaxed"
      >
        {/* Commitment Letter */}
        {printMode === 'commitment' && recordToPrint && (
          <div className="print-border p-8 text-right space-y-8" dir="rtl">
            <OfficialHeader />
            
            <h1 className="text-3xl font-extrabold text-center mb-8 underline underline-offset-8">
              تعهد خطي (مخالفة سلوكية)
            </h1>
            
            <div className="text-right space-y-6 text-xl leading-relaxed font-medium">
              <p>
                أقر أنا الطالب/ة:{" "}
                <strong>{recordToPrint.studentName}</strong>
              </p>
              <p>
                بالصف:{" "}
                <strong>
                  {recordToPrint.grade} - {recordToPrint.className}
                </strong>
              </p>
              <p>بأنني قمت بالمخالفة التالية:</p>
              <div className="bg-gray-100 p-4 border border-gray-300 rounded-lg">
                <p className="font-bold text-red-800">
                  {recordToPrint.violationName}
                </p>
              </div>
              
              <p className="mt-8">
                وأتعهد بعدم تكرار هذا السلوك مستقبلاً، والالتزام بالأنظمة
                والتعليمات المدرسية. وفي حال التكرار، أتحمل كافة الإجراءات
                النظامية المترتبة على ذلك وفق لائحة السلوك والمواظبة.
              </p>
            </div>

            <div className="flex justify-between mt-24 px-12 text-lg">
              <div className="text-center">
                <p className="font-bold mb-4">الطالب/ة</p>
                <p className="mt-8">.............................</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-4">وكيل شؤون الطلاب</p>
                <p className="font-bold mb-8">{currentUser?.name}</p>
                <p>التوقيع: .............................</p>
              </div>
            </div>
            
            <div className="mt-12 text-center text-sm text-slate-500 border-t pt-4">
              حرر بتاريخ: {new Date().toLocaleDateString('ar-SA')}
            </div>
          </div>
        )}

        {/* Parent Summons Letter */}
        {printMode === 'summons' && recordToPrint && (
          <div className="print-border p-8 text-right space-y-8" dir="rtl">
            <OfficialHeader />
            
            <h2 className="text-2xl font-extrabold text-center underline mb-8">
              خطاب استدعاء ولي أمر
            </h2>
            
            {/* Student Data Grid */}
            <div className="border-2 border-black mb-8">
              <div className="grid grid-cols-2">
                <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">
                  اسم الطالب
                </div>
                <div className="border-b border-black p-2 font-bold">
                  {recordToPrint.studentName}
                </div>
                
                <div className="border-b border-l border-black p-2 bg-gray-100 font-bold">
                  الصف والفصل
                </div>
                <div className="border-b border-black p-2">
                  {recordToPrint.grade} - {recordToPrint.className}
                </div>
                
                <div className="border-l border-black p-2 bg-gray-100 font-bold">
                  رقم الهوية
                </div>
                <div className="p-2 font-mono">
                  {recordToPrint.studentId}
                </div>
              </div>
            </div>

            <div className="text-xl leading-relaxed space-y-6 font-medium">
              <p>المكرم ولي أمر الطالب.. وفقه الله</p>
              <p>السلام عليكم ورحمة الله وبركاته،،،</p>
              <p>
                نفيدكم بأنه تم رصد مخالفة سلوكية على ابنكم:
                <br />
                <strong>({recordToPrint.violationName})</strong>
              </p>
              <p>
                لذا نأمل منكم التكرم بالحضور للمدرسة يوم
                ................................ الموافق ...../...../.....هـ
                وذلك لمناقشة وضع الطالب وتوقيع الإجراءات اللازمة لضمان تعديل
                السلوك وعدم تكراره.
              </p>
              <p>شاكرين لكم حسن تعاونكم وحرصكم على مصلحة ابنكم.</p>
            </div>

            <div className="flex justify-between mt-24 px-12 text-lg">
              <div className="text-center">
                <p className="font-bold mb-4">وكيل شؤون الطلاب</p>
                <p className="text-lg font-bold mb-8">
                  {currentUser?.name}
                </p>
                <p>التوقيع: .............................</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-4">قائد المدرسة</p>
                <p className="text-lg mb-8">.............................</p>
                <p>التوقيع: .............................</p>
              </div>
            </div>
            
            <div className="mt-12 text-center text-sm text-gray-500 border-t pt-4">
              حرر بتاريخ: {new Date().toLocaleDateString('ar-SA')}
            </div>
          </div>
        )}

        {/* Daily Report Template */}
        {printMode === 'daily' && (
          <div className="print-border p-6 text-right space-y-6" dir="rtl">
            <OfficialHeader />
            <h1 className="text-2xl font-bold text-center mb-4">
              تقرير المخالفات السلوكية اليومي
            </h1>
            <p className="text-center mb-4 text-lg">
              التاريخ: <strong>{reportDate}</strong>
            </p>

            <table className="w-full text-right border-collapse border border-slate-800 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 p-2">الطالب</th>
                  <th className="border border-slate-800 p-2">الصف</th>
                  <th className="border border-slate-800 p-2">المخالفة</th>
                  <th className="border border-slate-800 p-2">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {dailyRecords.length === 0 ? (
                  <tr className="avoid-break">
                    <td
                      colSpan={4}
                      className="border border-slate-800 p-4 text-center"
                    >
                      لا يوجد مخالفات مسجلة في هذا اليوم
                    </td>
                  </tr>
                ) : (
                  dailyRecords.map((rec, idx) => (
                    <tr key={idx} className="avoid-break">
                      <td className="border border-slate-800 p-2">
                        {rec.studentName}
                      </td>
                      <td className="border border-slate-800 p-2">
                        {rec.grade} - {rec.className}
                      </td>
                      <td className="border border-slate-800 p-2">
                        {rec.violationName}
                      </td>
                      <td className="border border-slate-800 p-2">
                        {rec.actionTaken}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex justify-between mt-10 px-8 text-sm">
              <div className="text-center">
                <p className="font-bold mb-2">وكيل شؤون الطلاب</p>
                <p className="mb-6">{currentUser?.name || '........................'}</p>
                <p>التوقيع: .............................</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-2">قائد المدرسة</p>
                <p className="mb-6">.................................</p>
                <p>التوقيع: .............................</p>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-500 border-t pt-3">
              نموذج تقرير يومي للمخالفات السلوكية - {SCHOOL_NAME}
            </div>
          </div>
        )}

        {/* Monthly Report Template */}
        {printMode === 'monthly' && (
          <div className="print-border p-6 text-right space-y-6" dir="rtl">
            <OfficialHeader />

            <h1 className="text-2xl font-bold text-center mb-2">
              التقرير الشهري للمخالفات السلوكية
            </h1>
            <p className="text-center text-lg mb-4">
              الفترة: <strong>{formatMonthLabel(monthlyMonth)}</strong>
            </p>

            {/* ملخص رقمي للشهر */}
            {(() => {
              const totalMonthly = monthlyRecords.length;
              let severeMonthly = 0;
              const classMap: Record<string, { grade: string; className: string; total: number; severe: number }> = {};
              const studentMap: Record<string, { name: string; grade: string; count: number }> = {};

              monthlyRecords.forEach(r => {
                const isSevere = r.violationDegree.includes('الرابعة') || r.violationDegree.includes('الخامسة');
                if (isSevere) severeMonthly++;

                const key = `${r.grade}-${r.className}`;
                if (!classMap[key]) {
                  classMap[key] = { grade: r.grade, className: r.className, total: 0, severe: 0 };
                }
                classMap[key].total++;
                if (isSevere) classMap[key].severe++;

                if (!studentMap[r.studentId]) {
                  studentMap[r.studentId] = {
                    name: r.studentName,
                    grade: `${r.grade} - ${r.className}`,
                    count: 0
                  };
                }
                studentMap[r.studentId].count++;
              });

              const classRows = Object.values(classMap).sort((a, b) => b.total - a.total);
              const topStudents = Object.values(studentMap).sort((a, b) => b.count - a.count).slice(0, 10);
              const severeRatioMonthly = totalMonthly ? ((severeMonthly / totalMonthly) * 100).toFixed(1) : '0.0';

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="border border-slate-300 rounded-lg p-3">
                      <p className="font-bold text-slate-700 mb-1">
                        إجمالي المخالفات في الشهر
                      </p>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {totalMonthly}
                      </p>
                    </div>
                    <div className="border border-slate-300 rounded-lg p-3">
                      <p className="font-bold text-slate-700 mb-1">
                        عدد المخالفات الشديدة (درجة رابعة وخامسة)
                      </p>
                      <p className="text-2xl font-extrabold text-red-700">
                        {severeMonthly}
                        <span className="text-sm text-slate-600 ml-2">
                          ({severeRatioMonthly}% من إجمالي الشهر)
                        </span>
                      </p>
                    </div>
                    <div className="border border-slate-300 rounded-lg p-3">
                      <p className="font-bold text-slate-700 mb-1">
                        عدد الفصول التي يوجد بها مخالفات
                      </p>
                      <p className="text-2xl font-extrabold text-emerald-700">
                        {classRows.length}
                      </p>
                    </div>
                  </div>

                  {/* جدول الفصول */}
                  <h2 className="text-lg font-bold mt-4 mb-2">
                    أولاً: توزيع المخالفات على مستوى الفصول
                  </h2>
                  <table className="w-full text-right text-sm mb-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2">م</th>
                        <th className="p-2">الصف / الفصل</th>
                        <th className="p-2">عدد المخالفات</th>
                        <th className="p-2">المخالفات الشديدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-slate-500">
                            لا يوجد سجلات مخالفة خلال هذا الشهر.
                          </td>
                        </tr>
                      ) : (
                        classRows.map((c, idx) => (
                          <tr key={idx} className="avoid-break">
                            <td className="p-2 text-slate-600">{idx + 1}</td>
                            <td className="p-2 font-bold">
                              {c.grade} - {c.className}
                            </td>
                            <td className="p-2">{c.total}</td>
                            <td className="p-2">
                              {c.severe}
                              {c.severe > 0 && (
                                <span className="text-xs text-red-700 mr-2">
                                  ({((c.severe / c.total) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* جدول أعلى الطلاب */}
                  <h2 className="text-lg font-bold mt-6 mb-2">
                    ثانياً: أعلى ١٠ طلاب من حيث تكرار المخالفات خلال الشهر
                  </h2>
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2">م</th>
                        <th className="p-2">الطالب</th>
                        <th className="p-2">الصف / الفصل</th>
                        <th className="p-2">عدد المخالفات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-slate-500">
                            لا يوجد طلاب مكررين خلال هذا الشهر.
                          </td>
                        </tr>
                      ) : (
                        topStudents.map((st, idx) => (
                          <tr key={idx} className="avoid-break">
                            <td className="p-2 text-slate-600">{idx + 1}</td>
                            <td className="p-2 font-bold">{st.name}</td>
                            <td className="p-2">{st.grade}</td>
                            <td className="p-2">{st.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              );
            })()}

            <div className="flex justify-between mt-10 px-8 text-sm">
              <div className="text-center">
                <p className="font-bold mb-2">وكيل شؤون الطلاب</p>
                <p className="mb-6">{currentUser?.name || '........................'}</p>
                <p>التوقيع: .............................</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-2">قائد المدرسة</p>
                <p className="mb-6">.................................</p>
                <p>التوقيع: .............................</p>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-500 border-t pt-3">
              التقرير الشهري للمخالفات السلوكية - {SCHOOL_NAME}
            </div>
          </div>
        )}
      </div>

      {/* --- التطبيق الرئيسي (لا يُطبع) --- */}
      <div className="space-y-6 animate-fade-in pb-12 no-print">
        {/* Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-xl text-red-600">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                وكيل شؤون الطلاب
              </h1>
              <p className="text-xs text-slate-500">
                إدارة السلوك والانضباط
              </p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
            <button
              onClick={() => { resetForm(); setActiveView('add'); }}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-300 transition-all text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-200">
                  <Plus size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  رصد مخالفة
                </h3>
                <p className="text-slate-500 text-xs">
                  تسجيل واقعة سلوكية جديدة.
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('log')}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                  <FileWarning size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  سجل المخالفات
                </h3>
                <p className="text-slate-500 text-xs">
                  استعراض السجل التاريخي.
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('daily')}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                  <Printer size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  التقرير اليومي
                </h3>
                <p className="text-slate-500 text-xs">
                  طباعة ومراجعة مخالفات اليوم.
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('analytics')}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all text-right relative overflow-hidden md:col-span-2"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
                  <BarChart2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  الإحصائيات والتحليل المتقدم
                </h3>
                <p className="text-slate-500 text-xs">
                  تحليل الفصول، الطلاب الأكثر تكراراً، ومؤشرات الانضباط.
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('inbox')}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200">
                  <Inbox size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  البريد الإداري
                </h3>
                <p className="text-slate-500 text-xs">
                  {adminInsights.filter(i => !i.isRead).length > 0
                    ? 'رسائل جديدة متوفرة'
                    : 'استعراض التوجيهات'}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* View 1: ADD (New & Edit) */}
        {activeView === 'add' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {isEditing ? <Edit size={20}/> : <Plus size={20}/>} 
                  {isEditing ? 'تعديل مخالفة' : 'تسجيل مخالفة جديدة'}
                </h2>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <Briefcase size={24} className="text-red-400"/>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {isEditing ? (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                  <div className="bg-white p-3 rounded-full text-blue-600 shadow-sm border border-blue-100">
                    <User size={32} />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">
                      الطالب المخالف (بيانات ثابتة)
                    </p>
                    <h3 className="text-xl font-bold text-slate-800">
                      {students.find(s => s.id === selectedStudentId)?.name || '...'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {formGrade} - {formClass}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      1. الصف
                    </label>
                    <select
                      value={formGrade}
                      onChange={e => {
                        setFormGrade(e.target.value);
                        setFormClass('');
                        setSelectedStudentId('');
                      }}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="">اختر...</option>
                      {GRADES.map(g => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      2. الفصل
                    </label>
                    <select
                      value={formClass}
                      disabled={!formGrade}
                      onChange={e => {
                        setFormClass(e.target.value);
                        setSelectedStudentId('');
                      }}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
                    >
                      <option value="">اختر...</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      3. الطالب
                    </label>
                    <select
                      required
                      disabled={!formClass}
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
                    >
                      <option value="">-- اختر الطالب --</option>
                      {availableStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500"/>
                  درجة المخالفة
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {BEHAVIOR_VIOLATIONS.map(v => (
                    <button
                      key={v.degree}
                      type="button"
                      onClick={() => {
                        setSelectedDegree(v.degree);
                        setSelectedViolation('');
                        setActionTaken('');
                      }}
                      className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center text-center
                        ${
                          selectedDegree === v.degree
                            ? 'border-blue-900 bg-blue-900 text-white shadow-md'
                            : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                    >
                      {v.degree}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    نوع المخالفة
                  </label>
                  <select
                    required
                    value={selectedViolation}
                    onChange={e => setSelectedViolation(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 font-bold text-sm"
                  >
                    <option value="">-- حدد المخالفة من القائمة --</option>
                    {BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree)?.violations.map(vio => (
                      <option key={vio} value={vio}>
                        {vio}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    الإجراء المتخذ
                  </label>
                  <select
                    required
                    value={actionTaken}
                    onChange={e => setActionTaken(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 font-bold text-sm"
                  >
                    <option value="">-- حدد الإجراء --</option>
                    {BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree)?.actions.map(act => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2">
                  {showCommitmentPrint && selectedStudentId && (
                    <button
                      type="button"
                      onClick={handlePrintCommitment}
                      className="flex-1 bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl border border-amber-200 hover:bg-amber-100 font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer size={16} /> طباعة التعهد
                    </button>
                  )}
                  {showSummonsPrint && selectedStudentId && (
                    <button
                      type="button"
                      onClick={handlePrintSummons}
                      className="flex-1 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl border border-orange-200 hover:bg-orange-100 font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer size={16} /> طباعة الاستدعاء
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    ملاحظات إضافية
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 text-sm min-h-[80px]"
                    placeholder="اختياري..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveView('menu');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  {isEditing ? 'حفظ التعديلات' : 'حفظ المخالفة'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View 2: LOG */}
        {activeView === 'log' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="بحث باسم الطالب أو نوع المخالفة..."
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRecords.map(rec => {
                const isSevere = rec.violationDegree.includes('الخامسة') || rec.violationDegree.includes('الرابعة');
                const hasCommitment = rec.actionTaken.includes('تعهد');
                const hasSummons = rec.actionTaken.includes('استدعاء');

                return (
                  <div
                    key={rec.id}
                    className="group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 right-0 w-1.5 h-full ${
                        isSevere ? 'bg-red-600' : 'bg-amber-400'
                      }`}
                    ></div>
                    <div className="flex flex-col gap-4 pl-4 pr-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg text-slate-900">
                              {rec.studentName}
                            </h3>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                              <School size={10} /> {rec.grade} - {rec.className}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                            <Calendar size={10}/> {rec.date}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            isSevere
                              ? 'bg-red-50 text-red-700 border-red-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          {rec.violationDegree}
                        </span>
                      </div>

                      <div>
                        <p
                          className={`font-bold text-sm flex items-start gap-2 ${
                            isSevere ? 'text-red-700' : 'text-slate-800'
                          }`}
                        >
                          <AlertTriangle
                            size={16}
                            className="mt-0.5 shrink-0"
                          />
                          {rec.violationName}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-sm">
                        <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                          الإجراء المتخذ
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {rec.actionTaken}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50">
                      {hasCommitment && (
                        <button
                          onClick={() => handlePrintFromLog(rec, 'commitment')}
                          className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 border border-amber-200 flex items-center gap-1"
                        >
                          <Printer size={14}/> تعهد
                        </button>
                      )}
                      {hasSummons && (
                        <button
                          onClick={() => handlePrintFromLog(rec, 'summons')}
                          className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 border border-orange-200 flex items-center gap-1"
                        >
                          <Printer size={14}/> استدعاء
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(rec)}
                        className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit size={18}/>
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Daily View */}
        {activeView === 'daily' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Printer className="text-emerald-600"/>
                    التقرير اليومي
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    استعراض وطباعة المخالفات لهذا اليوم
                  </p>
                </div>
                <button
                  onClick={handlePrintDaily}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <Printer size={18}/> طباعة
                </button>
              </div>

              <div className="flex justify-center mb-8">
                <div className="relative">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
                  />
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700">
                    إجمالي مخالفات اليوم
                  </span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold">
                    {dailyRecords.length}
                  </span>
                </div>

                <table className="w-full text-right text-sm">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-4">الطالب</th>
                      <th className="p-4">الصف</th>
                      <th className="p-4">المخالفة</th>
                      <th className="p-4">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          سجل نظيف لهذا اليوم
                        </td>
                      </tr>
                    ) : (
                      dailyRecords.map((rec, idx) => (
                        <tr key={idx}>
                          <td className="p-4 font-bold">{rec.studentName}</td>
                          <td className="p-4">
                            {rec.grade} - {rec.className}
                          </td>
                          <td className="p-4 text-red-600">
                            {rec.violationName}
                          </td>
                          <td className="p-4 text-slate-600">
                            {rec.actionTaken}
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

        {/* Inbox View */}
        {activeView === 'inbox' && (
          <div className="space-y-6 animate-fade-in">
            {adminInsights.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <Inbox size={48} className="mx-auto mb-4 opacity-50"/>
                <p>لا توجد رسائل جديدة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminInsights.map(insight => (
                  <div
                    key={insight.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                      <span className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                        <Sparkles size={16}/>
                        تحليل ذكي
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(insight.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-line font-medium text-sm">
                      {insight.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics View – مطورة + تقرير شهري */}
        {activeView === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                <Activity size={24}/>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  لوحة التحليل السلوكي
                </h2>
                <p className="text-slate-500 text-sm">
                  مؤشرات عملية لمتابعة الانضباط على مستوى المدرسة والفصول والطلاب.
                </p>
              </div>
            </div>

            {/* اختيار شهر + زر طباعة تقرير شهري */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">
                  شهر التقرير:
                </label>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={e => setMonthlyMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                />
                <span className="text-xs text-slate-500">
                  عدد مخالفات الشهر المختار:{" "}
                  <span className="font-bold text-red-600">
                    {monthlyRecords.length}
                  </span>
                </span>
              </div>
              <button
                onClick={handlePrintMonthly}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md"
              >
                <Printer size={16}/>
                طباعة التقرير الشهري
              </button>
            </div>

            {/* مؤشرات عليا */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase">
                  إجمالي المخالفات
                </p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">
                  {analyticsData.total}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  مجموع جميع المخالفات المسجلة خلال الفترة الحالية.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase">
                  الطلاب المكررين (Top 5)
                </p>
                <p className="text-3xl font-extrabold text-purple-600 mt-1">
                  {analyticsData.topOffenders.length}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  قائمة مركزة للمتابعة الإرشادية الفردية.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase">
                  الفصول التي لديها مخالفات
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                  {analyticsData.classStats.length}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  عدد الفصول التي تم رصد مخالفة واحدة على الأقل بها.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase">
                  المخالفات الشديدة
                </p>
                <p className="text-3xl font-extrabold text-red-700 mt-1">
                  {analyticsData.severeCount}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  نسبة الشديدة:{" "}
                  {analyticsData.severeRatio.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* اتجاه ٧ أيام + توزيع الدرجات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    اتجاه المخالفات خلال آخر ٧ أيام
                  </h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.trendData}>
                      <defs>
                        <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#f97316"
                        fillOpacity={1}
                        fill="url(#trendColor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    توزيع المخالفات حسب درجة المخالفة
                  </h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.degreeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value">
                        {analyticsData.degreeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEGREE_COLORS[index % DEGREE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* الفصول الأعلى + أكثر أنواع المخالفات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    أعلى الفصول من حيث عدد المخالفات
                  </h3>
                  {analyticsData.classStats[0] && (
                    <span className="text-xs text-slate-500">
                      الأعلى: {analyticsData.classStats[0].grade} - {analyticsData.classStats[0].className}
                    </span>
                  )}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.classStats.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="className" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    أكثر أنواع المخالفات تكراراً
                  </h3>
                  {analyticsData.typeData[0] && (
                    <span className="text-xs text-slate-500">
                      الأعلى: {analyticsData.typeData[0].name}
                    </span>
                  )}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.typeData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {analyticsData.typeData.map((entry, index) => (
                          <Cell key={`cell-type-${index}`} fill={DEGREE_COLORS[index % DEGREE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top 5 طلاب مكررين */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  قائمة المتابعة: أعلى ٥ طلاب من حيث تكرار المخالفات
                </h3>
                <span className="text-xs text-slate-400">
                  أداة عملية لتوجيه برامج الإرشاد الفردي.
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">الطالب</th>
                      <th className="py-2 px-3">الصف / الفصل</th>
                      <th className="py-2 px-3">عدد المخالفات</th>
                      <th className="py-2 px-3">مؤشر الخطورة (تقديري)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topOffenders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          لا يوجد بيانات كافية لعرض الطلاب المكررين.
                        </td>
                      </tr>
                    ) : (
                      analyticsData.topOffenders.map((st, idx) => (
                        <tr key={st.id} className="border-b border-slate-50">
                          <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{st.name}</td>
                          <td className="py-2 px-3 text-slate-600">{st.grade}</td>
                          <td className="py-2 px-3 text-slate-800">{st.count}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold
                              ${st.score >= 20 ? 'bg-red-100 text-red-700' 
                              : st.score >= 10 ? 'bg-amber-100 text-amber-700' 
                              : 'bg-emerald-100 text-emerald-700'}`}
                            >
                              {st.score}
                            </span>
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
      </div>
    </>
  );
};

export default StaffDeputy;
