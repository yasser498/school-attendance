
import React, { useMemo, useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  FileText, Clock, CheckCircle, Sparkles, Calendar, AlertTriangle, Loader2, BrainCircuit, 
  Search, Settings, Printer, BarChart2, Users, Settings2, Trash2, Wifi, BellRing, Phone, 
  ShieldAlert, Send, Megaphone, Activity, LayoutGrid, Save, School, FileSpreadsheet, X, 
  Database, RefreshCw, Star, Newspaper, Plus, ClipboardCheck, UserCheck, CalendarDays, QrCode, Power, HardDrive, 
  ArrowUpRight, ChevronRight, Zap, PenTool, Bot, Copy, UploadCloud, LogOut, CalendarCheck, Edit, Trophy, Smile
} from 'lucide-react';
import { 
  getRequests, getStudents, getConsecutiveAbsences, resolveAbsenceAlert, getBehaviorRecords, 
  sendAdminInsight, testSupabaseConnection, getAttendanceRecords, generateSmartContent, 
  clearAttendance, clearRequests, clearStudents, clearBehaviorRecords, clearAdminInsights, 
  clearReferrals, getTopStudents, addSchoolNews, getSchoolNews, deleteSchoolNews, generateExecutiveReport,
  getAvailableSlots, addAppointmentSlot, deleteAppointmentSlot, getDailyAppointments, checkInVisitor, getStaffUsers,
  saveBotContext, getBotContext, getExitPermissions, generateDefaultAppointmentSlots, updateSchoolNews, updateAppointmentSlot,
  getStudentObservations, getStudentPoints
} from '../../services/storage';
import { RequestStatus, ExcuseRequest, Student, BehaviorRecord, AttendanceRecord, SchoolNews, Appointment, AppointmentSlot, StaffUser, ExitPermission, StudentObservation, StudentPoint } from '../../types';

// Declare XLSX
declare var XLSX: any;
// Declare PDF.js
declare var pdfjsLib: any;

