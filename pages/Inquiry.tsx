
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, School, Copy, Check, CalendarDays, AlertCircle, ArrowLeft, Loader2, PieChart, LayoutList, History, FileText, AlertTriangle, FileWarning } from 'lucide-react';
import { getStudentByCivilId, getRequestsByStudentId, getStudentAttendanceHistory, getBehaviorRecords } from '../services/storage';
import { Student, ExcuseRequest, RequestStatus, AttendanceStatus, BehaviorRecord } from '../types';

const Inquiry: React.FC = () => {
  const navigate = useNavigate();
  
  // Search State
  const [searchId, setSearchId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'requests' | 'behavior'>('overview');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<ExcuseRequest[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
  const [behaviorHistory, setBehaviorHistory] = useState<BehaviorRecord[]>([]);
  
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStudentData = async (targetStudent: Student) => {
    setLoading(true);
    try {
        setStudent(targetStudent);
        // 2. Get Requests, Attendance, and Behavior in parallel
        const [studentRequests, attHist, behHist] = await Promise.all([
            getRequestsByStudentId(targetStudent.studentId),
            getStudentAttendanceHistory(targetStudent.studentId, targetStudent.grade, targetStudent.className),
            getBehaviorRecords(targetStudent.studentId)
        ]);
        
        setHistory(studentRequests);
        setAttendanceHistory(attHist);
        setBehaviorHistory(behHist);
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

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED: return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case RequestStatus.REJECTED: return 'bg-red-100 text-red-700 border border-red-200';
      default: return 'bg-amber-100 text-amber-700 border border-amber-200';
    }
  };

  const getStatusText = (status: RequestStatus) => {
     switch (status) {
      case RequestStatus.APPROVED: return 'مقبول';
      case RequestStatus.REJECTED: return 'مرفوض';
      default: return 'قيد المراجعة';
    }
  };

  // --- Visual Calendar Logic ---
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
        <div className="grid grid-cols-7 gap-2">
            {days.reverse().map((day, idx) => (
                <div key={idx} className={`p-2 rounded-lg text-center border ${
                    day.status === 'absent' ? 'bg-red-50 border-red-200' :
                    day.status === 'late' ? 'bg-amber-50 border-amber-200' :
                    day.status === 'present' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-slate-50 border-slate-100 opacity-50'
                }`}>
                    <span className="block text-xs text-slate-400 mb-1">{day.dayName}</span>
                    <span className={`block text-lg font-bold ${
                         day.status === 'absent' ? 'text-red-700' :
                         day.status === 'late' ? 'text-amber-700' :
                         day.status === 'present' ? 'text-emerald-700' : 'text-slate-400'
                    }`}>{day.day}</span>
                </div>
            ))}
        </div>
     );
  };

  // Calculate Stats
  const stats = {
      absent: attendanceHistory.filter(r => r.status === AttendanceStatus.ABSENT).length,
      late: attendanceHistory.filter(r => r.status === AttendanceStatus.LATE).length,
      present: attendanceHistory.filter(r => r.status === AttendanceStatus.PRESENT).length,
      excuses: history.length,
      violations: behaviorHistory.length
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 no-print">
      
      {/* 1. Hero Search Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 pb-20 pt-12 px-4 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500 opacity-10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

         <div className="relative z-10 max-w-2xl mx-auto text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-white">بوابة ولي الأمر</h1>
            <p className="text-blue-200 text-sm">أدخل رقم هوية الطالب للاطلاع على سجل الحضور والأعذار والسلوك</p>
         </div>

         {/* Floating Search Bar */}
         <div className="max-w-xl mx-auto relative z-20 -mb-28">
            <div className="bg-white rounded-2xl shadow-xl border border-blue-50 p-2">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <div className="absolute right-4 text-slate-400">
                        <Search size={22} />
                    </div>
                    <input 
                        type="text"
                        placeholder="رقم الهوية (مثال: 10xxxxxxx)"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        // Limit to numbers
                        onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                        maxLength={10}
                        className="w-full bg-transparent border-none outline-none py-4 pr-12 pl-36 text-lg font-bold text-slate-800 placeholder:text-slate-300 font-mono tracking-widest"
                    />
                    <button 
                        type="submit"
                        disabled={loading || !searchId}
                        className="absolute left-2 top-2 bottom-2 bg-blue-900 text-white px-6 rounded-xl font-bold hover:bg-blue-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <span>استعلام</span>}
                    </button>
                </form>
            </div>
            <div className="text-center mt-3">
               <p className="text-xs text-white/60 font-medium">نظام آمن ومشفر 100%</p>
            </div>
         </div>
      </div>

      {/* Spacer for Floating Search */}
      <div className="h-24"></div>

      {/* 2. Results Section */}
      <div className="max-w-4xl mx-auto px-4 animate-fade-in-up">
        
        {searched && !student && !loading && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <User className="text-slate-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-700">لم يتم العثور على طالب</h3>
                <p className="text-slate-400 text-sm mt-1">تأكد من صحة رقم الهوية والمحاولة مرة أخرى</p>
            </div>
        )}

        {student && (
            <div className="space-y-6">
                {/* Student Profile Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                    <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-100"></div>
                    <div className="px-8 pb-8 flex flex-col md:flex-row items-center md:items-end -mt-12 gap-6 text-center md:text-right">
                        <div className="w-24 h-24 bg-white p-1.5 rounded-3xl shadow-md">
                            <div className="w-full h-full bg-blue-50 rounded-2xl flex items-center justify-center text-blue-900 border border-blue-100">
                                <User size={40} />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <School size={14} className="text-amber-500"/> {student.grade} - {student.className}
                                </span>
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100" onClick={() => copyToClipboard(student.studentId)}>
                                    <span className="font-mono">{student.studentId}</span>
                                    {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-red-600">{stats.absent}</span>
                                <span className="text-xs text-slate-400 font-bold uppercase">غياب</span>
                            </div>
                            <div className="w-px bg-slate-200 h-10"></div>
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-amber-500">{stats.late}</span>
                                <span className="text-xs text-slate-400 font-bold uppercase">تأخر</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex justify-center md:justify-start border-b border-slate-200 gap-6 px-4 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 text-sm font-bold transition-all whitespace-nowrap relative ${activeTab === 'overview' ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        نظرة عامة
                        {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-900 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`pb-3 text-sm font-bold transition-all whitespace-nowrap relative ${activeTab === 'attendance' ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        التقويم المرئي
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] mr-2">{attendanceHistory.length}</span>
                        {activeTab === 'attendance' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-900 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`pb-3 text-sm font-bold transition-all whitespace-nowrap relative ${activeTab === 'requests' ? 'text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        أرشيف الأعذار
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] mr-2">{history.length}</span>
                        {activeTab === 'requests' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-900 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('behavior')}
                        className={`pb-3 text-sm font-bold transition-all whitespace-nowrap relative ${activeTab === 'behavior' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        السلوك والمواظبة
                        {behaviorHistory.length > 0 && (
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] mr-2 font-bold">{behaviorHistory.length}</span>
                        )}
                        {activeTab === 'behavior' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                    
                    {/* 1. OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800">حالة الانضباط</h3>
                                        <p className="text-xs text-slate-400">ملخص العام الدراسي الحالي</p>
                                    </div>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                        <PieChart size={20} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <span className="text-sm font-bold text-slate-700">أيام الغياب</span>
                                        </div>
                                        <span className="text-lg font-bold text-slate-800">{stats.absent}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                            <span className="text-sm font-bold text-slate-700">أيام التأخر</span>
                                        </div>
                                        <span className="text-lg font-bold text-slate-800">{stats.late}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-sm font-bold text-slate-700">أيام الحضور</span>
                                        </div>
                                        <span className="text-lg font-bold text-slate-800">{stats.present}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">إجراءات سريعة</h3>
                                        <p className="text-xs text-slate-400">خدمات ولي الأمر</p>
                                    </div>
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                        <LayoutList size={20} />
                                    </div>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <button 
                                        onClick={() => navigate(`/submit?studentId=${student.studentId}`)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-2xl transition-all group border border-transparent hover:border-blue-100"
                                    >
                                        <span className="font-bold text-sm">تقديم عذر جديد</span>
                                        <ArrowLeft size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </button>
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-auto">
                                        <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                                            <AlertCircle size={14} /> تنبيه
                                        </p>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            يجب تقديم العذر خلال 7 أيام من تاريخ الغياب لتجنب احتسابه غياباً بدون عذر.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. ATTENDANCE TAB (VISUAL CALENDAR) */}
                    {activeTab === 'attendance' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in p-6">
                             <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <CalendarDays className="text-blue-500" size={20} />
                                        التقويم المرئي (آخر 30 يوم)
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">تتبع نمط الغياب الشهري</p>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> حاضر</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> غائب</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> متأخر</span>
                                </div>
                             </div>

                             {renderCalendar()}

                             <div className="mt-8 border-t border-slate-50 pt-6">
                                <h4 className="font-bold text-slate-700 text-sm mb-4">السجل التفصيلي:</h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {attendanceHistory.map((rec, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                            <span className="text-sm text-slate-600 font-mono">{rec.date}</span>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                                rec.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                                                rec.status === AttendanceStatus.LATE ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {rec.status === AttendanceStatus.ABSENT ? 'غائب' : rec.status === AttendanceStatus.LATE ? 'متأخر' : 'حاضر'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}

                    {/* 3. REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
                                <History className="text-slate-400" size={20} />
                                <h3 className="font-bold text-slate-800">أرشيف الأعذار المقدمة</h3>
                            </div>

                            {history.length === 0 ? (
                                <div className="py-16 text-center text-slate-400">
                                    <FileText className="mx-auto mb-2 opacity-30" size={48} />
                                    <p>لم يتم تقديم أي أعذار سابقاً</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {history.map(req => (
                                        <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{req.reason}</h4>
                                                        <p className="text-xs text-slate-400">{req.date}</p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                                                    {getStatusText(req.status)}
                                                </div>
                                            </div>
                                            {req.details && (
                                                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                                                    {req.details}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. BEHAVIOR TAB */}
                    {activeTab === 'behavior' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
                                <FileWarning className="text-red-500" size={20} />
                                <h3 className="font-bold text-slate-800">سجل السلوك والمواظبة</h3>
                            </div>

                            {behaviorHistory.length === 0 ? (
                                <div className="py-20 text-center text-emerald-600 bg-emerald-50/30 m-4 rounded-2xl border border-emerald-100 border-dashed">
                                    <Check className="mx-auto mb-2 opacity-50" size={48} />
                                    <p className="font-bold">سجل السلوك نظيف وممتاز</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    {behaviorHistory.map(rec => (
                                        <div key={rec.id} className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{rec.violationName}</h4>
                                                    <p className="text-xs text-slate-500">{rec.violationDegree} - مادة ({rec.articleNumber})</p>
                                                </div>
                                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-red-100 text-red-600">{rec.date}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-red-100 mt-2">
                                                <strong>الإجراء المتخذ:</strong> {rec.actionTaken}
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
