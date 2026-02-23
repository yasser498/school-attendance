
import React, { useMemo, useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import {
    FileText, Clock, CheckCircle, Sparkles, Calendar, AlertTriangle, Loader2, BrainCircuit,
    Search, Settings, Printer, BarChart2, Users, Trash2, ShieldAlert, Send, Megaphone, Activity, LayoutGrid, RefreshCw, Plus, UserCheck, CalendarCheck, Edit, GitCommit, List, Save, AlertCircle, Eye, ArrowRight, Gavel, Check, School, LogOut, MessageSquare, Bell, Upload, BookOpen
} from 'lucide-react';
import {
    getRequests, getStudents, getConsecutiveAbsences, resolveAbsenceAlert, getBehaviorRecords,
    sendAdminInsight, getAttendanceRecords, generateSmartContent,
    clearAttendance, clearRequests, clearStudents, clearBehaviorRecords, clearAdminInsights,
    clearReferrals, getSchoolNews, updateSchoolNews, addSchoolNews, deleteSchoolNews,
    getAvailableSlots, addAppointmentSlot, deleteAppointmentSlot, getDailyAppointments, getStaffUsers,
    getBotContext, saveBotContext, getExitPermissions, generateDefaultAppointmentSlots, updateAppointmentSlot,
    getStudentObservations, getReferrals, updateReferralStatus, getAdminInsights,
    sendBatchNotifications, generateTeacherAbsenceSummary, sendPendingReferralReminders,
    extractTextFromFile, getAllParentIds
} from '../../services/storage';
import { ExcuseRequest, Student, BehaviorRecord, AttendanceRecord, SchoolNews, Appointment, AppointmentSlot, StaffUser, ExitPermission, StudentObservation, Referral, AdminInsight } from '../../types';

const { useNavigate } = ReactRouterDOM as any;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    // Navigation & View State
    const [activeView, setActiveView] = useState<'overview' | 'tracking' | 'behavior' | 'appointments' | 'directives' | 'news' | 'notifications' | 'settings'>('overview');

    // Core Data
    const [requests, setRequests] = useState<ExcuseRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [observations, setObservations] = useState<StudentObservation[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [todaysExits, setTodaysExits] = useState<ExitPermission[]>([]);
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

    const [dataLoading, setDataLoading] = useState(true);

    // School Identity
    const [schoolName, setSchoolName] = useState(localStorage.getItem('school_name') || 'مدرسة عماد الدين زنكي المتوسطة');
    const [schoolLogo, setSchoolLogo] = useState(localStorage.getItem('school_logo') || 'https://www.raed.net/img?id=1471924');

    // Alerts & AI
    const [alerts, setAlerts] = useState<any[]>([]);
    const [aiBriefing, setAiBriefing] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Settings & Bot Context
    const [tempSchoolName, setTempSchoolName] = useState(schoolName);
    const [tempSchoolLogo, setTempSchoolLogo] = useState(schoolLogo);
    const [isDeleting, setIsDeleting] = useState(false);
    const [botContext, setBotContext] = useState('');
    const [isSavingContext, setIsSavingContext] = useState(false);
    const [fileProcessing, setFileProcessing] = useState(false);

    // Tracking
    const [trackingFilter, setTrackingFilter] = useState<'all' | 'pending' | 'resolved'>('all');

    // Appointments
    const [slots, setSlots] = useState<AppointmentSlot[]>([]);
    const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
    const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
    const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);

    // News
    const [newsList, setNewsList] = useState<SchoolNews[]>([]);
    const [newNewsTitle, setNewNewsTitle] = useState('');
    const [newNewsContent, setNewNewsContent] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    // Directives
    const [directiveContent, setDirectiveContent] = useState('');
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [sentDirectives, setSentDirectives] = useState<AdminInsight[]>([]);
    const [isSendingDirective, setIsSendingDirective] = useState(false);

    // Notifications Logic
    const [notifTargetGroup, setNotifTargetGroup] = useState<'global' | 'all_staff' | 'teachers' | 'admins'>('all_staff');
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [isSendingNotif, setIsSendingNotif] = useState(false);
    const [isTriggeringSmart, setIsTriggeringSmart] = useState(false);

    // Global Search
    const [globalSearch, setGlobalSearch] = useState('');

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const [reqs, studs, behaviors, atts, news, apps, obs, refs, risks, slts, exits, dirs, users, context] = await Promise.all([
                getRequests(),
                getStudents(),
                getBehaviorRecords(),
                getAttendanceRecords(),
                getSchoolNews(),
                getDailyAppointments(apptDate),
                getStudentObservations(),
                getReferrals(),
                getConsecutiveAbsences(),
                getAvailableSlots(apptDate),
                getExitPermissions(apptDate),
                getAdminInsights(),
                getStaffUsers(),
                getBotContext()
            ]);
            setRequests(reqs);
            setStudents(studs);
            setBehaviorRecords(behaviors);
            setAttendanceRecords(atts);
            setNewsList(news);
            setAppointmentsList(apps);
            setObservations(obs);
            setReferrals(refs);
            setAlerts(risks);
            setSlots(slts);
            setTodaysExits(exits);
            setSentDirectives(dirs);
            setStaffUsers(users);
            setBotContext(context);

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [apptDate]);

    // --- STATS LOGIC ---
    const stats = useMemo(() => {
        const todayStr = apptDate;
        const todaysAttendance = attendanceRecords.filter(r => r.date === todayStr);
        let present = 0, absent = 0, late = 0;
        todaysAttendance.forEach(record => record.records.forEach(stu => {
            if (stu.status === 'PRESENT') present++;
            else if (stu.status === 'ABSENT') absent++;
            else if (stu.status === 'LATE') late++;
        }));

        const todayViolations = behaviorRecords.filter(r => r.date === todayStr).length;
        const todayExits = todaysExits.length;
        const todayVisits = appointmentsList.filter(a => a.status === 'completed').length;

        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'PENDING').length,
            studentsCount: students.length,
            present, absent, late,
            todayViolations,
            todayExits,
            todayVisits
        };
    }, [requests, students, attendanceRecords, behaviorRecords, todaysExits, appointmentsList, apptDate]);

    // --- HANDLERS ---
    const handleSaveSettings = () => {
        localStorage.setItem('school_name', tempSchoolName);
        localStorage.setItem('school_logo', tempSchoolLogo);
        setSchoolName(tempSchoolName);
        setSchoolLogo(tempSchoolLogo);
        alert("تم حفظ الإعدادات بنجاح! سيتم تحديث النظام.");
        window.location.reload();
    };

    const handleSaveBotContext = async () => {
        setIsSavingContext(true);
        try {
            await saveBotContext(botContext);
            alert("تم تحديث قاعدة المعرفة بنجاح.");
        } catch (e) {
            alert("حدث خطأ أثناء الحفظ.");
        } finally {
            setIsSavingContext(false);
        }
    };

    const handleFileFeed = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert("حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.");
            return;
        }

        setFileProcessing(true);
        try {
            // Use the new helper function in storage.ts
            const extractedText = await extractTextFromFile(file);

            if (!extractedText || extractedText.length < 5) {
                alert("لم يتم العثور على نص واضح في الملف.");
            } else {
                setBotContext(prev => {
                    const header = `\n\n--- محتوى مستخرج من ملف: ${file.name} ---\n`;
                    return prev + header + extractedText;
                });
                alert("تم استخراج النص وإضافته إلى المحرر. يرجى المراجعة ثم الحفظ.");
            }
        } catch (error: any) {
            console.error(error);
            alert(`فشل تحليل الملف: ${error.message}`);
        } finally {
            setFileProcessing(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleClearData = async (target: 'requests' | 'attendance' | 'behavior' | 'students' | 'referrals' | 'all') => {
        if (!window.confirm("تحذير: هذا الإجراء سيحذف البيانات نهائياً. هل أنت متأكد؟")) return;
        setIsDeleting(true);
        try {
            if (target === 'requests') await clearRequests();
            if (target === 'attendance') await clearAttendance();
            if (target === 'behavior') await clearBehaviorRecords();
            if (target === 'referrals') await clearReferrals();
            if (target === 'students') await clearStudents();
            if (target === 'all') {
                await Promise.all([clearRequests(), clearAttendance(), clearBehaviorRecords(), clearReferrals(), clearStudents()]);
            }
            alert("تم الحذف بنجاح.");
            fetchData();
        } catch (e) { alert("حدث خطأ"); } finally { setIsDeleting(false); }
    };

    const handleGenerateBriefing = async () => {
        setIsGenerating(true);
        try {
            const prompt = `بصفتك مدير مدرسة، حلل التالي ليوم ${apptDate}:
          - الغياب: ${stats.absent}
          - التأخر: ${stats.late}
          - المخالفات: ${stats.todayViolations}
          - الخروج (الاستئذان): ${stats.todayExits}
          - الزوار: ${stats.todayVisits}
          
          أعط ملخصاً تنفيذياً وتوجيهاً واحداً.`;
            const res = await generateSmartContent(prompt);
            setAiBriefing(res);
        } catch (e) { alert("خطأ"); } finally { setIsGenerating(false); }
    };

    // --- APPOINTMENTS HANDLERS ---
    const handleGenerateSlots = async () => {
        setIsGeneratingSlots(true);
        try {
            await generateDefaultAppointmentSlots(apptDate);
            await fetchData();
            alert("تم توليد المواعيد (8:00 - 11:00) بنجاح.");
        } catch (e) { alert("فشل التوليد، ربما المواعيد موجودة مسبقاً."); } finally { setIsGeneratingSlots(false); }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!confirm("حذف الموعد؟")) return;
        await deleteAppointmentSlot(id);
        fetchData();
    };

    // --- NEWS HANDLERS ---
    const handleAddNews = async () => {
        if (!newNewsTitle || !newNewsContent) return;
        try {
            await addSchoolNews({
                title: newNewsTitle,
                content: newNewsContent,
                author: 'الإدارة المدرسية',
                isUrgent
            });
            setNewNewsTitle(''); setNewNewsContent(''); setIsUrgent(false);
            fetchData();
            alert("تم النشر بنجاح");
        } catch (e) { alert("خطأ"); }
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm("حذف الخبر؟")) return;
        await deleteSchoolNews(id);
        fetchData();
    };

    // --- DIRECTIVES HANDLERS ---
    const handleSendDirective = async () => {
        if (!directiveContent || selectedTargets.length === 0) {
            alert("الرجاء كتابة التوجيه وتحديد المستهدفين.");
            return;
        }
        setIsSendingDirective(true);
        try {
            // Send to each target
            for (const target of selectedTargets) {
                await sendAdminInsight(target as any, directiveContent);
            }
            alert("تم إرسال التوجيه بنجاح.");
            setDirectiveContent('');
            setSelectedTargets([]);
            fetchData();
        } catch (e) { alert("فشل الإرسال"); } finally { setIsSendingDirective(false); }
    };

    const toggleTarget = (target: string) => {
        if (selectedTargets.includes(target)) setSelectedTargets(prev => prev.filter(t => t !== target));
        else setSelectedTargets(prev => [...prev, target]);
    };

    const improveDirective = async () => {
        if (!directiveContent) return;
        try {
            const res = await generateSmartContent(`حسن صياغة هذا التوجيه الإداري ليكون رسمياً وواضحاً: "${directiveContent}"`);
            setDirectiveContent(res.trim());
        } catch (e) { alert("فشل التحسين"); }
    };

    // --- NOTIFICATIONS HANDLERS ---
    const handleSendCustomNotification = async () => {
        if (!notifTitle || !notifMessage) {
            alert("يرجى تعبئة العنوان والرسالة.");
            return;
        }
        setIsSendingNotif(true);
        try {
            let targetIds: string[] = [];

            if (notifTargetGroup === 'global') {
                // 1. Get All Staff IDs
                const staffIds = staffUsers.map(u => u.id);
                // 2. Get All Parent IDs
                const parentIds = await getAllParentIds();
                // 3. Combine
                targetIds = [...staffIds, ...parentIds];
            } else if (notifTargetGroup === 'all_staff') {
                targetIds = staffUsers.map(u => u.id);
            } else if (notifTargetGroup === 'teachers') {
                targetIds = staffUsers.filter(u => !u.permissions?.includes('students') && !u.permissions?.includes('deputy')).map(u => u.id);
            } else if (notifTargetGroup === 'admins') {
                targetIds = staffUsers.filter(u => u.permissions?.includes('students') || u.permissions?.includes('deputy')).map(u => u.id);
            }

            if (targetIds.length === 0) {
                alert("لا يوجد مستخدمين في الفئة المستهدفة.");
                return;
            }

            await sendBatchNotifications(targetIds, 'info', notifTitle, notifMessage);

            const targetLabel = notifTargetGroup === 'global' ? 'لجميع المستخدمين (أولياء أمور وموظفين)' : `لـ ${targetIds.length} مستخدم`;
            alert(`تم إرسال الإشعار بنجاح ${targetLabel}.`);

            setNotifTitle(''); setNotifMessage('');
        } catch (e) {
            console.error(e);
            alert("فشل الإرسال.");
        } finally {
            setIsSendingNotif(false);
        }
    };

    const handleTriggerSummary = async () => {
        setIsTriggeringSmart(true);
        try {
            const result = await generateTeacherAbsenceSummary();
            alert(result.message);
        } catch (e) { alert("حدث خطأ."); } finally { setIsTriggeringSmart(false); }
    };

    const handleTriggerReferralReminder = async () => {
        setIsTriggeringSmart(true);
        try {
            const result = await sendPendingReferralReminders();
            alert(result.message);
        } catch (e) { alert("حدث خطأ."); } finally { setIsTriggeringSmart(false); }
    };

    // --- RENDERERS ---
    // --- RENDERERS ---
    const StatCard = ({ title, value, icon: Icon, color, bgGradient }: any) => (
        <div className={`relative p-6 rounded-[2.5rem] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 bg-white`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${bgGradient} rounded-bl-full opacity-20 -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110`}></div>
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-slate-500 text-xs font-extrabold uppercase tracking-widest mb-2">{title}</p>
                    <h3 className={`text-4xl font-black ${color} tracking-tight`}>{value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${bgGradient} group-hover:scale-110 transition-transform shadow-inner`}>
                    <Icon size={28} className={color} strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-24 relative font-sans">

            {/* 1. PREMIUM HEADER */}
            <header className="bg-white/80 backdrop-blur-xl relative z-40 border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-6 rounded-[2rem] mx-2 mt-2">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-500/30">
                        <LayoutGrid size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">مركز القيادة</h1>
                        <p className="text-xs text-slate-500 font-bold tracking-wide uppercase mt-0.5 flex items-center gap-1.5"><Sparkles size={12} className="text-amber-500" /> لوحة التحكم المركزية</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                    <div className="relative group w-full sm:w-auto">
                        <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10 pointer-events-none" />
                        <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl pl-4 pr-11 py-3 text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all cursor-pointer" />
                    </div>
                    <div className="relative w-full sm:w-72 group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input type="text" placeholder="بحث شامل..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full pr-12 pl-4 py-3 bg-slate-100/50 border border-slate-200/60 rounded-2xl outline-none font-bold text-slate-700 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-inner" />
                    </div>
                </div>
            </header>

            {/* 2. MODERN TABS */}
            <div className="px-2 flex overflow-x-auto pb-4 gap-3 scrollbar-hide snap-x">
                {[
                    { id: 'overview', label: 'المتابعة اليومية', icon: Activity, color: 'blue' },
                    { id: 'tracking', label: 'الإحالات', icon: GitCommit, color: 'indigo' },
                    { id: 'appointments', label: 'المواعيد والأمن', icon: CalendarCheck, color: 'teal' },
                    { id: 'directives', label: 'التوجيهات', icon: Megaphone, color: 'purple' },
                    { id: 'notifications', label: 'الإشعارات', icon: Bell, color: 'rose' },
                    { id: 'news', label: 'المركز الإعلامي', icon: FileText, color: 'amber' },
                    { id: 'settings', label: 'الإعدادات', icon: Settings, color: 'slate' },
                ].map(tab => {
                    const isActive = activeView === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`
                          snap-start flex flex-col items-center gap-2 px-6 py-4 rounded-[2rem] text-sm font-bold transition-all whitespace-nowrap border-2 relative overflow-hidden group min-w-[120px]
                          ${isActive ? `bg-gradient-to-b from-white to-slate-50 border-${tab.color}-500 shadow-lg shadow-${tab.color}-500/20 text-${tab.color}-700 transform scale-[1.02]` : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 shadow-sm'}
                      `}
                        >
                            {isActive && <div className={`absolute top-0 left-0 w-full h-1.5 bg-${tab.color}-500`}></div>}
                            <div className={`p-3 rounded-2xl mb-1 ${isActive ? `bg-${tab.color}-100 text-${tab.color}-600` : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'} transition-colors`}>
                                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* === OVERVIEW (DAILY PULSE) === */}
            {activeView === 'overview' && (
                <div className="px-2 space-y-8 animate-fade-in-up">
                    {/* Premium AI Insight */}
                    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl border border-slate-700/50 isolate">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f172a] to-[#0f172a]"></div>
                        <div className="absolute top-0 left-0 -z-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-screen opacity-50 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                    <BrainCircuit size={32} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black flex items-center gap-2">ملخص القيادة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">الذكي</span></h2>
                                    <p className="text-slate-400 text-sm mt-1 font-medium">تحليل فوري لبيانات المدرسة مبني على الذكاء الاصطناعي ({apptDate})</p>
                                </div>
                            </div>
                            <button onClick={handleGenerateBriefing} disabled={isGenerating} className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl">
                                {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <><Sparkles size={18} className="text-amber-500" /> توليد التقرير</>}
                            </button>
                        </div>
                        {aiBriefing && (
                            <div className="mt-8 bg-white/5 backdrop-blur-sm p-6 rounded-2xl text-sm whitespace-pre-line leading-relaxed border border-white/10 text-slate-200 font-medium animate-fade-in">
                                {aiBriefing}
                            </div>
                        )}
                    </div>

                    {/* Vital Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="حضور اليوم" value={stats.present} icon={UserCheck} color="text-emerald-600" bgGradient="bg-emerald-50" />
                        <StatCard title="غياب اليوم" value={stats.absent} icon={UserCheck} color="text-rose-600" bgGradient="bg-rose-50" />
                        <StatCard title="تأخر اليوم" value={stats.late} icon={Clock} color="text-amber-600" bgGradient="bg-amber-50" />
                        <StatCard title="خروج (استئذان)" value={stats.todayExits} icon={LogOut} color="text-orange-600" bgGradient="bg-orange-50" />
                        <StatCard title="زوار اليوم" value={stats.todayVisits} icon={Users} color="text-blue-600" bgGradient="bg-blue-50" />
                        <StatCard title="مخالفات مرصودة" value={stats.todayViolations} icon={ShieldAlert} color="text-purple-600" bgGradient="bg-purple-50" />
                        <StatCard title="طلبات أعذار" value={stats.pending} icon={MessageSquare} color="text-indigo-600" bgGradient="bg-indigo-50" />
                        <StatCard title="مؤشر الخطر" value={alerts.length} icon={AlertTriangle} color="text-red-700" bgGradient="bg-red-50" />
                    </div>

                    {/* Live Feeds Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Latest Violations */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[28rem] flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                <div className="bg-white w-10 h-10 rounded-xl shadow-sm flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform"><ShieldAlert size={20} /></div>
                                <h3 className="font-extrabold text-slate-800 text-lg">أحدث المخالفات</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {behaviorRecords.filter(r => r.date === apptDate).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <ShieldAlert size={48} strokeWidth={1} className="mb-4" />
                                        <p className="text-sm font-bold">سجل نظيف لهذا اليوم</p>
                                    </div>
                                ) :
                                    behaviorRecords.filter(r => r.date === apptDate).slice(0, 10).map((rec, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-rose-200 hover:shadow-md transition-all group/item">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-slate-800 text-sm group-hover/item:text-rose-700 transition-colors line-clamp-1 truncate ml-2">{rec.studentName}</span>
                                                <span className="text-[10px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md font-bold whitespace-nowrap shrink-0 border border-rose-100/50">{rec.violationDegree}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-2 rounded-lg">{rec.violationName}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Latest Exits */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[28rem] flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                <div className="bg-white w-10 h-10 rounded-xl shadow-sm flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform"><LogOut size={20} /></div>
                                <h3 className="font-extrabold text-slate-800 text-lg">حركة الاستئذان</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {todaysExits.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <LogOut size={48} strokeWidth={1} className="mb-4" />
                                        <p className="text-sm font-bold">لا توجد حركات خروج مسجلة</p>
                                    </div>
                                ) :
                                    todaysExits.map((ex, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all flex justify-between items-center group/item">
                                            <div className="flex-1 min-w-0 ml-3">
                                                <p className="font-bold text-slate-800 text-sm truncate group-hover/item:text-orange-700 transition-colors">{ex.studentName}</p>
                                                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{ex.reason}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 shrink-0 rounded-md border ${ex.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-inner shadow-emerald-500/10' : 'bg-amber-50 text-amber-600 border-amber-200/50 shadow-inner shadow-amber-500/10'}`}>
                                                {ex.status === 'completed' ? 'تم الخروج' : 'في الانتظار'}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Latest Visitors */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[28rem] flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                <div className="bg-white w-10 h-10 rounded-xl shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Users size={20} /></div>
                                <h3 className="font-extrabold text-slate-800 text-lg">سجل الزوار اليوم</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {appointmentsList.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <Users size={48} strokeWidth={1} className="mb-4" />
                                        <p className="text-sm font-bold">لم يسجل حضور زوار اليوم</p>
                                    </div>
                                ) :
                                    appointmentsList.map((app, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group/item">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-slate-800 text-sm group-hover/item:text-blue-700 transition-colors truncate ml-2">{app.parentName}</span>
                                                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md shrink-0">{app.slot?.startTime}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-lg">
                                                <UserCheck size={12} className="text-slate-400" />
                                                <p className="text-xs text-slate-600 font-medium truncate">ولي أمر: {app.studentName}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === APPOINTMENTS & SECURITY === */}
            {activeView === 'appointments' && (
                <div className="px-2 space-y-8 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Slots Management */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-teal-50 w-12 h-12 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100/50 shadow-inner"><CalendarCheck size={24} /></div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">إدارة المواعيد</h3>
                                        <p className="text-xs text-slate-500 font-bold mt-0.5">جدول اليوم: {apptDate}</p>
                                    </div>
                                </div>
                                <button onClick={handleGenerateSlots} disabled={isGeneratingSlots} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20 active:scale-95 transition-all w-full md:w-auto justify-center">
                                    {isGeneratingSlots ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus size={18} strokeWidth={2.5} />}
                                    توليد المواعيد (8-11)
                                </button>
                            </div>
                            <div className="space-y-3 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2">
                                {slots.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 opacity-80 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <CalendarCheck size={32} strokeWidth={1.5} className="mb-3" />
                                        <p className="text-sm font-bold">لم يتم إنشاء مواعيد لهذا اليوم</p>
                                    </div>
                                ) :
                                    slots.map(slot => (
                                        <div key={slot.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100/50 flex items-center gap-1.5"><Clock size={14} className="text-teal-500" /> {slot.startTime} - {slot.endTime}</span>
                                                <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded-md">حجوزات: <span className="text-slate-800">{slot.currentBookings} / {slot.maxCapacity}</span></span>
                                            </div>
                                            <button onClick={() => handleDeleteSlot(slot.id)} className="text-rose-400 hover:text-white bg-white hover:bg-rose-500 p-2.5 rounded-xl border border-rose-100 shadow-sm transition-all sm:self-auto self-end"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Today's Visitors */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50 shadow-inner"><Users size={24} /></div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">قائمة الزوار للمراجعة</h3>
                                    <p className="text-xs text-slate-500 font-bold mt-0.5">سجل الحضور اليومي</p>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2">
                                {appointmentsList.length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 opacity-80 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Users size={32} strokeWidth={1.5} className="mb-3" />
                                        <p className="text-sm font-bold">لا توجد حجوزات نشطة اليوم</p>
                                    </div>
                                ) :
                                    appointmentsList.map(app => (
                                        <div key={app.id} className="p-5 bg-white rounded-2xl border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                                            <div className="flex justify-between items-start pr-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-base">{app.parentName}</h4>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5"><UserCheck size={14} className="text-emerald-500" /> ابن: {app.studentName}</p>
                                                        <p className="text-xs text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md">{app.visitReason}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="font-mono text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md font-bold text-sm border border-emerald-100 flex items-center gap-1.5"><Clock size={12} /> {app.slot?.startTime}</span>
                                                    <span className={`text-[10px] px-3 py-1.5 rounded-lg font-bold w-full text-center border ${app.status === 'completed' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                        {app.status === 'completed' ? 'تم الدخول' : 'في الانتظار'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === DIRECTIVES === */}
            {/* === DIRECTIVES === */}
            {
                activeView === 'directives' && (
                    <div className="px-2 space-y-8 animate-fade-in-up">
                        <div className="bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl border border-slate-700/50 isolate">
                            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/40 via-[#0f172a] to-[#0f172a]"></div>
                            <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl mix-blend-screen opacity-50 translate-x-1/2 -translate-y-1/2"></div>

                            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                                <div className="bg-white/10 p-3 rounded-2xl border border-white/20 shadow-inner">
                                    <Megaphone className="text-purple-400" size={28} />
                                </div>
                                إرسال توجيه إداري
                            </h2>

                            <div className="flex flex-wrap gap-4 mb-6">
                                {[{ id: 'teachers', label: 'المعلمين' }, { id: 'deputy', label: 'الوكيل' }, { id: 'counselor', label: 'الموجه الطلابي' }].map(role => (
                                    <button key={role.id} onClick={() => toggleTarget(role.id)} className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${selectedTargets.includes(role.id) ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
                                        {role.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative mb-6">
                                <textarea value={directiveContent} onChange={e => setDirectiveContent(e.target.value)} className="w-full p-5 bg-[#1e293b]/50 border border-slate-600 rounded-2xl min-h-[160px] outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-200 placeholder-slate-400 font-medium transition-all" placeholder="اكتب نص التوجيه هنا..."></textarea>
                                <button onClick={improveDirective} className="absolute bottom-5 left-5 text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-purple-300 hover:text-purple-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><BrainCircuit size={16} /> تحسين الصياغة ذكياً</button>
                            </div>

                            <button onClick={handleSendDirective} disabled={isSendingDirective} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-purple-600/30">
                                {isSendingDirective ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                إرسال التوجيه الآن
                            </button>
                        </div>

                        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <h3 className="font-extrabold text-slate-800 text-xl mb-6">سجل التوجيهات المرسلة</h3>
                            <div className="space-y-4">
                                {sentDirectives.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Megaphone size={40} strokeWidth={1} className="mb-4 opacity-50" />
                                        <p className="font-bold">لا يوجد توجيهات سابقة</p>
                                    </div>
                                ) :
                                    sentDirectives.map(d => (
                                        <div key={d.id} className="p-5 bg-white rounded-2xl border border-slate-100 flex justify-between items-start shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl mb-3">{d.content}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-[11px] bg-slate-100 border border-slate-200 px-3 py-1 rounded-md text-slate-500 font-mono font-bold">{new Date(d.createdAt).toLocaleDateString('ar-SA')}</span>
                                                    <span className="text-[11px] bg-purple-50 border border-purple-100/50 text-purple-700 px-3 py-1 rounded-md font-bold">{d.targetRole === 'teachers' ? 'المعلمين' : d.targetRole === 'deputy' ? 'الوكيل' : 'الموجه'}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => clearAdminInsights().then(fetchData)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 ml-4"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === NOTIFICATIONS === */}
            {
                activeView === 'notifications' && (
                    <div className="px-2 space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Custom Message Composer */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                                <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner">
                                        <Bell size={24} />
                                    </div>
                                    إرسال إشعار فوري
                                </h2>

                                <div className="space-y-5 flex-1 flex flex-col">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">الفئة المستهدفة</label>
                                        <div className="flex bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-100 shadow-inner">
                                            {[
                                                { id: 'global', label: 'الجميع (عام)' },
                                                { id: 'all_staff', label: 'الموظفين' },
                                                { id: 'teachers', label: 'المعلمين' },
                                                { id: 'admins', label: 'الإداريين' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setNotifTargetGroup(opt.id as any)}
                                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${notifTargetGroup === opt.id ? 'bg-white shadow-sm text-blue-700 border border-slate-200/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">عنوان الإشعار</label>
                                        <input
                                            value={notifTitle}
                                            onChange={e => setNotifTitle(e.target.value)}
                                            className="w-full p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all focus:bg-white"
                                            placeholder="مثال: اجتماع طارئ"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">نص الرسالة</label>
                                        <textarea
                                            value={notifMessage}
                                            onChange={e => setNotifMessage(e.target.value)}
                                            className="w-full h-full min-h-[120px] p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all leading-relaxed focus:bg-white resize-none"
                                            placeholder="اكتب الرسالة المفضلة هنا..."
                                        ></textarea>
                                    </div>

                                    <button
                                        onClick={handleSendCustomNotification}
                                        disabled={isSendingNotif}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-4"
                                    >
                                        {isSendingNotif ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={20} />}
                                        تأكيد الإرسال
                                    </button>
                                </div>
                            </div>

                            {/* Smart Triggers */}
                            <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl border border-slate-700/50 isolate flex flex-col group">
                                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f172a] to-[#0f172a]"></div>
                                <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl mix-blend-screen opacity-50 translate-x-1/2 -translate-y-1/2"></div>

                                <h2 className="text-xl font-extrabold mb-6 flex items-center gap-3">
                                    <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-400 border border-white/20 shadow-inner">
                                        <Sparkles size={24} />
                                    </div>
                                    التنبيهات الذكية
                                </h2>

                                <div className="space-y-5 flex-1">
                                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-indigo-400/30 hover:bg-white/10 transition-colors group/item">
                                        <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2 text-base"><UserCheck size={18} /> ملخص غياب المعلمين</h3>
                                        <p className="text-xs text-slate-300 mb-4 leading-relaxed opacity-80 group-hover/item:opacity-100 transition-opacity">يقوم النظام بتحليل غياب วัน وإرسال رسالة شاملة لكل معلم بعدد الطلاب الغائبين في فصوله لتسوية الحضور.</p>
                                        <button
                                            onClick={handleTriggerSummary}
                                            disabled={isTriggeringSmart}
                                            className="w-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 py-3 rounded-xl text-xs font-bold hover:bg-indigo-500/40 transition-all active:scale-95"
                                        >
                                            {isTriggeringSmart ? 'جاري التحليل والتنفيذ...' : 'تشغيل وإرسال الملخص الآن'}
                                        </button>
                                    </div>

                                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-amber-400/30 hover:bg-white/10 transition-colors group/item">
                                        <h3 className="font-bold text-amber-300 mb-2 flex items-center gap-2 text-base"><AlertCircle size={18} /> تذكير بالإحالات المعلقة</h3>
                                        <p className="text-xs text-slate-300 mb-4 leading-relaxed opacity-80 group-hover/item:opacity-100 transition-opacity">تنبيه ذكي للموجه الطلابي ووكيل الشؤون بوجود حالات مسجلة تتطلب المراجعة النهائية واتخاذ إجراء فوري.</p>
                                        <button
                                            onClick={handleTriggerReferralReminder}
                                            disabled={isTriggeringSmart}
                                            className="w-full bg-amber-500/20 text-amber-200 border border-amber-500/30 py-3 rounded-xl text-xs font-bold hover:bg-amber-500/40 transition-all active:scale-95"
                                        >
                                            {isTriggeringSmart ? 'جاري التحليل والتنفيذ...' : 'إرسال التذكيرات للمعنيين'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === NEWS (MEDIA CENTER) === */}
            {
                activeView === 'news' && (
                    <div className="px-2 space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Add News Form */}
                            <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative overflow-hidden isolate flex flex-col group text-white">
                                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0f172a] to-[#0f172a]"></div>
                                <h2 className="text-xl font-extrabold mb-6 flex items-center gap-3">
                                    <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 border border-white/20 shadow-inner">
                                        <FileText size={24} />
                                    </div>
                                    نشر خبر جديد
                                </h2>
                                <div className="space-y-5 flex-1 flex flex-col">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">عنوان الخبر</label>
                                        <input value={newNewsTitle} onChange={e => setNewNewsTitle(e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all text-white placeholder-slate-500" placeholder="اكتب العنوان هنا..." />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">تفاصيل الخبر</label>
                                        <textarea value={newNewsContent} onChange={e => setNewNewsContent(e.target.value)} className="w-full h-full min-h-[140px] p-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all text-white placeholder-slate-500 resize-none leading-relaxed" placeholder="اكتب التفاصيل الكافية..."></textarea>
                                    </div>
                                    <div className="flex items-center gap-3 cursor-pointer bg-white/5 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors" onClick={() => setIsUrgent(!isUrgent)}>
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isUrgent ? 'bg-rose-500 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-transparent border-white/20'}`}>
                                            {isUrgent && <Check size={14} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-200">تصنيف كـ خبر عاجل / هام</span>
                                    </div>
                                    <button onClick={handleAddNews} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
                                        <Send size={18} /> نشر الخبر الآن
                                    </button>
                                </div>
                            </div>

                            {/* News List */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
                                <h3 className="font-extrabold text-slate-800 text-xl mb-6">الأخبار المنشورة على اللوحة</h3>
                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {newsList.map(n => (
                                            <div key={n.id} className="p-5 bg-white rounded-2xl border border-slate-100 relative group hover:shadow-md hover:border-blue-200 transition-all">
                                                <button onClick={() => handleDeleteNews(n.id)} className="absolute top-5 left-5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"><Trash2 size={18} /></button>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className={`text-[11px] px-3 py-1 rounded-md font-bold tracking-wide ${n.isUrgent ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 'bg-blue-50 text-blue-600 border border-blue-100/50'}`}>{n.isUrgent ? 'عـــاجل' : 'عـــام'}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono font-bold bg-slate-50 px-2 py-1 rounded-md">{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-base mb-2 pr-2 leading-tight">{n.title}</h4>
                                                <p className="text-sm text-slate-500 leading-relaxed pr-2 bg-slate-50 p-3 rounded-xl">{n.content}</p>
                                            </div>
                                        ))}
                                        {newsList.length === 0 && <div className="col-span-2 py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"><FileText size={40} strokeWidth={1.5} className="mb-4 text-slate-300" /><p className="font-bold">لا يوجد أخبار منشورة</p></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === SETTINGS: SCHOOL INFO & BOT KNOWLEDGE BASE === */}
            {
                activeView === 'settings' && (
                    <div className="max-w-4xl mx-auto px-2 md:px-6 space-y-8 animate-fade-in-up pb-10">
                        {/* School Basic Info */}
                        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <h2 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
                                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner">
                                    <School size={24} />
                                </div>
                                إعدادات النظام العامة
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">اسم المؤسسة التعليمية</label>
                                    <input value={tempSchoolName} onChange={e => setTempSchoolName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200/60 rounded-2xl font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all focus:bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">رابط هوية / شعار المدرسة (URL)</label>
                                    <input value={tempSchoolLogo} onChange={e => setTempSchoolLogo(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm font-mono text-slate-600 dir-ltr focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all focus:bg-white" />
                                </div>
                                <button onClick={handleSaveSettings} className="w-full sm:w-[50%] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98]"><Save size={20} /> حفظ بيانات المؤسسة</button>
                            </div>
                        </div>

                        {/* Bot Knowledge Base */}
                        <div className="bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl border border-slate-700/50 isolate">
                            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0f172a] to-[#0f172a]"></div>
                            <div className="absolute top-0 left-0 -z-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl mix-blend-screen opacity-50 -translate-x-1/2 -translate-y-1/2"></div>

                            <h2 className="text-xl font-extrabold mb-4 flex items-center gap-3">
                                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/20 shadow-inner">
                                    <BrainCircuit size={24} />
                                </div>
                                تغذية الدماغ (قاعدة المعرفة)
                            </h2>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
                                قم بتزويد الذكاء الاصطناعي باللوائح والقوانين ليكون قادراً على الإجابة بشكل دقيق.
                            </p>

                            <div className="space-y-6 relative z-10 w-full h-full">
                                {/* File Uploader */}
                                <div className="border-2 border-dashed border-indigo-500/30 rounded-3xl p-8 text-center hover:bg-indigo-500/10 transition-colors group relative cursor-pointer overflow-hidden backdrop-blur-sm">
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                                        onChange={handleFileFeed}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={fileProcessing}
                                    />
                                    <div className="flex flex-col items-center gap-4 text-indigo-300 relative z-20 pointer-events-none">
                                        <div className="bg-indigo-500/10 p-5 rounded-3xl border border-indigo-400/20 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                                            {fileProcessing ? <Loader2 size={36} className="animate-spin text-indigo-300" /> : <Upload size={36} />}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-base text-indigo-100 mb-1">
                                                {fileProcessing ? 'جاري تحليل وفك تشفير الملف...' : 'اضغط للرفع أو أسقط ملف تدريب هنا'}
                                            </p>
                                            <p className="text-xs text-indigo-400/70 font-medium">يدعم PDF, Excel (حتى 10MB). سيتم المعالجة آلياً.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Text Editor */}
                                <div className="bg-[#1e293b]/50 p-6 rounded-[2rem] border border-slate-700/50">
                                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2"><BookOpen size={16} /> محضر قاعدة المعرفة الحالي</label>
                                    <textarea
                                        value={botContext}
                                        onChange={e => setBotContext(e.target.value)}
                                        className="w-full p-6 bg-[#0f172a]/50 border border-slate-700/50 rounded-[1.5rem] min-h-[300px] outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400/50 transition-all font-mono text-sm leading-relaxed text-slate-300 placeholder-slate-600 custom-scrollbar resize-none"
                                        placeholder="ابدأ بتغذية البوت بأسماء المعلمين، الجداول، اللوائح التأديبية..."
                                    ></textarea>
                                </div>

                                <button
                                    onClick={handleSaveBotContext}
                                    disabled={isSavingContext}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98] border border-indigo-400/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                                >
                                    {isSavingContext ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} تحديث دماغ الذكاء الاصطناعي
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-rose-50/50 p-8 md:p-10 rounded-[2.5rem] border border-rose-200/80 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-10 -top-10 text-rose-100 opacity-50 pointer-events-none transform -rotate-12 group-hover:scale-110 group-hover:opacity-60 transition-all duration-500">
                                <AlertTriangle size={200} strokeWidth={0.5} />
                            </div>
                            <h2 className="text-xl font-extrabold text-rose-800 mb-2 flex items-center gap-3 relative z-10"><AlertTriangle className="text-rose-600" size={24} strokeWidth={2.5} /> منطقة الحذر الشديد</h2>
                            <p className="text-sm font-bold text-rose-600/80 mb-6 relative z-10 max-w-lg">الإجراء أدناه غير قابل للإلغاء نهائياً، سيقوم بحذف جميع سجلات الطلاب والمخالفات، الاستئذان من قاعدة البيانات الأساسية.</p>
                            <button onClick={() => handleClearData('all')} disabled={isDeleting} className="w-full sm:w-[50%] bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-rose-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 relative z-10"><Trash2 size={20} /> مسح جميع قواعد البيانات والمحتوى</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
