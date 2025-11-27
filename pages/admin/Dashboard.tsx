
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { FileText, Clock, CheckCircle, Sparkles, Calendar, AlertTriangle, Loader2, BrainCircuit, Search, Settings, Printer, BarChart2, ListFilter, Users, Settings2, Trash2, Wifi, BellRing, Phone, ShieldAlert, Send, Megaphone, Activity, UserMinus, BookOpen, MessageSquare, ArrowRight, LayoutGrid, Save, School, FileSpreadsheet, X, Database, RefreshCw } from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getRequests, getStudents, getConsecutiveAbsences, resolveAbsenceAlert, getBehaviorRecords, sendAdminInsight, testSupabaseConnection, getAttendanceRecords, getPendingRequestsCountForStaff, generateSmartContent, clearAttendance, clearRequests, clearStudents, clearBehaviorRecords, clearAdminInsights, clearReferrals } from '../../services/storage';
import { RequestStatus, ExcuseRequest, Student, BehaviorRecord, AttendanceRecord, AttendanceStatus } from '../../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation State
  const [activeView, setActiveView] = useState<'menu' | 'overview' | 'behavior' | 'directives' | 'settings'>('menu');

  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // School Identity
  const [schoolName, setSchoolName] = useState(localStorage.getItem('school_name') || 'متوسطة عماد الدين زنكي');
  const [schoolLogo, setSchoolLogo] = useState(localStorage.getItem('school_logo') || 'https://www.raed.net/img?id=1471924');
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);
  const [tempSchoolLogo, setTempSchoolLogo] = useState(schoolLogo);

  // Early Warning System
  const [alerts, setAlerts] = useState<{ studentId: string, studentName: string, days: number, lastDate: string }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  // AI & Insights
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<string | null>(null);
  
  // Smart Directives Form
  const [directiveContent, setDirectiveContent] = useState('');
  const [directiveTarget, setDirectiveTarget] = useState<'deputy' | 'counselor'>('deputy');
  const [sendingDirective, setSendingDirective] = useState(false);

  // API Key
  const [apiKey, setApiKey] = useState(localStorage.getItem('ozr_ai_config') ? JSON.parse(localStorage.getItem('ozr_ai_config')!).apiKey : '');
  const [testingConnection, setTestingConnection] = useState(false);

  // DELETION & RESET STATE
  const [deleteTarget, setDeleteTarget] = useState<'requests' | 'attendance' | 'students' | 'all' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [reqs, studs, behaviors, atts] = await Promise.all([
            getRequests(), 
            getStudents(), 
            getBehaviorRecords(),
            getAttendanceRecords()
        ]);
        setRequests(reqs);
        setStudents(studs);
        setBehaviorRecords(behaviors);
        setAttendanceRecords(atts);
        
        setLoadingAlerts(true);
        getConsecutiveAbsences().then(setAlerts).finally(() => setLoadingAlerts(false));

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolveAlert = async (studentId: string, action: string) => {
    setAlerts(prev => prev.filter(a => a.studentId !== studentId));
    await resolveAbsenceAlert(studentId, action);
  };

  const handleSendDirective = async () => {
      if (!directiveContent.trim()) return;
      setSendingDirective(true);
      try {
          await sendAdminInsight(directiveTarget, directiveContent);
          setDirectiveContent('');
          alert("تم إرسال التوجيه بنجاح!");
      } catch (error) {
          alert("فشل الإرسال");
      } finally {
          setSendingDirective(false);
      }
  };

  const saveSchoolSettings = () => {
      localStorage.setItem('school_name', tempSchoolName);
      localStorage.setItem('school_logo', tempSchoolLogo);
      setSchoolName(tempSchoolName);
      setSchoolLogo(tempSchoolLogo);
      alert("تم حفظ إعدادات المدرسة بنجاح");
  };

  const saveAIConfig = () => {
    const config = { provider: 'google', apiKey: apiKey, model: 'gemini-2.5-flash' };
    localStorage.setItem('ozr_ai_config', JSON.stringify(config));
    alert("تم حفظ إعدادات الذكاء الاصطناعي.");
  };

  const runConnectionTest = async () => {
    setTestingConnection(true);
    const result = await testSupabaseConnection();
    alert(result.message);
    setTestingConnection(false);
  };

  const analyzeBehaviorLog = async () => {
      setIsGenerating(true);
      try {
          const prompt = `
            حلل سجل المخالفات التالي:
            عدد المخالفات: ${behaviorRecords.length}
            أهم المخالفات: ${behaviorRecords.slice(0, 5).map(b => b.violationName).join(', ')}
            
            ما هي المشكلة السلوكية الأبرز؟ وما التوصية المناسبة؟
          `;
          const res = await generateSmartContent(prompt);
          setBehaviorAnalysis(res);
      } catch (e) { alert("فشل التحليل"); }
      finally { setIsGenerating(false); }
  };

  // --- Deletion Logic ---
  const executeDelete = async () => {
      if (!deleteTarget) return;
      setIsDeleting(true);
      try {
          if (deleteTarget === 'requests') {
              await clearRequests();
              alert("تم حذف جميع طلبات الأعذار.");
          } else if (deleteTarget === 'attendance') {
              await clearAttendance();
              alert("تم حذف سجلات الحضور والغياب.");
          } else if (deleteTarget === 'students') {
              await clearStudents();
              alert("تم حذف جميع بيانات الطلاب.");
          } else if (deleteTarget === 'all') {
              // Full Reset
              await Promise.all([
                  clearStudents(),
                  clearRequests(),
                  clearAttendance(),
                  clearBehaviorRecords(),
                  clearAdminInsights(),
                  clearReferrals()
              ]);
              alert("تمت تهيئة النظام للعام الجديد بنجاح. تم حذف جميع البيانات.");
          }
          window.location.reload(); // Reload to reflect changes
      } catch (e: any) {
          alert("حدث خطأ أثناء الحذف: " + e.message);
      } finally {
          setIsDeleting(false);
          setDeleteTarget(null);
      }
  };

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === RequestStatus.PENDING).length;
    const approved = requests.filter(r => r.status === RequestStatus.APPROVED).length;
    const rejected = requests.filter(r => r.status === RequestStatus.REJECTED).length;
    return { total, pending, approved, rejected, studentsCount: students.length };
  }, [requests, students]);

  const behaviorStats = useMemo(() => {
      return { total: behaviorRecords.length, today: behaviorRecords.filter(b => b.date === new Date().toISOString().split('T')[0]).length };
  }, [behaviorRecords]);

  // Menu Items with Badges
  const gridItems = [
      { id: 'overview', title: 'نظرة عامة', desc: 'لوحة القيادة والإنذار المبكر.', icon: Activity, color: 'bg-blue-600', path: null }, // Internal View
      { id: 'requests', title: 'إدارة الأعذار', desc: 'مراجعة الطلبات وقبولها.', icon: FileText, color: 'bg-amber-500', path: '/admin/requests', badge: stats.pending },
      { id: 'reports', title: 'سجل الغياب', desc: 'التقرير اليومي والحضور.', icon: FileSpreadsheet, color: 'bg-emerald-600', path: '/admin/attendance-reports' },
      { id: 'stats', title: 'التحليل والإحصائيات', desc: 'أداء الفصول والمخاطر.', icon: BarChart2, color: 'bg-indigo-600', path: '/admin/attendance-stats' },
      { id: 'behavior', title: 'مراقبة السلوك', desc: 'سجل المخالفات الكامل.', icon: ShieldAlert, color: 'bg-red-600', path: null }, // Internal View
      { id: 'directives', title: 'التوجيه الذكي', desc: 'إرسال تعليمات للموظفين.', icon: BrainCircuit, color: 'bg-purple-600', path: null }, // Internal View
      { id: 'students', title: 'بيانات الطلاب', desc: 'إدارة القائمة والبيانات.', icon: Search, color: 'bg-slate-600', path: '/admin/students' },
      { id: 'users', title: 'إدارة المستخدمين', desc: 'المعلمين والصلاحيات.', icon: Users, color: 'bg-slate-800', path: '/admin/users' },
      { id: 'settings', title: 'الإعدادات', desc: 'هوية المدرسة والربط.', icon: Settings2, color: 'bg-gray-500', path: null }, // Internal View
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      
      {/* VIEW 0: MENU (Command Center) */}
      {activeView === 'menu' && (
          <div className="space-y-8">
              {/* Hero Header */}
              <div className="bg-white p-8 rounded-3xl shadow-lg shadow-blue-900/5 border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-blue-50 to-transparent"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        مركز القيادة <span className="text-blue-900">المدرسية</span>
                        </h1>
                        <p className="text-slate-500">
                        {schoolName} - لوحة التحكم المركزية
                        </p>
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">اليوم</p>
                        <p className="text-lg font-bold text-slate-800">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                </div>
              </div>

              {/* Stats Ticker */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={20}/></div>
                      <div><p className="text-2xl font-bold text-slate-800">{stats.total}</p><p className="text-xs text-slate-400">عذر</p></div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ShieldAlert size={20}/></div>
                      <div><p className="text-2xl font-bold text-slate-800">{behaviorStats.total}</p><p className="text-xs text-slate-400">مخالفة</p></div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
                      <div><p className="text-2xl font-bold text-slate-800">{stats.pending}</p><p className="text-xs text-slate-400">انتظار</p></div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={20}/></div>
                      <div><p className="text-2xl font-bold text-slate-800">{stats.studentsCount}</p><p className="text-xs text-slate-400">طالب</p></div>
                  </div>
              </div>

              {/* Grid Menu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {gridItems.map(item => (
                      <button
                        key={item.id}
                        onClick={(e) => {
                            e.preventDefault();
                            if (item.path) {
                                navigate(item.path); // Route to external page
                            } else {
                                setActiveView(item.id as any); // Switch internal view
                            }
                        }}
                        className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-right flex flex-col relative overflow-hidden h-full w-full items-start"
                      >
                          <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full transition-transform group-hover:scale-110 ${item.color}`}></div>
                          <div className="flex justify-between items-start mb-4 w-full">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md ${item.color} transition-transform group-hover:-translate-y-1`}>
                                  <item.icon size={28} />
                              </div>
                              {item.badge ? (
                                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                                      {item.badge} جديد
                                  </span>
                              ) : null}
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-900 transition-colors">
                              {item.title}
                          </h3>
                          <p className="text-slate-500 text-sm leading-relaxed">
                              {item.desc}
                          </p>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* COMMON HEADER FOR SUB-PAGES */}
      {activeView !== 'menu' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl text-white ${gridItems.find(m => m.id === activeView)?.color || 'bg-slate-600'}`}>
                       {React.createElement(gridItems.find(m => m.id === activeView)?.icon || LayoutGrid, { size: 20 })}
                   </div>
                   <h2 className="text-xl font-bold text-slate-800">
                       {gridItems.find(m => m.id === activeView)?.title}
                   </h2>
               </div>
               <button 
                 onClick={() => setActiveView('menu')}
                 className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-900 bg-slate-50 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
               >
                   <LayoutGrid size={16} />
                   القائمة الرئيسية
               </button>
           </div>
      )}

      {/* VIEW 1: OVERVIEW (Internal) */}
      {activeView === 'overview' && (
          <div className="space-y-6 animate-fade-in">
              {/* Early Warning Section */}
              {alerts.length > 0 ? (
                  <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
                          <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                              <BellRing className="animate-pulse" /> الإنذار المبكر (غياب متصل)
                          </h2>
                          <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-xs font-bold">{alerts.length} طلاب</span>
                      </div>
                      
                      {showDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                            {alerts.map((alert, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{alert.studentName}</h3>
                                            <p className="text-xs text-slate-500 mt-1">آخر غياب: {alert.lastDate}</p>
                                        </div>
                                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg">{alert.days} أيام</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button onClick={() => handleResolveAlert(alert.studentId, 'counselor')} className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 border border-amber-200"><ShieldAlert size={14} /> تحويل للمرشد</button>
                                        <button onClick={() => handleResolveAlert(alert.studentId, 'call')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 border border-blue-200"><Phone size={14} /> تم الاتصال</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                      )}
                  </div>
              ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-4 shadow-sm">
                      <div className="bg-white p-3 rounded-full text-emerald-500 shadow-sm"><CheckCircle size={24}/></div>
                      <div><h3 className="font-bold text-emerald-800">سجل الإنذار نظيف</h3><p className="text-emerald-600 text-xs mt-1">لا توجد حالات غياب متصل (يومين أو أكثر) تحتاج لتدخل اليوم.</p></div>
                  </div>
              )}
          </div>
      )}

      {/* VIEW 2: BEHAVIOR MONITOR (Professional Cards) */}
      {activeView === 'behavior' && (
          <div className="animate-fade-in space-y-6">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                      <ShieldAlert /> سجل المخالفات الكامل
                  </div>
                  <button onClick={analyzeBehaviorLog} disabled={isGenerating} className="bg-white border border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-50">
                      {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} تحليل ذكي
                  </button>
              </div>

              {behaviorAnalysis && (
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 relative">
                      <button onClick={() => setBehaviorAnalysis(null)} className="absolute top-2 left-2 text-purple-400"><X size={16} className="sr-only"/></button>
                      <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><BrainCircuit size={16}/> تحليل السلوك</h4>
                      <p className="text-sm text-purple-700 whitespace-pre-line">{behaviorAnalysis}</p>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                  {behaviorRecords.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">لا توجد مخالفات مسجلة</div>
                  ) : behaviorRecords.map(rec => {
                      const isSevere = rec.violationDegree.includes('الخامسة') || rec.violationDegree.includes('الرابعة');
                      return (
                          <div key={rec.id} className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                              <div className={`absolute top-0 right-0 w-1.5 h-full ${isSevere ? 'bg-red-600' : 'bg-amber-400'}`}></div>
                              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pl-4">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                          <h3 className="font-bold text-lg text-slate-900">{rec.studentName}</h3>
                                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                                              <School size={12}/> {rec.grade} - {rec.className}
                                          </span>
                                      </div>
                                      <p className={`font-bold text-sm flex items-center gap-2 ${isSevere ? 'text-red-700' : 'text-slate-800'}`}>
                                          <AlertTriangle size={16} className="shrink-0"/> {rec.violationName}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded inline-block border border-slate-100">
                                          <span className="font-bold">الإجراء:</span> {rec.actionTaken}
                                      </p>
                                  </div>
                                  <div className="text-left shrink-0">
                                      <span className={`block text-[10px] font-bold px-2 py-1 rounded border ${isSevere ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                          {rec.violationDegree}
                                      </span>
                                      <span className="block text-xs text-slate-400 font-mono mt-1">{rec.date}</span>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* VIEW 3: SMART DIRECTIVES */}
      {activeView === 'directives' && (
          <div className="animate-fade-in">
              {/* ... Directives Logic ... */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Megaphone className="text-amber-500"/> إرسال توجيه إداري</h3>
                  <textarea value={directiveContent} onChange={e => setDirectiveContent(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 mb-4 h-32" placeholder="اكتب التوجيه هنا..."></textarea>
                  <div className="flex gap-3">
                      <select value={directiveTarget} onChange={e => setDirectiveTarget(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-bold"><option value="deputy">للوكيل</option><option value="counselor">للمرشد</option></select>
                      <button onClick={handleSendDirective} disabled={sendingDirective} className="bg-blue-900 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-800">{sendingDirective ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} إرسال</button>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW 4: SETTINGS */}
      {activeView === 'settings' && (
          <div className="animate-fade-in space-y-6">
              {/* School Identity */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><School className="text-blue-600"/> هوية المدرسة</h2>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-2">اسم المدرسة</label><input value={tempSchoolName} onChange={e => setTempSchoolName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-2">رابط الشعار (URL)</label><input value={tempSchoolLogo} onChange={e => setTempSchoolLogo(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50" /></div>
                      <button onClick={saveSchoolSettings} className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> حفظ الهوية</button>
                  </div>
              </div>
              
              {/* AI Config */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings2/> الإعدادات التقنية</h2>
                  <div className="space-y-6">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-700 mb-2">مفتاح الذكاء الاصطناعي (API Key)</label>
                          <div className="flex gap-3"><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="flex-1 p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500" placeholder="gemini-2.5-flash compatible key..." /><button onClick={saveAIConfig} className="bg-slate-800 text-white px-6 rounded-xl font-bold">حفظ</button></div>
                      </div>
                      <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                          <div><h3 className="font-bold text-emerald-800">حالة الاتصال</h3><p className="text-sm text-emerald-600">فحص الاتصال بقاعدة البيانات السحابية</p></div>
                          <button onClick={runConnectionTest} disabled={testingConnection} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">{testingConnection ? <Loader2 className="animate-spin" size={16}/> : <Wifi size={16}/>} فحص الآن</button>
                      </div>
                  </div>
              </div>

              {/* NEW: Data & Deletion Management */}
              <div className="bg-white p-6 rounded-3xl border-2 border-red-50 shadow-sm max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold text-red-800 mb-6 flex items-center gap-2"><Database className="text-red-600"/> إعدادات حذف البيانات والتهيئة</h2>
                  
                  <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                          <button onClick={() => setDeleteTarget('requests')} className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                              <Trash2 size={16} /> حذف طلبات الأعذار
                          </button>
                          <button onClick={() => setDeleteTarget('attendance')} className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                              <Trash2 size={16} /> حذف بيانات الحضور
                          </button>
                          <button onClick={() => setDeleteTarget('students')} className="col-span-2 flex items-center justify-center gap-2 bg-white text-red-600 border border-red-100 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                              <Trash2 size={16} /> حذف جميع الطلاب
                          </button>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                          <button onClick={() => setDeleteTarget('all')} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
                              <RefreshCw size={20} /> تهيئة للعام الدراسي الجديد (حذف شامل)
                          </button>
                          <p className="text-center text-xs text-slate-400 mt-2">تحذير: هذا الإجراء سيقوم بحذف جميع البيانات (طلاب، حضور، أعذار، سلوك) ولا يمكن التراجع عنه.</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle size={32} className="text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">هل أنت متأكد؟</h3>
                  <p className="text-slate-500 text-sm mb-6">
                      {deleteTarget === 'all' 
                        ? "أنت على وشك حذف جميع بيانات النظام وتهيئته لعام جديد. هذا الإجراء نهائي ولا يمكن التراجع عنه." 
                        : deleteTarget === 'requests' ? "سيتم حذف جميع طلبات الأعذار المسجلة."
                        : deleteTarget === 'attendance' ? "سيتم حذف جميع سجلات الحضور والغياب."
                        : "سيتم حذف جميع بيانات الطلاب من النظام."}
                  </p>
                  
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteTarget(null)} 
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                          إلغاء
                      </button>
                      <button 
                        onClick={executeDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                          {isDeleting ? <Loader2 className="animate-spin" /> : 'نعم، احذف'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;