const { useNavigate } = ReactRouterDOM as any;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation & View State
  const [activeView, setActiveView] = useState<'overview' | 'behavior' | 'directives' | 'news' | 'settings' | 'appointments'>('overview');
  
  // Core Data
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [observations, setObservations] = useState<StudentObservation[]>([]); // Added
  const [topStudents, setTopStudents] = useState<any[]>([]); // Added
  
  const [dataLoading, setDataLoading] = useState(true);
  
  // Appointment & Exits Data
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [exitLog, setExitLog] = useState<ExitPermission[]>([]);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  
  // Manual Slot Modal State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [newSlotStart, setNewSlotStart] = useState('');
  const [newSlotEnd, setNewSlotEnd] = useState('');
  const [newSlotCapacity, setNewSlotCapacity] = useState(5);

  // School Identity
  const [schoolName, setSchoolName] = useState(localStorage.getItem('school_name') || 'متوسطة عماد الدين زنكي');
  const [schoolLogo, setSchoolLogo] = useState(localStorage.getItem('school_logo') || 'https://www.raed.net/img?id=1471924');
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);
  const [tempSchoolLogo, setTempSchoolLogo] = useState(schoolLogo);
  
  // Alerts & AI
  const [alerts, setAlerts] = useState<{ studentId: string, studentName: string, days: number, lastDate: string }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  
  // Directives
  const [directiveContent, setDirectiveContent] = useState('');
  const [directiveTarget, setDirectiveTarget] = useState<'deputy' | 'counselor' | 'teachers'>('deputy');
  const [sendingDirective, setSendingDirective] = useState(false);

  // Settings
  const [deleteTarget, setDeleteTarget] = useState<'requests' | 'attendance' | 'students' | 'all' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bot Context
  const [botContext, setBotContext] = useState('');
  const [savingContext, setSavingContext] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // News Form
  const [newsList, setNewsList] = useState<SchoolNews[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isGeneratingNews, setIsGeneratingNews] = useState(false); 
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  // Visits
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);

  // Global Search
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [reqs, studs, stf, behaviors, atts, news, apps, ctx, obs, top] = await Promise.all([
            getRequests(), 
            getStudents(), 
            getStaffUsers(),
            getBehaviorRecords(),
            getAttendanceRecords(),
            getSchoolNews(),
            getDailyAppointments(new Date().toISOString().split('T')[0]),
            getBotContext(),
            getStudentObservations(),
            getTopStudents(5)
        ]);
        setRequests(reqs);
        setStudents(studs);
        setStaff(stf);
        setBehaviorRecords(behaviors);
        setAttendanceRecords(atts);
        setNewsList(news);
        setTodaysAppointments(apps);
        setBotContext(ctx || "أوقات الدوام: 7 ص إلى 1 ظهراً.\nمدير المدرسة: الأستاذ محمد.\nموعيد الاختبارات: تبدأ الأسبوع القادم.");
        setObservations(obs);
        setTopStudents(top);

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

  // Fetch Appointment Data when tab is active
  useEffect(() => {
      if (activeView === 'appointments') {
          fetchAppointmentData();
      }
  }, [activeView, apptDate]);

  const fetchAppointmentData = async () => {
      const [s, e] = await Promise.all([
          getAvailableSlots(apptDate),
          getExitPermissions(apptDate)
      ]);
      setSlots(s);
      setExitLog(e);
  };

  // --- APPOINTMENT HANDLERS ---
  const handleGenerateSlots = async () => {
      if (!window.confirm(`هل أنت متأكد من إنشاء المواعيد الافتراضية (7:30 - 12:00) ليوم ${apptDate}؟`)) return;
      setIsGeneratingSlots(true);
      try {
          await generateDefaultAppointmentSlots(apptDate);
          fetchAppointmentData();
          alert("تم إنشاء المواعيد بنجاح!");
      } catch (e) {
          alert("حدث خطأ أو أن المواعيد موجودة بالفعل.");
      } finally {
          setIsGeneratingSlots(false);
      }
  };

  const handleDeleteSlot = async (id: string) => {
      if (!window.confirm("حذف هذا الموعد؟")) return;
      await deleteAppointmentSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
  };

  const openAddSlotModal = () => {
      setEditingSlotId(null);
      setNewSlotStart('');
      setNewSlotEnd('');
      setNewSlotCapacity(5);
      setShowSlotModal(true);
  };

  const openEditSlotModal = (slot: AppointmentSlot) => {
      setEditingSlotId(slot.id);
      setNewSlotStart(slot.startTime); 
      setNewSlotEnd(slot.endTime);
      setNewSlotCapacity(slot.maxCapacity);
      setShowSlotModal(true);
  };

  const handleSaveManualSlot = async () => {
      if (!newSlotStart || !newSlotEnd || newSlotCapacity <= 0) {
          alert("يرجى تعبئة جميع الحقول بشكل صحيح");
          return;
      }

      try {
          if (editingSlotId) {
              await updateAppointmentSlot({
                  id: editingSlotId,
                  date: apptDate,
                  startTime: newSlotStart,
                  endTime: newSlotEnd,
                  maxCapacity: newSlotCapacity,
                  currentBookings: 0 
              });
              alert("تم تعديل الموعد");
          } else {
              await addAppointmentSlot({
                  date: apptDate,
                  startTime: newSlotStart,
                  endTime: newSlotEnd,
                  maxCapacity: newSlotCapacity
              });
              alert("تم إضافة الموعد");
          }
          setShowSlotModal(false);
          fetchAppointmentData();
      } catch (e: any) {
          alert("خطأ: " + e.message);
      }
  };

  // --- Search Logic ---
  const searchResults = useMemo(() => {
      if (!globalSearch) return null;
      const term = globalSearch.toLowerCase();
      
      return {
          students: students.filter(s => s.name.toLowerCase().includes(term) || s.studentId.includes(term)).slice(0, 3),
          requests: requests.filter(r => r.studentName.toLowerCase().includes(term) && r.status === 'PENDING').slice(0, 3),
          staff: staff.filter(s => s.name.toLowerCase().includes(term)).slice(0, 3)
      };
  }, [globalSearch, students, requests, staff]);

  // --- Stats Logic (FIXED ATTENDANCE CALCULATION) ---
  const stats = useMemo(() => { 
      const total = requests.length; 
      const pending = requests.filter(r => r.status === RequestStatus.PENDING).length; 
      
      // Calculate Attendance Correctly (Sum of all classes for today)
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysRecords = attendanceRecords.filter(r => r.date === todayStr);
      
      let presentToday = 0;
      let absentToday = 0;
      let lateToday = 0;

      todaysRecords.forEach(record => {
          record.records.forEach(stu => {
              if (stu.status === 'PRESENT') presentToday++;
              else if (stu.status === 'ABSENT') absentToday++;
              else if (stu.status === 'LATE') lateToday++;
          });
      });
      
      return { total, pending, studentsCount: students.length, presentToday, absentToday, lateToday }; 
  }, [requests, students, attendanceRecords]);
  
  const attendanceTrendData = useMemo(() => {
      const last7Days = attendanceRecords.slice(0, 7).reverse();
      return last7Days.map(r => {
          let p = 0, a = 0;
          r.records.forEach(s => s.status === 'PRESENT' ? p++ : a++);
          return { date: new Date(r.date).toLocaleDateString('ar-SA', {weekday:'short'}), presence: p, absence: a };
      });
  }, [attendanceRecords]);

  // --- Behavior & Observations Stats ---
  const behaviorStats = useMemo(() => {
      const counts: Record<string, number> = {};
      behaviorRecords.forEach(b => {
          counts[b.violationName] = (counts[b.violationName] || 0) + 1;
      });
      return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 violations
  }, [behaviorRecords]);

  const observationSentiment = useMemo(() => {
      const pos = observations.filter(o => o.type === 'positive').length;
      const neg = observations.filter(o => o.type === 'behavioral').length;
      const neutral = observations.filter(o => o.type === 'general' || o.type === 'academic').length;
      return [
          { name: 'إيجابي', value: pos, color: '#10b981' },
          { name: 'تنبيهات', value: neg, color: '#ef4444' },
          { name: 'عام', value: neutral, color: '#6366f1' },
      ];
  }, [observations]);

  // --- Recent Activity Feed (Derived) ---
  const recentActivity = useMemo(() => {
      const activities = [
          ...requests.map(r => ({ type: 'request', title: 'عذر جديد', desc: `${r.studentName}: ${r.reason}`, time: r.submissionDate })),
          ...behaviorRecords.map(b => ({ type: 'behavior', title: 'مخالفة سلوكية', desc: `${b.studentName}: ${b.violationName}`, time: b.createdAt || b.date })),
          ...observations.map(o => ({ type: 'observation', title: 'ملاحظة معلم', desc: `${o.studentName} - ${o.type === 'positive' ? 'تعزيز' : 'ملاحظة'}`, time: o.createdAt || o.date })),
      ];
      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
  }, [requests, behaviorRecords, observations]);

  const handleGenerateBriefing = async () => {
      setIsGenerating(true);
      try {
          const prompt = `
            أنت مساعد إداري ذكي لمدير مدرسة. قدم "ملخص صباحي" بناءً على:
            - حضور اليوم: ${stats.presentToday} طالب.
            - غياب اليوم: ${stats.absentToday} طالب.
            - طلبات أعذار معلقة: ${stats.pending}.
            - مخالفات سلوكية حديثة: ${behaviorRecords.length} هذا الأسبوع.
            - تنبيهات الخطر (غياب متصل): ${alerts.length} طلاب.
            
            اكتب 3 نقاط موجزة جداً بالأهمية القصوى التي يجب على المدير فعلها الآن.
          `;
          const res = await generateSmartContent(prompt);
          setAiBriefing(res);
      } catch(e) { alert("تعذر الاتصال بالمساعد الذكي"); } 
      finally { setIsGenerating(false); }
  };

  const handleResolveAlert = async (studentId: string, action: string) => { setAlerts(prev => prev.filter(a => a.studentId !== studentId)); await resolveAbsenceAlert(studentId, action); };
  
  const handleGenerateDirective = async () => {
      setIsGenerating(true);
      try {
          let targetName = 'وكيل الشؤون الطلابية';
          let tone = 'حازمة ولكن محفزة';
          
          if (directiveTarget === 'counselor') {
              targetName = 'الموجه الطلابي';
              tone = 'تربوية وداعمة';
          }
          if (directiveTarget === 'teachers') {
              targetName = 'الكادر التعليمي (المعلمين)';
              tone = 'مشجعة ومهنية وتؤكد على الأمانة';
          }

          const prompt = `
            اكتب تعميم/توجيه إداري قصير ورسمي موجه إلى ${targetName}.
            الموضوع أو الفكرة الرئيسية: ${directiveContent || 'تحسين الانضباط ومتابعة الطلاب'}.
            النبرة: ${tone}.
            
            الصيغة: رسالة واتساب رسمية أو تعميم قصير جداً.
          `;
          const res = await generateSmartContent(prompt);
          setDirectiveContent(res);
      } catch(e) { alert("فشل التوليد"); } 
      finally { setIsGenerating(false); }
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
  
  const saveSchoolSettings = () => { localStorage.setItem('school_name', tempSchoolName); localStorage.setItem('school_logo', tempSchoolLogo); setSchoolName(tempSchoolName); setSchoolLogo(tempSchoolLogo); alert("تم الحفظ"); };
  const executeDelete = async () => { if (!deleteTarget) return; setIsDeleting(true); try { if (deleteTarget === 'requests') await clearRequests(); else if (deleteTarget === 'attendance') await clearAttendance(); else if (deleteTarget === 'students') await clearStudents(); else if (deleteTarget === 'all') await Promise.all([clearStudents(), clearRequests(), clearAttendance(), clearBehaviorRecords(), clearAdminInsights(), clearReferrals()]); window.location.reload(); } catch (e: any) { alert("خطأ: " + e.message); } finally { setIsDeleting(false); setDeleteTarget(null); } };
  
  // ... (Keep existing handlers for News, BotContext etc.) ...
  const handleGenerateNewsDraft = async () => { if (!newNewsTitle && !newNewsContent) { alert('يرجى كتابة عنوان الخبر أولاً'); return; } setIsGeneratingNews(true); try { const prompt = `بصفتك مسؤول الإعلام، صغ خبراً بعنوان "${newNewsTitle}" وتفاصيل "${newNewsContent}".`; const res = await generateSmartContent(prompt); setNewNewsContent(res); } catch (e) { alert("فشل صياغة الخبر"); } finally { setIsGeneratingNews(false); } };
  const handleSaveNews = async () => { if (!newNewsTitle || !newNewsContent) return; try { if (editingNewsId) { await updateSchoolNews({ id: editingNewsId, title: newNewsTitle, content: newNewsContent, author: 'الإدارة', isUrgent: isUrgent, createdAt: new Date().toISOString() }); } else { await addSchoolNews({ title: newNewsTitle, content: newNewsContent, author: 'الإدارة', isUrgent: isUrgent }); } const updated = await getSchoolNews(); setNewsList(updated); resetNewsForm(); alert('تم الحفظ'); } catch (e) { alert('فشل العملية'); } };
  const handleDeleteNews = async (id: string) => { if(!window.confirm('حذف الخبر؟')) return; try { await deleteSchoolNews(id); setNewsList(prev => prev.filter(n => n.id !== id)); } catch(e) { alert('فشل الحذف'); } };
  const handleEditNews = (news: SchoolNews) => { setEditingNewsId(news.id); setNewNewsTitle(news.title); setNewNewsContent(news.content); setIsUrgent(news.isUrgent); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const resetNewsForm = () => { setNewNewsTitle(''); setNewNewsContent(''); setIsUrgent(false); setEditingNewsId(null); };
  const handleSaveBotContext = async () => { setSavingContext(true); try { await saveBotContext(botContext); alert("تم التحديث."); } catch (e) { alert("فشل الحفظ."); } finally { setSavingContext(false); } };
  const insertTemplate = (type: 'exam' | 'hours') => { const text = type === 'exam' ? "جدول الاختبارات..." : "أوقات الدوام..."; setBotContext(prev => prev + "\n\n" + text); };
  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... existing logic ... */ };

  return (
    <div className="space-y-6 pb-20 relative font-sans">
      
      {/* 1. HEADER & SEARCH */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/20">
                  <LayoutGrid size={24} />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">مركز القيادة</h1>
                  <p className="text-xs text-slate-500 font-medium">لوحة التحكم المركزية - {schoolName}</p>
              </div>
          </div>

          <div className="relative w-full md:w-96 group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                  type="text" 
                  placeholder="بحث شامل (طالب، عذر، مخالفة)..." 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-bold text-slate-700"
              />
              {/* Search Results Dropdown */}
              {globalSearch && searchResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-30 animate-fade-in-up">
                      {searchResults.students.length > 0 && (
                          <div className="p-2 border-b border-slate-50">
                              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1">الطلاب</p>
                              {searchResults.students.map(s => (
                                  <div key={s.id} onClick={() => navigate('/admin/students')} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                                      <span className="font-bold text-sm text-slate-800">{s.name}</span>
                                      <span className="text-xs text-slate-400">{s.grade}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="flex gap-2">
              <button onClick={() => navigate('/admin/users')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors" title="المستخدمين">
                  <Users size={20} />
              </button>
              <button onClick={() => setActiveView('settings')} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors" title="الإعدادات">
                  <Settings size={20} />
              </button>
          </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {[
              { id: 'overview', label: 'نظرة عامة', icon: Activity },
              { id: 'behavior', label: 'السلوك والمخالفات', icon: ShieldAlert },
              { id: 'appointments', label: 'المواعيد والاستئذان', icon: CalendarCheck },
              { id: 'directives', label: 'التوجيهات', icon: BrainCircuit },
              { id: 'news', label: 'الأخبار', icon: Newspaper },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                      activeView === tab.id 
                      ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' 
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                  }`}
              >
                  <tab.icon size={18} />
                  {tab.label}
              </button>
          ))}
      </div>

      {/* VIEW: OVERVIEW */}
      {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              <div className="lg:col-span-2 space-y-6">
                  {/* AI BRIEFING CARD */}
                  <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                                      <Sparkles className="text-amber-300" size={24} />
                                  </div>
                                  <div>
                                      <h2 className="text-lg font-bold">المساعد الذكي</h2>
                                      <p className="text-indigo-200 text-xs">تحليل فوري لحالة المدرسة</p>
                                  </div>
                              </div>
                              <button onClick={handleGenerateBriefing} disabled={isGenerating} className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                                  {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} توليد الملخص
                              </button>
                          </div>
                          
                          {aiBriefing ? (
                              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-sm leading-relaxed border border-white/10 animate-fade-in">
                                  {aiBriefing.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                              </div>
                          ) : (
                              <p className="text-indigo-200 text-sm opacity-70">اضغط على "توليد الملخص" للحصول على تقرير صباحي شامل حول الغياب والمشاكل المعلقة.</p>
                          )}
                      </div>
                  </div>

                  {/* KPI CARDS (Redesigned with Unified Attendance Card) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* 1. Students Count */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center h-full">
                          <div className="bg-slate-50 text-slate-600 p-3 rounded-2xl mb-2"><Users size={24}/></div>
                          <span className="text-xs font-bold text-slate-400 uppercase">الطلاب</span>
                          <h3 className="text-3xl font-extrabold text-slate-800">{stats.studentsCount}</h3>
                      </div>

                      {/* 2. Unified Attendance Card (Spans 2 columns) */}
                      <div className="md:col-span-2 bg-gradient-to-br from-white to-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                  <div className="bg-white p-1.5 rounded-lg shadow-sm text-blue-600"><Clock size={16} /></div>
                                  ملخص الحضور اليومي
                              </h3>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">اليوم</span>
                          </div>
                          
                          <div className="flex justify-around items-center divide-x divide-x-reverse divide-slate-200">
                              {/* Present */}
                              <div className="text-center px-2 flex-1">
                                  <p className="text-3xl font-extrabold text-emerald-600">{stats.presentToday}</p>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                      <p className="text-xs font-bold text-slate-500">حضور</p>
                                  </div>
                              </div>
                              {/* Absent */}
                              <div className="text-center px-2 flex-1">
                                  <p className="text-3xl font-extrabold text-red-600">{stats.absentToday}</p>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                      <p className="text-xs font-bold text-slate-500">غياب</p>
                                  </div>
                              </div>
                              {/* Late */}
                              <div className="text-center px-2 flex-1">
                                  <p className="text-3xl font-extrabold text-amber-500">{stats.lateToday}</p>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                      <p className="text-xs font-bold text-slate-500">تأخر</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* 3. Risk Alert */}
                      <div className="bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-center items-center text-center h-full">
                          <div className="bg-white text-red-600 p-3 rounded-2xl mb-2 shadow-sm"><AlertTriangle size={24}/></div>
                          <span className="text-xs font-bold text-red-400 uppercase">حالات الخطر</span>
                          <h3 className="text-3xl font-extrabold text-red-700">{alerts.length}</h3>
                      </div>
                  </div>

                  {/* CHARTS ROW 1: Attendance & Behavior */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[300px]">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="text-blue-600"/> مؤشر الحضور الأسبوعي</h3>
                          <ResponsiveContainer width="100%" height={200}>
                              <AreaChart data={attendanceTrendData}>
                                  <defs>
                                      <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                  <Tooltip />
                                  <Area type="monotone" dataKey="presence" stroke="#2563eb" fillOpacity={1} fill="url(#colorPresence)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[300px]">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldAlert className="text-red-600"/> توزيع المخالفات السلوكية</h3>
                          <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={behaviorStats} layout="vertical">
                                  <XAxis type="number" hide />
                                  <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                  <Tooltip cursor={{fill: '#f8fafc'}} />
                                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* EDUCATIONAL INSIGHTS ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Students (Positive Reinforcement) */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Trophy className="text-amber-500"/> لوحة التميز (أعلى النقاط)</h3>
                          {topStudents.length === 0 ? <p className="text-slate-400 text-xs">لا يوجد نقاط مسجلة بعد.</p> : (
                              <div className="space-y-3">
                                  {topStudents.map((s, i) => (
                                      <div key={i} className="flex items-center justify-between p-2 bg-amber-50/50 rounded-xl border border-amber-100">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">{i+1}</div>
                                              <div>
                                                  <p className="font-bold text-sm text-slate-800">{s.name}</p>
                                                  <p className="text-[10px] text-slate-500">{s.grade}</p>
                                              </div>
                                          </div>
                                          <div className="font-bold text-amber-600 text-sm flex items-center gap-1">
                                              {s.points} <Star size={12} fill="currentColor"/>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Observations Sentiment */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Smile className="text-purple-600"/> تحليل الملاحظات التربوية</h3>
                          <div className="flex-1 min-h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie 
                                        data={observationSentiment} 
                                        cx="50%" cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={80} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                      >
                                          {observationSentiment.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                          ))}
                                      </Pie>
                                      <Tooltip />
                                      <Legend verticalAlign="bottom" height={36}/>
                                  </PieChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-1 space-y-6">
                  {/* QUICK ACTIONS GRID */}
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => navigate('/admin/requests')} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 h-28">
                          <div className="bg-blue-50 text-blue-600 p-3 rounded-full"><FileText size={20}/></div>
                          <span className="text-xs font-bold text-slate-700">مراجعة الأعذار</span>
                      </button>
                      <button onClick={() => navigate('/admin/attendance-reports')} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 h-28">
                          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full"><FileSpreadsheet size={20}/></div>
                          <span className="text-xs font-bold text-slate-700">تقرير الغياب</span>
                      </button>
                      <button onClick={() => navigate('/admin/students')} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 h-28">
                          <div className="bg-purple-50 text-purple-600 p-3 rounded-full"><Search size={20}/></div>
                          <span className="text-xs font-bold text-slate-700">بيانات الطلاب</span>
                      </button>
                      <button onClick={() => setActiveView('news')} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-pink-400 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 h-28">
                          <div className="bg-pink-50 text-pink-600 p-3 rounded-full"><Megaphone size={20}/></div>
                          <span className="text-xs font-bold text-slate-700">نشر خبر</span>
                      </button>
                  </div>

                  {/* LIVE ACTIVITY FEED */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
                      <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-emerald-500"/> النشاط الحديث</h3>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full animate-pulse">مباشر</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                          {recentActivity.length === 0 ? (
                              <p className="text-center text-slate-400 text-xs py-10">لا توجد نشاطات حديثة</p>
                          ) : (
                              recentActivity.map((act, idx) => (
                                  <div key={idx} className="flex gap-3">
                                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${act.type === 'request' ? 'bg-amber-500' : act.type === 'behavior' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                      <div>
                                          <p className="text-xs font-bold text-slate-800">{act.title}</p>
                                          <p className="text-[10px] text-slate-500 line-clamp-1">{act.desc}</p>
                                          <p className="text-[9px] text-slate-400 mt-0.5">{new Date(act.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: APPOINTMENTS & EXITS */}
      {activeView === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              {/* Left Column: Exits Log */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                  <div className="p-6 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                      <h3 className="font-bold text-orange-900 flex items-center gap-2"><LogOut size={20}/> سجل استئذان الطلاب</h3>
                      <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="bg-white border border-orange-200 rounded-lg px-2 py-1 text-sm font-bold outline-none" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {exitLog.length === 0 ? (
                          <div className="text-center py-20 text-slate-400">لا يوجد سجلات خروج لهذا اليوم</div>
                      ) : (
                          <div className="space-y-3">
                              {exitLog.map((exit, i) => (
                                  <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl flex justify-between items-center hover:shadow-sm transition-shadow">
                                      <div>
                                          <p className="font-bold text-slate-800">{exit.studentName}</p>
                                          <p className="text-xs text-slate-500">{exit.grade} - {exit.className}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">المصرح: {exit.createdByName || '-'}</span>
                                              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">المستلم: {exit.parentName}</span>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`text-xs font-bold px-2 py-1 rounded ${exit.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                                              {exit.status === 'completed' ? 'تم الخروج' : 'انتظار'}
                                          </span>
                                          <p className="text-xs font-mono text-slate-400 mt-1">{new Date(exit.createdAt).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* Right Column: Appointment Settings */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                  <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                      <h3 className="font-bold text-blue-900 flex items-center gap-2"><CalendarCheck size={20}/> إدارة المواعيد</h3>
                      <div className="flex gap-2">
                          <button 
                            onClick={openAddSlotModal} 
                            className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 shadow-sm"
                          >
                              <Plus size={12}/> إضافة موعد
                          </button>
                          <button 
                            onClick={handleGenerateSlots} 
                            disabled={isGeneratingSlots}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                          >
                              {isGeneratingSlots ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                              توليد القالب الافتراضي
                          </button>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      يتم توليد المواعيد من 7:30 ص إلى 12:00 م (كل 30 دقيقة) للتاريخ المحدد، أو يمكنك إضافة مواعيد يدوياً.
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {slots.length === 0 ? (
                          <div className="text-center py-20 text-slate-400">لا توجد مواعيد متاحة لهذا اليوم.<br/>اضغط "توليد القالب" أو "إضافة موعد".</div>
                      ) : (
                          <div className="grid grid-cols-2 gap-3">
                              {slots.map((slot) => (
                                  <div key={slot.id} className="border border-slate-200 p-3 rounded-xl flex justify-between items-center bg-white hover:border-blue-300 transition-colors">
                                      <div>
                                          <p className="font-bold text-slate-800 text-sm font-mono">{slot.startTime} - {slot.endTime}</p>
                                          <p className="text-xs text-slate-500">حجوزات: {slot.currentBookings} / {slot.maxCapacity}</p>
                                      </div>
                                      <div className="flex gap-1">
                                          <button onClick={() => openEditSlotModal(slot)} className="text-slate-300 hover:text-blue-500 p-1"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteSlot(slot.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: BEHAVIOR */}
      {activeView === 'behavior' && (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto h-[500px]">
                      <h3 className="font-bold text-slate-800 mb-4">سجل المخالفات الأخير</h3>
                      <div className="space-y-3">
                          {behaviorRecords.slice(0, 10).map(rec => (
                              <div key={rec.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div>
                                      <p className="font-bold text-sm text-slate-800">{rec.studentName}</p>
                                      <p className="text-xs text-red-600">{rec.violationName}</p>
                                  </div>
                                  <span className="text-[10px] bg-white px-2 py-1 rounded border text-slate-500">{rec.date}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
                      <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><ShieldAlert className="text-red-600"/> تنبيهات الغياب المتصل</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                          {alerts.length === 0 ? (
                              <div className="text-center py-10 text-slate-400">لا توجد حالات غياب متصل خطيرة.</div>
                          ) : (
                              alerts.map((a, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                      <div>
                                          <p className="font-bold text-slate-800">{a.studentName}</p>
                                          <p className="text-xs text-red-600 font-bold">{a.days} أيام غياب متصلة</p>
                                      </div>
                                      <button onClick={() => handleResolveAlert(a.studentId, 'call')} className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50">متابعة</button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: DIRECTIVES */}
      {activeView === 'directives' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-purple-900"><BrainCircuit /> التوجيه الإداري الذكي</h2>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                      <textarea 
                          value={directiveContent} 
                          onChange={e => setDirectiveContent(e.target.value)} 
                          placeholder="اكتب الفكرة هنا..."
                          className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 outline-none text-sm min-h-[120px]"
                      ></textarea>
                      <div className="flex flex-col md:flex-row justify-between items-center mt-2 border-t border-slate-200 pt-3 gap-3">
                          <button onClick={handleGenerateDirective} disabled={isGenerating} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-700 shadow-sm w-full md:w-auto justify-center">
                              {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} صياغة بالذكاء الاصطناعي
                          </button>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-bold justify-end">
                              <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border hover:bg-slate-50"><input type="radio" checked={directiveTarget === 'deputy'} onChange={() => setDirectiveTarget('deputy')} /> للوكيل</label>
                              <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border hover:bg-slate-50"><input type="radio" checked={directiveTarget === 'counselor'} onChange={() => setDirectiveTarget('counselor')} /> للموجه</label>
                              <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border hover:bg-slate-50"><input type="radio" checked={directiveTarget === 'teachers'} onChange={() => setDirectiveTarget('teachers')} /> للمعلمين</label>
                          </div>
                      </div>
                  </div>
                  <button onClick={handleSendDirective} disabled={sendingDirective || !directiveContent} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg">
                      {sendingDirective ? <Loader2 className="animate-spin"/> : <Send size={18}/>} إرسال التوجيه
                  </button>
              </div>
          </div>
      )}

      {/* VIEW: NEWS */}
      {activeView === 'news' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Add News Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Megaphone className="text-pink-600" /> {editingNewsId ? 'تعديل الخبر' : 'نشر خبر جديد'}
                </h2>
                {editingNewsId && (
                    <button onClick={resetNewsForm} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200">
                        إلغاء التعديل
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">عنوان الخبر</label>
                <input 
                  value={newNewsTitle}
                  onChange={(e) => setNewNewsTitle(e.target.value)}
                  className="w-full p-3 border rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-pink-100 outline-none"
                  placeholder="مثال: موعد اختبارات منتصف الفصل..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">نص الخبر</label>
                <div className="relative">
                  <textarea 
                    value={newNewsContent}
                    onChange={(e) => setNewNewsContent(e.target.value)}
                    className="w-full p-3 border rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-pink-100 outline-none resize-y"
                    placeholder="التفاصيل..."
                  ></textarea>
                  <button 
                    onClick={handleGenerateNewsDraft}
                    disabled={isGeneratingNews}
                    className="absolute bottom-3 left-3 text-xs bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg border border-pink-100 flex items-center gap-1 hover:bg-pink-100"
                  >
                    {isGeneratingNews ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} صياغة ذكية
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="urgent" 
                  checked={isUrgent} 
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-5 h-5 accent-red-500 rounded cursor-pointer"
                />
                <label htmlFor="urgent" className="text-sm font-bold text-slate-700 cursor-pointer">خبر عاجل (إشعار أحمر)</label>
              </div>

              <button 
                onClick={handleSaveNews}
                disabled={!newNewsTitle || !newNewsContent}
                className={`w-full text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${editingNewsId ? 'bg-blue-900 hover:bg-blue-800' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                {editingNewsId ? <><Edit size={18}/> حفظ التعديلات</> : <><Send size={18}/> نشر الخبر</>}
              </button>
            </div>
          </div>

          {/* News List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-500 text-sm uppercase">الأخبار المنشورة ({newsList.length})</h3>
            {newsList.length === 0 ? (
              <div className="text-center py-10 text-slate-400">لا يوجد أخبار منشورة.</div>
            ) : (
              newsList.map(item => (
                <div key={item.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-start ${item.isUrgent ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                      {item.isUrgent && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold">عاجل</span>}
                    </div>
                    <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{item.content}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">{new Date(item.createdAt).toLocaleDateString('ar-SA')} - {item.author}</span>
                  </div>
                  <div className="flex gap-1">
                      <button onClick={() => handleEditNews(item)} className="text-slate-300 hover:text-blue-500 p-2"><Edit size={18}/></button>
                      <button onClick={() => handleDeleteNews(item.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: SETTINGS */}
      {activeView === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          
          {/* Identity */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <School className="text-blue-600" /> هوية المدرسة
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">اسم المدرسة</label>
                <input 
                  value={tempSchoolName}
                  onChange={(e) => setTempSchoolName(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">رابط الشعار (URL)</label>
                <input 
                  value={tempSchoolLogo}
                  onChange={(e) => setTempSchoolLogo(e.target.value)}
                  className="w-full p-3 border rounded-xl dir-ltr text-left"
                />
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={saveSchoolSettings} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700">حفظ الإعدادات</button>
            </div>
          </div>

          {/* AI Knowledge Base */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Bot className="text-purple-600" /> قاعدة معرفة البوت
              </h2>
              <div className="flex gap-2">
                 <button onClick={() => insertTemplate('hours')} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded font-bold">أوقات الدوام</button>
                 <button onClick={() => insertTemplate('exam')} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded font-bold">جدول الاختبارات</button>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 text-sm text-blue-800">
              <p className="font-bold mb-1">تعليم المساعد الذكي:</p>
              <p>قم بكتابة المعلومات الهامة هنا (أوقات الدوام، القوانين، الإعلانات) أو ارفع ملفات (PDF/Excel) ليتعلم منها البوت ويجيب على أسئلة المستخدمين بدقة.</p>
            </div>

            <textarea 
              value={botContext}
              onChange={(e) => setBotContext(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl h-64 font-mono text-sm leading-relaxed mb-4 focus:ring-2 focus:ring-purple-100 outline-none"
              placeholder="أدخل المعلومات هنا..."
            ></textarea>

            <div className="flex justify-between items-center">
              <div className="relative">
                 <input type="file" id="knowledge-upload" className="hidden" accept=".pdf,.xlsx,.xls,.txt" onChange={handleKnowledgeUpload} disabled={isProcessingFile}/>
                 <label htmlFor="knowledge-upload" className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 ${isProcessingFile ? 'opacity-50' : 'text-slate-600'}`}>
                    {isProcessingFile ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>} 
                    {isProcessingFile ? 'جاري التحليل...' : 'رفع ملف (PDF/Excel)'}
                 </label>
              </div>
              <button 
                onClick={handleSaveBotContext} 
                disabled={savingContext}
                className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-600/20"
              >
                {savingContext ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} حفظ وتحديث البوت
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
            <h2 className="text-xl font-bold text-red-800 mb-6 flex items-center gap-2">
              <AlertTriangle /> منطقة الخطر
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
               <button onClick={() => setDeleteTarget('requests')} className="bg-white border border-red-200 text-red-600 p-4 rounded-xl font-bold hover:bg-red-100 text-right">
                  حذف جميع طلبات الأعذار
               </button>
               <button onClick={() => setDeleteTarget('attendance')} className="bg-white border border-red-200 text-red-600 p-4 rounded-xl font-bold hover:bg-red-100 text-right">
                  حذف سجل الحضور
               </button>
               <button onClick={() => setDeleteTarget('students')} className="bg-white border border-red-200 text-red-600 p-4 rounded-xl font-bold hover:bg-red-100 text-right">
                  حذف جميع الطلاب
               </button>
               <button onClick={() => setDeleteTarget('all')} className="bg-red-600 text-white p-4 rounded-xl font-bold hover:bg-red-700 text-right shadow-lg shadow-red-600/20">
                  تهيئة النظام بالكامل (حذف كل شيء)
               </button>
            </div>
            
            {deleteTarget && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white p-6 rounded-2xl max-w-md w-full">
                    <h3 className="text-xl font-bold text-red-600 mb-2">تأكيد الحذف</h3>
                    <p className="text-slate-600 mb-6">هل أنت متأكد؟ لا يمكن التراجع عن هذه العملية.</p>
                    <div className="flex gap-3">
                       <button onClick={executeDelete} disabled={isDeleting} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">
                          {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                       </button>
                       <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">إلغاء</button>
                    </div>
                 </div>
              </div>
            )}
          </div>

        </div>
      )}
      
      {/* MANUAL SLOT MODAL */}
      {showSlotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-900 text-lg">{editingSlotId ? 'تعديل موعد' : 'إضافة موعد جديد'}</h3>
                      <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">وقت البدء</label>
                          <input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">وقت النهاية</label>
                          <input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">السعة القصوى (عدد الزوار)</label>
                          <input type="number" min="1" value={newSlotCapacity} onChange={e => setNewSlotCapacity(parseInt(e.target.value))} className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-800" />
                      </div>
                      
                      <button onClick={handleSaveManualSlot} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2">
                          {editingSlotId ? 'حفظ التعديلات' : 'إضافة الموعد'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
