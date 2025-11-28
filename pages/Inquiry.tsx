import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, School, Copy, Check, CalendarDays, AlertCircle, ArrowLeft, Loader2, PieChart, LayoutList, History, FileText, AlertTriangle, FileWarning, MessageSquare, Send, CheckCircle, Clock, ShieldAlert, Star, BookOpen, Quote, Sparkles, Activity, PlusCircle } from 'lucide-react';
import { getStudentByCivilId, getRequestsByStudentId, getStudentAttendanceHistory, getBehaviorRecords, getStudentObservations, acknowledgeBehavior, acknowledgeObservation } from '../services/storage';
import { Student, ExcuseRequest, RequestStatus, AttendanceStatus, BehaviorRecord, StudentObservation } from '../types';

const Inquiry: React.FC = () => {
  const navigate = useNavigate();
  
  // Search State
  const [searchId, setSearchId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'requests' | 'behavior' | 'observations'>('overview');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<ExcuseRequest[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
  const [behaviorHistory, setBehaviorHistory] = useState<BehaviorRecord[]>([]);
  const [observations, setObservations] = useState<StudentObservation[]>([]);
  
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reply State
  const [replyMode, setReplyMode] = useState<{ id: string, type: 'behavior' | 'observation' } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchStudentData = async (targetStudent: Student) => {
    setLoading(true);
    try {
        setStudent(targetStudent);
        // 2. Get Requests, Attendance, Behavior, and Observations in parallel
        const [studentRequests, attHist, behHist, obsHist] = await Promise.all([
            getRequestsByStudentId(targetStudent.studentId),
            getStudentAttendanceHistory(targetStudent.studentId, targetStudent.grade, targetStudent.className),
            getBehaviorRecords(targetStudent.studentId),
            getStudentObservations(targetStudent.studentId)
        ]);
        
        setHistory(studentRequests);
        setAttendanceHistory(attHist);
        setBehaviorHistory(behHist);
        setObservations(obsHist);
        setActiveTab('overview');
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setSearched(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudent(null);
    setHistory([]);
    setAttendanceHistory([]);
    setBehaviorHistory([]);
    setObservations([]);
    setSearched(false);

    if (!searchId) return;
    setLoading(true);
    try {
        const foundStudent = await getStudentByCivilId(searchId);
        if (foundStudent) {
            await fetchStudentData(foundStudent);
        } else {
            setSearched(true); // Not found
            setLoading(false);
        }
    } catch (error) {
        setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- REPLY LOGIC ---
  const handleAcknowledge = async (type: 'behavior' | 'observation', id: string) => {
      if(!window.confirm("هل تريد تأكيد الاطلاع على هذا السجل؟")) return;
      setSubmittingReply(true);
      try {
          if (type === 'behavior') await acknowledgeBehavior(id);
          else await acknowledgeObservation(id);
          
          if(student) await fetchStudentData(student); // Refresh data
          alert("شكراً لك، تم تأكيد الاطلاع.");
      } catch (e) {
          alert("حدث خطأ.");
      } finally {
          setSubmittingReply(false);
      }
  };

  const handleSubmitReply = async () => {
      if (!replyMode || !replyContent.trim()) return;
      setSubmittingReply(true);
      try {
          if (replyMode.type === 'behavior') await acknowledgeBehavior(replyMode.id, replyContent);
          else await acknowledgeObservation(replyMode.id, replyContent);
          
          if(student) await fetchStudentData(student);
          setReplyMode(null);
          setReplyContent('');
          alert("تم إرسال ردك بنجاح.");
      } catch (e) {
          alert("حدث خطأ أثناء الإرسال.");
      } finally {
          setSubmittingReply(false);
      }
  };

  // --- UNEXCUSED ABSENCES LOGIC ---
  // Find dates where status is ABSENT but no request exists for that date
  const unexcusedDays = attendanceHistory.filter(att => {
      if (att.status !== AttendanceStatus.ABSENT) return false;
      // Check if a request exists for this date
      const hasRequest = history.some(req => req.date === att.date);
      return !hasRequest;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  // Helper styles
  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case RequestStatus.REJECTED: return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusText = (status: RequestStatus) => {
     switch (status) {
      case RequestStatus.APPROVED: return 'مقبول';
      case RequestStatus.REJECTED: return 'مرفوض';
      default: return 'قيد المراجعة';
    }
  };

  const getObsColor = (type: string) => {
    switch (type) {
      case 'academic': return 'border-l-4 border-l-blue-500 bg-white';
      case 'behavioral': return 'border-l-4 border-l-amber-500 bg-white';
      case 'positive': return 'border-l-4 border-l-emerald-500 bg-white';
      default: return 'border-l-4 border-l-slate-400 bg-white';
    }
  };

  const stats = {
      absent: attendanceHistory.filter(r => r.status === AttendanceStatus.ABSENT).length,
      late: attendanceHistory.filter(r => r.status === AttendanceStatus.LATE).length,
      present: attendanceHistory.filter(r => r.status === AttendanceStatus.PRESENT).length,
      excuses: history.length,
      violations: behaviorHistory.length
  };

  // Render Calendar Helper
  const renderCalendar = () => {
     const today = new Date();
     const days = [];
     for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const record = attendanceHistory.find(r => r.date === dateStr);
        let status = 'none'; 
        if (record) {
             if (record.status === AttendanceStatus.ABSENT) status = 'absent';
             if (record.status === AttendanceStatus.LATE) status = 'late';
             if (record.status === AttendanceStatus.PRESENT) status = 'present';
        }

        days.push({ date: dateStr, day: d.getDate(), dayName: d.toLocaleDateString('ar-SA', {weekday: 'short'}), status });
     }

     return (
        <div className="grid grid-cols-7 gap-3">
            {days.reverse().map((day, idx) => (
                <div key={idx} className={`p-3 rounded-xl text-center border transition-all ${
                    day.status === 'absent' ? 'bg-red-50 border-red-200 shadow-sm' :
                    day.status === 'late' ? 'bg-amber-50 border-amber-200 shadow-sm' :
                    day.status === 'present' ? 'bg-emerald-50 border-emerald-200 shadow-sm' :
                    'bg-slate-50 border-slate-100 opacity-60'
                }`}>
                    <span className="block text-xs text-slate-400 font-medium mb-1">{day.dayName}</span>
                    <span className={`block text-xl font-bold ${
                         day.status === 'absent' ? 'text-red-600' :
                         day.status === 'late' ? 'text-amber-600' :
                         day.status === 'present' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>{day.day}</span>
                </div>
            ))}
        </div>
     );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 no-print font-sans">
      
      {/* 1. Hero Search Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pb-24 pt-16 px-4 rounded-b-[3rem] shadow-xl relative overflow-hidden">
         {/* Abstract Shapes */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500 opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

         <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">بوابة ولي الأمر</h1>
            <p className="text-blue-100 text-lg font-light max-w-xl mx-auto leading-relaxed">
                منصة موحدة لمتابعة المسيرة التعليمية والسلوكية لابنك، بكل شفافية وسهولة.
            </p>
         </div>

         <div className="max-w-xl mx-auto relative z-20 -mb-32">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-3 ring-4 ring-white/20">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <div className="absolute right-5 text-slate-400">
                        <Search size={24} />
                    </div>
                    <input 
                        type="text"
                        placeholder="أدخل رقم الهوية (السجل المدني)..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                        maxLength={10}
                        className="w-full bg-transparent border-none outline-none py-4 pr-14 pl-36 text-xl font-bold text-slate-800 placeholder:text-slate-400 font-mono tracking-widest transition-all focus:placeholder:opacity-50"
                    />
                    <button 
                        type="submit"
                        disabled={loading || !searchId}
                        className="absolute left-2 top-2 bottom-2 bg-blue-900 text-white px-8 rounded-2xl font-bold hover:bg-blue-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <span>استعلام</span>}
                    </button>
                </form>
            </div>
            <div className="text-center mt-4 flex justify-center gap-6 text-white/70 text-xs font-medium">
               <span className="flex items-center gap-1"><ShieldAlert size={12}/> بيانات آمنة</span>
               <span className="flex items-center gap-1"><Clock size={12}/> تحديث فوري</span>
            </div>
         </div>
      </div>

      <div className="h-28"></div>

      <div className="max-w-5xl mx-auto px-4 animate-fade-in-up">
        
        {searched && !student && !loading && (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-300 shadow-sm max-w-lg mx-auto">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                   <User className="text-slate-300" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">لم يتم العثور على طالب</h3>
                <p className="text-slate-400">تأكد من صحة رقم الهوية والمحاولة مرة أخرى</p>
            </div>
        )}

        {student && (
            <div className="space-y-8">
                {/* Student Profile Card */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative group">
                    <div className="h-32 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50"></div>
                    <div className="px-8 pb-8 flex flex-col md:flex-row items-center md:items-end -mt-16 gap-6 text-center md:text-right relative z-10">
                        <div className="w-32 h-32 bg-white p-2 rounded-[2rem] shadow-lg">
                            <div className="w-full h-full bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                                <User size={48} />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 pb-2">
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{student.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium">
                                    <School size={16} className="text-blue-500"/> {student.grade} - {student.className}
                                </span>
                                <span 
                                    className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-100 transition-colors group/copy" 
                                    onClick={() => copyToClipboard(student.studentId)}
                                >
                                    <span className="font-mono tracking-wider">{student.studentId}</span>
                                    {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} className="text-slate-400 group-hover/copy:text-blue-500"/>}
                                </span>
                            </div>
                        </div>
                        
                        {/* Quick Action Button */}
                        <button 
                            onClick={() => navigate(`/submit?studentId=${student.studentId}`)} 
                            className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 text-sm"
                        >
                            <FileText size={18}/> تقديم عذر
                        </button>
                    </div>
                </div>

                {/* Modern Tabs */}
                <div className="flex justify-center md:justify-start gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'نظرة عامة', icon: Activity },
                        { id: 'attendance', label: 'التقويم', icon: CalendarDays },
                        { id: 'requests', label: 'أرشيف الأعذار', icon: History },
                        { id: 'behavior', label: 'السلوك', icon: ShieldAlert, count: behaviorHistory.length },
                        { id: 'observations', label: 'الملاحظات', icon: MessageSquare, count: observations.length },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border
                                ${activeTab === tab.id 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'}
                            `}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-amber-400' : 'text-slate-400'} />
                            {tab.label}
                            {tab.count && tab.count > 0 && (
                                <span className={`mr-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    
                    {/* 1. OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* KPI Cards */}
                            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="bg-red-50 p-4 rounded-2xl text-red-600">
                                        <AlertCircle size={32} />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">أيام الغياب</p>
                                        <p className="text-3xl font-extrabold text-slate-800">{stats.absent}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
                                        <Clock size={32} />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">أيام التأخر</p>
                                        <p className="text-3xl font-extrabold text-slate-800">{stats.late}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">أيام الحضور</p>
                                        <p className="text-3xl font-extrabold text-slate-800">{stats.present}</p>
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Unexcused Absences Alert Section */}
                            {unexcusedDays.length > 0 && (
                                <div className="lg:col-span-3 bg-red-50 border border-red-200 rounded-[2rem] p-6 shadow-sm animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-red-100 p-2 rounded-xl text-red-600"><FileWarning size={24}/></div>
                                        <h3 className="font-extrabold text-xl text-red-900">أيام غياب لم يقدم لها عذر</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unexcusedDays.map((att, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                                                        <CalendarDays size={20}/>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{att.date}</p>
                                                        <p className="text-[10px] text-red-500 font-bold uppercase">غياب بدون عذر</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => navigate(`/submit?studentId=${student.studentId}&date=${att.date}`)}
                                                    className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 flex items-center gap-1 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                                                >
                                                    <PlusCircle size={14}/> تقديم عذر
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Behavior Summary */}
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-2">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-red-50 p-2.5 rounded-xl text-red-600"><ShieldAlert size={20}/></div>
                                    <h3 className="font-bold text-lg text-slate-800">حالة السلوك والمواظبة</h3>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="text-center px-4 border-l border-slate-100">
                                        <span className={`block text-4xl font-extrabold ${stats.violations > 0 ? 'text-red-600' : 'text-emerald-500'}`}>{stats.violations}</span>
                                        <span className="text-xs text-slate-400 font-bold uppercase">مخالفات مسجلة</span>
                                    </div>
                                    <div className="flex-1">
                                        {behaviorHistory.length > 0 ? (
                                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-red-400 font-bold mb-1">آخر مخالفة مسجلة</p>
                                                    <p className="text-sm font-bold text-red-900">{behaviorHistory[0].violationName}</p>
                                                    <p className="text-xs text-red-700 mt-1">{behaviorHistory[0].date}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <Star size={24} className="text-emerald-500 fill-emerald-500" />
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-800">سجل سلوكي ممتاز</p>
                                                    <p className="text-xs text-emerald-600">لا يوجد أي مخالفات مسجلة.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Observations Summary */}
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-pink-50 p-2.5 rounded-xl text-pink-600"><MessageSquare size={20}/></div>
                                    <h3 className="font-bold text-lg text-slate-800">ملاحظات المعلمين</h3>
                                </div>
                                <div className="text-center mb-6">
                                    <span className="text-4xl font-extrabold text-slate-800">{observations.length}</span>
                                    <span className="block text-xs text-slate-400 font-bold uppercase mt-1">ملاحظة مسجلة</span>
                                </div>
                                {observations.length > 0 ? (
                                    <div className={`p-3 rounded-xl border-l-4 text-left ${getObsColor(observations[0].type)}`}>
                                        <p className="text-xs text-slate-400 font-bold mb-1">أحدث ملاحظة</p>
                                        <p className="text-sm text-slate-700 line-clamp-2 text-right">"{observations[0].content}"</p>
                                    </div>
                                ) : (
                                    <p className="text-center text-sm text-slate-400 italic">لا توجد ملاحظات حالياً</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. ATTENDANCE */}
                    {activeTab === 'attendance' && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in p-8">
                             <div className="flex justify-between items-center mb-8">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><CalendarDays size={20} /></div>
                                    التقويم المرئي (آخر 30 يوم)
                                </h3>
                                <div className="flex gap-4 text-xs font-bold">
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> حضور</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> غياب</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> تأخر</span>
                                </div>
                             </div>
                             {renderCalendar()}
                        </div>
                    )}

                    {/* 3. REQUESTS */}
                    {activeTab === 'requests' && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><History size={20}/></div>
                                <h3 className="font-bold text-lg text-slate-800">أرشيف الأعذار المقدمة</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {history.map(req => (
                                    <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 p-3 rounded-2xl text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base mb-1">{req.reason}</h4>
                                                <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/> {req.date}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${getStatusColor(req.status)}`}>{getStatusText(req.status)}</span>
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div className="p-12 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20"/>
                                        <p>لا يوجد أعذار مقدمة مسبقاً</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 4. BEHAVIOR (Timeline Style) */}
                    {activeTab === 'behavior' && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-3 bg-red-50/30">
                                <div className="bg-red-100 p-2 rounded-xl text-red-600"><ShieldAlert size={20}/></div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">سجل السلوك والمواظبة</h3>
                                    <p className="text-xs text-slate-500">المخالفات المرصودة والإجراءات المتخذة</p>
                                </div>
                            </div>

                            {behaviorHistory.length === 0 ? (
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Star size={40} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-emerald-700">سجل مثالي!</h3>
                                    <p className="text-slate-400 mt-2">لا يوجد أي مخالفات مسجلة على الطالب. شكراً لحسن التربية والمتابعة.</p>
                                </div>
                            ) : (
                                <div className="p-6 space-y-6 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute top-6 bottom-6 right-[27px] w-0.5 bg-slate-100 hidden md:block"></div>

                                    {behaviorHistory.map(rec => (
                                        <div key={rec.id} className="relative md:pr-10">
                                            {/* Timeline Dot */}
                                            <div className="absolute top-0 right-0 w-14 h-14 bg-white border-4 border-slate-50 rounded-full hidden md:flex items-center justify-center z-10">
                                                <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100"></div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">{rec.violationDegree}</span>
                                                            <span className="text-xs text-slate-400 font-mono">{rec.date}</span>
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-red-700 transition-colors">{rec.violationName}</h4>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-slate-50 p-3 rounded-xl border-l-4 border-red-400 text-sm text-slate-700 mb-4">
                                                    <span className="font-bold block text-xs text-slate-400 mb-1 uppercase">الإجراء المتخذ:</span>
                                                    {rec.actionTaken}
                                                </div>
                                                
                                                {/* Parent Interaction */}
                                                <div className="border-t border-slate-100 pt-3">
                                                    {rec.parentViewed ? (
                                                        <div className="flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl">
                                                            <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-bold text-emerald-800">تم الاطلاع من قبلكم</p>
                                                                <p className="text-[10px] text-emerald-600 mt-0.5">{new Date(rec.parentViewedAt!).toLocaleDateString('ar-SA', {day:'numeric', month:'long', hour:'numeric', minute:'numeric'})}</p>
                                                                {rec.parentFeedback && (
                                                                    <p className="text-xs text-slate-600 mt-2 italic">" {rec.parentFeedback} "</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-3">
                                                            <p className="text-xs text-slate-500 flex items-center gap-1"><AlertCircle size={12} className="text-amber-500"/> يرجى تأكيد الاطلاع على هذه المخالفة</p>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleAcknowledge('behavior', rec.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm">تأكيد الاطلاع</button>
                                                                <button onClick={() => setReplyMode({id: rec.id, type: 'behavior'})} className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">إضافة رد / ملاحظة</button>
                                                            </div>
                                                            {replyMode?.id === rec.id && replyMode.type === 'behavior' && (
                                                                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 animate-fade-in mt-2">
                                                                    <textarea 
                                                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white min-h-[80px]" 
                                                                        placeholder="اكتب ردك هنا..."
                                                                        value={replyContent}
                                                                        onChange={e => setReplyContent(e.target.value)}
                                                                    ></textarea>
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={() => setReplyMode(null)} className="text-xs text-slate-500 font-bold px-3 py-2 rounded-lg hover:bg-slate-200">إلغاء</button>
                                                                        <button onClick={handleSubmitReply} disabled={submittingReply} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">{submittingReply ? <Loader2 className="animate-spin" size={12}/> : <Send size={12}/>} إرسال الرد</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. OBSERVATIONS */}
                    {activeTab === 'observations' && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-3 bg-pink-50/30">
                                <div className="bg-pink-100 p-2 rounded-xl text-pink-600"><BookOpen size={20}/></div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">ملاحظات المعلمين</h3>
                                    <p className="text-xs text-slate-500">رسائل وتنبيهات من الكادر التعليمي</p>
                                </div>
                            </div>

                            {observations.length === 0 ? (
                                <div className="py-24 text-center text-slate-400">
                                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
                                    <p>لا توجد ملاحظات مسجلة حالياً</p>
                                </div>
                            ) : (
                                <div className="p-6 grid grid-cols-1 gap-4">
                                    {observations.map(obs => (
                                        <div key={obs.id} className="border border-slate-200 rounded-2xl p-5 relative overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                                            <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${
                                                obs.type === 'positive' ? 'bg-emerald-500' : 
                                                obs.type === 'behavioral' ? 'bg-amber-500' : 'bg-blue-500'
                                            }`}></div>
                                            
                                            <div className="flex items-center gap-3 mb-3 pl-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                                                    obs.type === 'positive' ? 'bg-emerald-500' : 
                                                    obs.type === 'behavioral' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`}>
                                                    {obs.staffName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{obs.staffName}</h4>
                                                    <p className="text-[10px] text-slate-400">{obs.date}</p>
                                                </div>
                                                <span className={`mr-auto px-2 py-1 rounded text-[10px] font-bold ${
                                                    obs.type === 'positive' ? 'bg-emerald-50 text-emerald-700' : 
                                                    obs.type === 'behavioral' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {obs.type === 'positive' ? 'تعزيز' : obs.type === 'behavioral' ? 'سلوكي' : 'عام'}
                                                </span>
                                            </div>

                                            <div className="relative pl-6 pr-2">
                                                <Quote size={16} className="absolute -top-1 right-0 text-slate-300 transform scale-x-[-1]" />
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{obs.content}</p>
                                            </div>
                                            
                                            {/* PARENT INTERACTION AREA */}
                                            <div className="mt-4 border-t border-slate-100 pt-3">
                                                {obs.parentViewed ? (
                                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-50 p-2 rounded-lg w-fit">
                                                        <CheckCircle size={14} className="text-blue-500" />
                                                        <span>تم الاطلاع {obs.parentFeedback ? 'والرد' : ''}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAcknowledge('observation', obs.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">تأكيد الاطلاع</button>
                                                            <button onClick={() => setReplyMode({id: obs.id, type: 'observation'})} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">رد</button>
                                                        </div>
                                                        {replyMode?.id === obs.id && replyMode.type === 'observation' && (
                                                            <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 animate-fade-in mt-2">
                                                                <textarea 
                                                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white min-h-[80px]" 
                                                                    placeholder="اكتب ردك هنا..."
                                                                    value={replyContent}
                                                                    onChange={e => setReplyContent(e.target.value)}
                                                                ></textarea>
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setReplyMode(null)} className="text-xs text-slate-500 font-bold px-3 py-2 rounded-lg hover:bg-slate-200">إلغاء</button>
                                                                    <button onClick={handleSubmitReply} disabled={submittingReply} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">{submittingReply ? <Loader2 className="animate-spin" size={12}/> : <Send size={12}/>} إرسال الرد</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Inquiry;