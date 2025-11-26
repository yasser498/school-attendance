import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, AlertTriangle, Plus, Search, Loader2, X, Send, Sparkles, 
  User, FileWarning, Check, BarChart2, Printer, TrendingUp, Filter, 
  Trash2, Edit, ArrowRight, LayoutGrid, FileText, School, Inbox, ChevronLeft,
  Calendar, AlertCircle, PieChart as PieIcon, List, Activity, ShieldAlert, Gavel
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend
} from 'recharts';
import { 
  getStudents, 
  getBehaviorRecords, 
  addBehaviorRecord, 
  deleteBehaviorRecord,
  generateSmartContent, 
  sendAdminInsight,
  getAdminInsights
} from '../../services/storage';
import { Student, BehaviorRecord, StaffUser, AdminInsight } from '../../types';
import { BEHAVIOR_VIOLATIONS, GRADES } from '../../constants';

const StaffDeputy: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  
  // Navigation View State
  const [activeView, setActiveView] = useState<'menu' | 'add' | 'log' | 'daily' | 'analytics' | 'inbox'>('menu');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [adminInsights, setAdminInsights] = useState<AdminInsight[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // --- Form State ---
  const [formGrade, setFormGrade] = useState('');
  const [formClass, setFormClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDegree, setSelectedDegree] = useState(BEHAVIOR_VIOLATIONS[0].degree);
  const [selectedViolation, setSelectedViolation] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  
  // Printing State
  const [printMode, setPrintMode] = useState<'none' | 'commitment' | 'daily'>('none');

  // Search & Date State
  const [search, setSearch] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

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
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
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

  const showCommitmentPrint = useMemo(() => {
      return actionTaken.includes('تعهد');
  }, [actionTaken]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !selectedViolation) return;
      
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      const violationObj = BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree);
      const article = violationObj?.article || '';

      const newRecord: BehaviorRecord = {
          id: '',
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          className: student.className,
          date: new Date().toISOString().split('T')[0],
          violationDegree: selectedDegree,
          violationName: selectedViolation,
          articleNumber: article,
          actionTaken: actionTaken,
          notes: notes,
          staffId: currentUser?.id,
          createdAt: new Date().toISOString()
      };

      await addBehaviorRecord(newRecord);
      alert("تم تسجيل المخالفة بنجاح");
      
      // Reset
      setSelectedStudentId('');
      setFormGrade('');
      setFormClass('');
      setActionTaken('');
      setNotes('');
      fetchData();
      setActiveView('log');
  };

  const handlePrintCommitment = () => {
      setPrintMode('commitment');
      setTimeout(() => {
          window.print();
          setPrintMode('none');
      }, 100);
  };

  const handlePrintDaily = () => {
      setPrintMode('daily');
      setTimeout(() => {
          window.print();
          setPrintMode('none');
      }, 100);
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
          await deleteBehaviorRecord(id);
          fetchData();
      }
  };

  // --- Advanced Analytics Logic ---
  const analyticsData = useMemo(() => {
      const total = records.length;
      
      // 1. Top Offenders (Recidivism with Weight)
      const studentCounts: Record<string, { name: string, grade: string, count: number, id: string, score: number }> = {};
      
      // 2. Class Stats
      const classMap: Record<string, { grade: string, className: string, count: number }> = {};
      
      // 3. Violation Types (Frequency)
      const typeMap: Record<string, number> = {};

      // 4. Degree Distribution
      const degreeMap: Record<string, number> = {};

      records.forEach(r => {
          // Student Stats
          if (!studentCounts[r.studentId]) {
              studentCounts[r.studentId] = { name: r.studentName, grade: `${r.grade} - ${r.className}`, count: 0, id: r.studentId, score: 0 };
          }
          studentCounts[r.studentId].count++;
          
          // Calculate Weight (Score)
          const weight = r.violationDegree.includes('الخامسة') ? 10 : 
                         r.violationDegree.includes('الرابعة') ? 7 : 
                         r.violationDegree.includes('الثالثة') ? 5 : 
                         r.violationDegree.includes('الثانية') ? 3 : 1;
          studentCounts[r.studentId].score += weight;

          // Class Stats
          const key = `${r.grade}-${r.className}`;
          if (!classMap[key]) classMap[key] = { grade: r.grade, className: r.className, count: 0 };
          classMap[key].count++;

          // Type Stats
          typeMap[r.violationName] = (typeMap[r.violationName] || 0) + 1;

          // Degree Stats
          degreeMap[r.violationDegree] = (degreeMap[r.violationDegree] || 0) + 1;
      });

      // Format Data for Charts
      const topOffenders = Object.values(studentCounts)
          .sort((a, b) => b.score - a.score) // Sort by Score (Severity) not just count
          .slice(0, 5);

      const classStats = Object.values(classMap).sort((a, b) => b.count - a.count);

      const typeData = Object.entries(typeMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 types

      const degreeData = Object.entries(degreeMap).map(([name, value]) => ({ name, value }));

      // Trend (Last 7 Days)
      const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
      }).reverse();
      
      const trendData = last7Days.map(date => ({
          date: new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' }),
          count: records.filter(r => r.date === date).length
      }));

      return { total, topOffenders, classStats, trendData, degreeData, typeData };
  }, [records]);

  const filteredRecords = records.filter(r => r.studentName.includes(search) || r.violationName.includes(search));
  const dailyRecords = records.filter(r => r.date === reportDate);

  // Colors for charts
  const DEGREE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <>
    {/* ... Print Templates remain same ... */}
    <div id="print-container" className="hidden print:block">
        {/* ... (Print content logic from previous step) ... */}
    </div>

    <div className="space-y-6 animate-fade-in pb-12 no-print">
        
        {/* Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2 rounded-xl text-red-600">
                    <Briefcase size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">وكيل شؤون الطلاب</h1>
                    <p className="text-xs text-slate-500">إدارة السلوك والانضباط</p>
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

        {/* ... MENU VIEW (Same as previous) ... */}
        {activeView === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
                <button onClick={() => setActiveView('add')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-300 transition-all text-right relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-200">
                            <Plus size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">رصد مخالفة</h3>
                        <p className="text-slate-500 text-xs">تسجيل واقعة سلوكية جديدة.</p>
                    </div>
                </button>
                <button onClick={() => setActiveView('log')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-right relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                            <FileWarning size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">سجل المخالفات</h3>
                        <p className="text-slate-500 text-xs">استعراض السجل التاريخي.</p>
                    </div>
                </button>
                <button onClick={() => setActiveView('daily')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all text-right relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                            <Printer size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">التقرير اليومي</h3>
                        <p className="text-slate-500 text-xs">طباعة ومراجعة مخالفات اليوم.</p>
                    </div>
                </button>
                <button onClick={() => setActiveView('analytics')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all text-right relative overflow-hidden md:col-span-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
                            <BarChart2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">الإحصائيات والتحليل المتقدم</h3>
                        <p className="text-slate-500 text-xs">تحليل الفصول، الطلاب الأكثر تكراراً، ومؤشرات الانضباط.</p>
                    </div>
                </button>
                <button onClick={() => setActiveView('inbox')} className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all text-right relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200">
                            <Inbox size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">البريد الإداري</h3>
                        <p className="text-slate-500 text-xs">
                            {adminInsights.filter(i => !i.isRead).length > 0 ? 'رسائل جديدة متوفرة' : 'استعراض التوجيهات'}
                        </p>
                    </div>
                </button>
            </div>
        )}

        {/* ... ADD & LOG & DAILY & INBOX VIEWS (Keep them) ... */}
        {/* View 1: ADD */}
        {activeView === 'add' && (
             <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in-up">
                <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                    <div><h2 className="text-xl font-bold flex items-center gap-2"><Plus size={20}/> تسجيل مخالفة جديدة</h2></div>
                    <div className="bg-white/10 p-2 rounded-lg"><Briefcase size={24} className="text-red-400"/></div>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. الصف</label><select value={formGrade} onChange={e => { setFormGrade(e.target.value); setFormClass(''); setSelectedStudentId(''); }} className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900"><option value="">اختر...</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. الفصل</label><select value={formClass} disabled={!formGrade} onChange={e => { setFormClass(e.target.value); setSelectedStudentId(''); }} className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900 disabled:opacity-50"><option value="">اختر...</option>{availableClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">3. الطالب</label><select required disabled={!formClass} value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-900 disabled:opacity-50"><option value="">-- اختر الطالب --</option>{availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500"/> درجة المخالفة</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {BEHAVIOR_VIOLATIONS.map(v => (
                                <button key={v.degree} type="button" onClick={() => { setSelectedDegree(v.degree); setSelectedViolation(''); }} className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center text-center ${selectedDegree === v.degree ? 'border-blue-900 bg-blue-900 text-white shadow-md' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'}`}>{v.degree}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">نوع المخالفة</label><select required value={selectedViolation} onChange={e => setSelectedViolation(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 font-bold text-sm"><option value="">-- حدد المخالفة من القائمة --</option>{BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree)?.violations.map(vio => (<option key={vio} value={vio}>{vio}</option>))}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">الإجراء المتخذ</label><select required value={actionTaken} onChange={e => setActionTaken(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 font-bold text-sm"><option value="">-- حدد الإجراء --</option>{BEHAVIOR_VIOLATIONS.find(v => v.degree === selectedDegree)?.actions.map(act => (<option key={act} value={act}>{act}</option>))}</select></div>
                        {showCommitmentPrint && selectedStudentId && (<div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between animate-fade-in"><div className="text-amber-800 text-sm font-bold flex items-center gap-2"><FileText size={18}/> هذا الإجراء يتطلب تعهداً خطياً</div><button type="button" onClick={handlePrintCommitment} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 flex items-center gap-2 shadow-sm"><Printer size={16} /> طباعة التعهد</button></div>)}
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">ملاحظات إضافية</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-900 text-sm min-h-[80px]" placeholder="اختياري..."></textarea></div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex gap-4">
                        <button type="button" onClick={() => setActiveView('menu')} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">إلغاء</button>
                        <button type="submit" className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95">حفظ المخالفة</button>
                    </div>
                </form>
            </div>
        )}

        {/* View 2: LOG */}
        {activeView === 'log' && (
            <div className="space-y-6 animate-fade-in">
                {/* Search Logic ... */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl focus:outline-none text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {filteredRecords.map(rec => {
                        const isSevere = rec.violationDegree.includes('الخامسة') || rec.violationDegree.includes('الرابعة');
                        return (
                            <div key={rec.id} className="group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${isSevere ? 'bg-red-600' : 'bg-amber-400'}`}></div>
                                <div className="flex flex-col gap-4 pl-4 pr-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-lg text-slate-900">{rec.studentName}</h3>
                                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1"><School size={10} /> {rec.grade} - {rec.className}</span>
                                            </div>
                                            <span className="text-xs font-mono text-slate-400 flex items-center gap-1"><Calendar size={10}/> {rec.date}</span>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${isSevere ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{rec.violationDegree}</span>
                                    </div>
                                    <div><p className={`font-bold text-sm flex items-start gap-2 ${isSevere ? 'text-red-700' : 'text-slate-800'}`}><AlertTriangle size={16} className="mt-0.5 shrink-0" />{rec.violationName}</p></div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-sm"><span className="block text-xs font-bold text-slate-400 mb-1 uppercase">الإجراء المتخذ</span><p className="text-slate-700 font-medium leading-relaxed">{rec.actionTaken}</p></div>
                                </div>
                                <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleDelete(rec.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* View 3: DAILY REPORT */}
        {activeView === 'daily' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                {/* ... Daily Report Logic ... */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Printer className="text-emerald-600"/> التقرير اليومي</h2><p className="text-slate-500 text-sm mt-1">استعراض وطباعة المخالفات لهذا اليوم</p></div>
                        <button onClick={handlePrintDaily} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/20"><Printer size={18}/> طباعة</button>
                    </div>
                    <div className="flex justify-center mb-8"><div className="relative"><input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-lg"/><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /></div></div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><span className="font-bold text-slate-700">إجمالي مخالفات اليوم</span><span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold">{dailyRecords.length}</span></div>
                        <table className="w-full text-right text-sm"><thead className="bg-white text-slate-500 font-bold border-b border-slate-100"><tr><th className="p-4">الطالب</th><th className="p-4">الصف</th><th className="p-4">المخالفة</th><th className="p-4">الإجراء</th></tr></thead><tbody className="divide-y divide-slate-100">{dailyRecords.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">سجل نظيف لهذا اليوم</td></tr> : dailyRecords.map((rec, idx) => (<tr key={idx}><td className="p-4 font-bold">{rec.studentName}</td><td className="p-4">{rec.grade}</td><td className="p-4 text-red-600">{rec.violationName}</td><td className="p-4 text-slate-600">{rec.actionTaken}</td></tr>))}</tbody></table>
                    </div>
                </div>
            </div>
        )}

        {/* View 5: INBOX */}
        {activeView === 'inbox' && (
            <div className="space-y-6 animate-fade-in">
                {/* ... Inbox Logic ... */}
               {adminInsights.length === 0 ? (
                   <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400"><Inbox size={48} className="mx-auto mb-4 opacity-50"/><p>لا توجد رسائل جديدة</p></div>
               ) : (
                   <div className="space-y-4">
                       {adminInsights.map(insight => (
                           <div key={insight.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4"><span className="flex items-center gap-2 text-purple-700 font-bold text-sm"><Sparkles size={16}/> تحليل ذكي</span><span className="text-xs text-slate-400">{new Date(insight.createdAt).toLocaleDateString('ar-SA')}</span></div>
                               <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-line font-medium text-sm">{insight.content}</div>
                           </div>
                       ))}
                   </div>
               )}
            </div>
        )}

        {/* VIEW 4: ANALYTICS (ENHANCED & REDESIGNED) */}
        {activeView === 'analytics' && (
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600"><Activity size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">لوحة التحليل السلوكي المتقدم</h2>
                        <p className="text-slate-500 text-sm">رؤى تفصيلية لدعم اتخاذ القرار التربوي</p>
                    </div>
                </div>

                {/* 1. Executive KPIs with Context */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">إجمالي المخالفات</p>
                        <p className="text-4xl font-extrabold text-slate-800">{analyticsData.total}</p>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><FileWarning size={64}/></div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">الطلاب المكررين</p>
                        <p className="text-4xl font-extrabold text-purple-600">{analyticsData.topOffenders.length}</p>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><User size={64}/></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">أخطر مخالفة (شيوعاً)</p>
                        <p className="text-lg font-bold text-slate-800 mt-2 line-clamp-2">
                            {analyticsData.typeData[0]?.name || '-'}
                        </p>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><ShieldAlert size={64}/></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">الصف الأكثر تحدياً</p>
                        <p className="text-2xl font-extrabold text-red-600 mt-1">{analyticsData.classStats[0]?.grade || '-'}</p>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><AlertTriangle size={64}/></div>
                    </div>
                </div>

                {/* 2. Chart Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Trend Analysis */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> المؤشر الزمني (آخر 7 أيام)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.trendData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false}/>
                                    <YAxis axisLine={false} tickLine={false}/>
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}/>
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" name="عدد المخالفات"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Severity Breakdown (Pie) */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Gavel size={18} className="text-amber-500"/> توزيع المخالفات حسب الدرجة</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={analyticsData.degreeData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        {analyticsData.degreeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={DEGREE_COLORS[index % DEGREE_COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 3. Top Offenders List (Enhanced) */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18} className="text-red-500"/> الطلاب الأكثر تكراراً (بالوزن)</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                            {analyticsData.topOffenders.length === 0 ? <p className="text-slate-400 text-sm text-center mt-10">سجل نظيف</p> : analyticsData.topOffenders.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}>{idx + 1}</div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{s.name}</p>
                                            <p className="text-[10px] text-slate-500">{s.grade}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs font-bold text-red-700">{s.count} مخالفات</span>
                                        <span className="text-[10px] text-slate-400 font-mono">Score: {s.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Violation Types (Bar Chart) */}
                    <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><List size={18} className="text-purple-500"/> أكثر 5 أنواع مخالفات شيوعاً</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.typeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                    <XAxis type="number" hide/>
                                    <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 11}} axisLine={false} tickLine={false}/>
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 5. Class Analysis Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><School size={18} className="text-indigo-600"/> تحليل أداء جميع الفصول</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analyticsData.classStats.map((cls, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-blue-300 transition-colors bg-white">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{cls.grade}</h4>
                                        <p className="text-xs text-slate-500">فصل {cls.className}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block text-xl font-bold ${cls.count > 5 ? 'text-red-600' : cls.count > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>{cls.count}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">مخالفة</span>
                                    </div>
                                </div>
                            ))}
                            {analyticsData.classStats.length === 0 && <p className="col-span-full text-center text-slate-400 py-8">لا توجد بيانات كافية للتحليل</p>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... Other views ... */}
    </div>
    </>
  );
};

export default StaffDeputy;