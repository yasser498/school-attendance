import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    Search, User, School, Copy, Check, CalendarDays, AlertCircle, Loader2,
    FileText, ShieldAlert, Star, MessageSquare, Send, CheckCircle, Clock, Plus, Users, Bell,
    LogOut, ChevronRight, ArrowLeft, Activity, ChevronLeft, Archive, AlertTriangle,
    Newspaper, CreditCard, X, Sparkles, CalendarCheck, QrCode, Paperclip, Printer, LogOut as ExitIcon, Calendar, Medal, Trophy, Phone, ArrowRight, Info, BellRing, MapPin, ScanLine, FilePlus, Zap, Award
} from 'lucide-react';
import {
    getStudentByCivilId, getRequestsByStudentId, getStudentAttendanceHistory,
    getBehaviorRecords, getStudentObservations, acknowledgeBehavior,
    acknowledgeObservation, getParentChildren, linkParentToStudent,
    getNotifications, markNotificationRead, getStudentPoints, getSchoolNews, generateSmartStudentReport,
    getAvailableSlots, bookAppointment, getMyAppointments, getMyExitPermissions, getStudentsByPhone,
    checkParentRegistration, addExitPermission, getCertificates, getActivities, getActivityApprovals, updateActivityApproval, getStudentWallet, getWalletTransactions
} from '../services/storage';
import { subscribeToPushNotifications, checkPushPermission } from '../services/pushService';
import {
    Student, ExcuseRequest, RequestStatus, AttendanceStatus, BehaviorRecord,
    StudentObservation, AppNotification, StudentPoint, SchoolNews, AppointmentSlot, Appointment, ExitPermission, Certificate, ActivityPermission, ActivityApproval, WalletTransaction
} from '../types';
import { supabase } from '../supabaseClient';

const { useNavigate } = ReactRouterDOM as any;

const Inquiry: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [parentCivilId, setParentCivilId] = useState(localStorage.getItem('ozr_parent_id') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('ozr_parent_id'));
    const [authLoading, setAuthLoading] = useState(false);
    const [loginMessage, setLoginMessage] = useState('');

    const [myChildren, setMyChildren] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [news, setNews] = useState<SchoolNews[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showDigitalId, setShowDigitalId] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedNews, setSelectedNews] = useState<SchoolNews | null>(null);

    const [pushStatus, setPushStatus] = useState(checkPushPermission());
    const [pushLoading, setPushLoading] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'absence_reg' | 'report' | 'calendar' | 'behavior' | 'positive_behavior' | 'observations' | 'visits' | 'exits'>('overview');

    // Data State
    const [history, setHistory] = useState<ExcuseRequest[]>([]);
    const [attendanceHistory, setAttendanceHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
    const [behaviorHistory, setBehaviorHistory] = useState<BehaviorRecord[]>([]);
    const [positiveObservations, setPositiveObservations] = useState<StudentObservation[]>([]);
    const [observations, setObservations] = useState<StudentObservation[]>([]);
    const [points, setPoints] = useState<{ total: number, history: StudentPoint[] }>({ total: 0, history: [] });
    const [exitPermissions, setExitPermissions] = useState<ExitPermission[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [activities, setActivities] = useState<ActivityPermission[]>([]);
    const [approvals, setApprovals] = useState<ActivityApproval[]>([]);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [newChildInput, setNewChildInput] = useState('');
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [submittingReply, setSubmittingReply] = useState(false);
    const [smartReport, setSmartReport] = useState<string | null>(null);
    const [generatingReport, setGeneratingReport] = useState(false);

    // Printing State
    const [printMode, setPrintMode] = useState<'none' | 'certificate'>('none');
    const [certificateData, setCertificateData] = useState<{ studentName: string, reason: string, date: string, points?: number } | null>(null);

    // Reply State
    const [replyMode, setReplyMode] = useState<{ id: string, type: 'behavior' | 'observation' } | null>(null);
    const [replyContent, setReplyContent] = useState('');

    // Calendar
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Appointments
    const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [visitReason, setVisitReason] = useState('');
    const [parentNameForVisit, setParentNameForVisit] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
    const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<AppointmentSlot | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Appointment | null>(null);

    // Exit Permissions State
    const [showExitModal, setShowExitModal] = useState(false);
    const [exitReason, setExitReason] = useState('');
    const [exitParentPhone, setExitParentPhone] = useState('');
    const [isSubmittingExit, setIsSubmittingExit] = useState(false);

    const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";
    const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";

    // Login Logic Updated
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentCivilId) return;

        setAuthLoading(true);
        setLoginMessage('جاري التحقق من الهوية...');

        try {
            const exists = await checkParentRegistration(parentCivilId);

            if (exists) {
                setLoginMessage('مرحباً بعودتك! جاري تحميل بياناتك...');
            } else {
                setLoginMessage('حساب جديد، جاري تهيئة الدخول...');
            }

            setTimeout(async () => {
                localStorage.setItem('ozr_parent_id', parentCivilId);
                setIsAuthenticated(true);
                await loadParentDashboard();
                setAuthLoading(false);
                setLoginMessage('');
            }, 1500);

        } catch (error) {
            console.error("Login Check Error", error);
            localStorage.setItem('ozr_parent_id', parentCivilId);
            setIsAuthenticated(true);
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('ozr_parent_id');
        setIsAuthenticated(false);
        setMyChildren([]);
        setSelectedStudent(null);
    };

    const loadParentDashboard = async () => {
        if (!parentCivilId) return;
        try {
            const [children, notifs, schoolNews] = await Promise.all([
                getParentChildren(parentCivilId),
                getNotifications(parentCivilId),
                getSchoolNews()
            ]);
            setMyChildren(children);
            setNotifications(notifs);
            setNews(schoolNews);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if (isAuthenticated) loadParentDashboard(); }, [isAuthenticated]);

    // Realtime & Polling for Notifications
    useEffect(() => {
        if (!isAuthenticated || !parentCivilId) return;

        const fetchLatestNotifications = async () => {
            const myNotifs = await getNotifications(parentCivilId);
            let childrenNotifs: AppNotification[] = [];
            for (const child of myChildren) {
                const cn = await getNotifications(child.studentId);
                childrenNotifs = [...childrenNotifs, ...cn];
            }
            const globalNotifs = await getNotifications('ALL');
            const all = [...myNotifs, ...childrenNotifs, ...globalNotifs];
            const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
            const sorted = unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setNotifications(sorted);
        };

        fetchLatestNotifications();

        const channel = supabase.channel('public:notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
            const newNotif = payload.new as AppNotification;
            const isMine = newNotif.targetUserId === parentCivilId;
            const isMyChild = myChildren.some(child => child.studentId === newNotif.targetUserId);
            const isGlobal = newNotif.targetUserId === 'ALL';

            if (isMine || isMyChild || isGlobal) {
                setNotifications(prev => [newNotif, ...prev]);

                if (Notification.permission === 'granted') {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: newNotif.title,
                            options: { body: newNotif.message }
                        });
                    } else {
                        new Notification(newNotif.title, { body: newNotif.message, icon: SCHOOL_LOGO });
                    }
                }
            }
        }).subscribe();

        const interval = setInterval(fetchLatestNotifications, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [isAuthenticated, parentCivilId, myChildren]);

    const handleEnablePush = async () => {
        setPushLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setPushStatus('granted');
                alert("تم تفعيل الإشعارات بنجاح!");
            }
            else { alert("تم رفض الإذن. يرجى تفعيله يدوياً من إعدادات المتصفح (القفل بجانب الرابط)."); }
        } catch (e) { alert("تعذر تفعيل الإشعارات."); }
        finally { setPushLoading(false); }
    };

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChildInput) return;
        setLoading(true);
        try {
            const isPhone = newChildInput.startsWith('05') || newChildInput.startsWith('966');
            if (isPhone) {
                const students = await getStudentsByPhone(newChildInput);
                if (students.length === 0) alert("لم يتم العثور على طلاب مسجلين برقم الجوال هذا.");
                else { for (const s of students) await linkParentToStudent(parentCivilId, s.studentId); await loadParentDashboard(); setNewChildInput(''); setIsAddingChild(false); alert(`تم إضافة ${students.length} طالب/طلاب بنجاح!`); }
            } else {
                const student = await getStudentByCivilId(newChildInput);
                if (!student) alert("لم يتم العثور على طالب بهذا الرقم.");
                else { await linkParentToStudent(parentCivilId, student.studentId); await loadParentDashboard(); setNewChildInput(''); setIsAddingChild(false); alert("تم الإضافة!"); }
            }
        } catch (e) { alert("حدث خطأ."); } finally { setLoading(false); }
    };

    // ... (Rest of the component logic remains identical) ...
    const handleSelectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setLoading(true);
        try {
            // Fetch ALL necessary data for tabs
            const [reqs, att, beh, allObs, pts, slots, apps, exits, allCerts, allActs, allApprovals, walletAmount, txs] = await Promise.all([
                getRequestsByStudentId(student.studentId),
                getStudentAttendanceHistory(student.studentId),
                getBehaviorRecords(student.studentId),
                getStudentObservations(student.studentId),
                getStudentPoints(student.studentId),
                getAvailableSlots(),
                getMyAppointments(parentCivilId),
                getMyExitPermissions([student.studentId]),
                getCertificates(),
                getActivities(),
                getActivityApprovals(),
                getStudentWallet(student.studentId),
                getWalletTransactions(student.studentId)
            ]);

            setHistory(reqs);
            setAttendanceHistory(att);
            setBehaviorHistory(beh);
            setPositiveObservations(allObs.filter(o => o.type === 'positive'));
            setObservations(allObs.filter(o => o.type !== 'positive'));
            setPoints(pts);
            setAvailableSlots(slots);
            setMyAppointments(apps.filter(a => a.studentId === student.studentId));
            setExitPermissions(exits);
            setCertificates(allCerts.filter(c => c.studentId === student.studentId));

            const filteredActs = allActs.filter(a => a.status === 'active' &&
                (a.targetGrades.includes(student.grade) || a.targetGrades.length === 0)
            );
            setActivities(filteredActs);
            setApprovals(allApprovals.filter(a => a.studentId === student.studentId));
            setWalletBalance(walletAmount);
            setWalletTransactions(txs);

            setActiveTab('overview');
            setSmartReport(null);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const missingExcuses = useMemo(() => {
        if (!attendanceHistory.length) return [];
        return attendanceHistory.filter(record => {
            if (record.status !== AttendanceStatus.ABSENT) return false;
            const hasRequest = history.some(req => req.date === record.date && req.status !== RequestStatus.REJECTED);
            return !hasRequest;
        });
    }, [attendanceHistory, history]);

    const summaryStats = useMemo(() => {
        const present = attendanceHistory.filter(x => x.status === AttendanceStatus.PRESENT).length;
        const late = attendanceHistory.filter(x => x.status === AttendanceStatus.LATE).length;
        const exits = exitPermissions.length;

        let excused = 0;
        let unexcused = 0;

        attendanceHistory.filter(x => x.status === AttendanceStatus.ABSENT).forEach(rec => {
            const hasApprovedExcuse = history.some(req => req.date === rec.date && req.status === RequestStatus.APPROVED);
            if (hasApprovedExcuse) excused++;
            else unexcused++;
        });

        return { present, late, exits, excused, unexcused };
    }, [attendanceHistory, exitPermissions, history]);

    const handleSubmitReply = async () => {
        if (!replyMode || !replyContent.trim()) return;
        setSubmittingReply(true);
        try {
            if (replyMode.type === 'behavior') await acknowledgeBehavior(replyMode.id, replyContent);
            else await acknowledgeObservation(replyMode.id, replyContent);
            if (selectedStudent) await handleSelectStudent(selectedStudent);
            setReplyMode(null); setReplyContent(''); alert("تم إرسال الرد.");
        } catch (e) { alert("حدث خطأ"); } finally { setSubmittingReply(false); }
    };

    const handleGenerateSmartReport = async () => {
        if (!selectedStudent) return;
        setGeneratingReport(true);
        try { const report = await generateSmartStudentReport(selectedStudent.name, attendanceHistory, behaviorHistory, points.total); setSmartReport(report); }
        catch (e) { alert("فشل التوليد"); } finally { setGeneratingReport(false); }
    };

    const handlePrintCertificate = (record: StudentObservation) => {
        if (!selectedStudent) return;
        let reason = record.content.replace('تعزيز سلوكي: ', '');
        let pts = 5;
        const pointsMatch = reason.match(/\((\d+) درجات\)/);
        if (pointsMatch) { pts = parseInt(pointsMatch[1]); reason = reason.replace(pointsMatch[0], '').trim(); }
        setCertificateData({ studentName: selectedStudent.name, reason: reason, date: record.date, points: pts });
        setPrintMode('certificate');
        setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
    };

    const handleSlotClick = (slot: AppointmentSlot) => {
        const activeApp = myAppointments.find(a => a.status === 'pending');
        const today = new Date();
        const hasActive = activeApp && (new Date(`${activeApp.slot?.date}T23:59:59`) >= today);
        if (hasActive) { alert("عفواً، لديك موعد قائم بالفعل."); if (activeApp) openTicket(activeApp); return; }
        setSelectedSlotForBooking(slot);
        setBookingSuccess(null);
        setVisitReason('');
        setParentNameForVisit('');
        setShowBookingModal(true);
    };

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitReason || !parentNameForVisit) { alert("يرجى إدخال البيانات"); return; }
        if (!selectedStudent || !selectedSlotForBooking) return;
        setIsBooking(true);
        try {
            const appt = await bookAppointment({ slotId: selectedSlotForBooking.id, studentId: selectedStudent.studentId, studentName: selectedStudent.name, parentName: parentNameForVisit, parentCivilId: parentCivilId, visitReason: visitReason });
            setBookingSuccess(appt);
            const [newSlots, newApps] = await Promise.all([getAvailableSlots(), getMyAppointments(parentCivilId)]);
            setAvailableSlots(newSlots);
            setMyAppointments(newApps.filter(a => a.studentId === selectedStudent.studentId));
        } catch (e: any) { alert(e.message || "حدث خطأ"); setShowBookingModal(false); } finally { setIsBooking(false); }
    };

    const openTicket = (appt: Appointment) => {
        setSelectedTicket(appt);
        setShowTicketModal(true);
    };

    const getDaysInMonth = (date: Date) => { const year = date.getFullYear(); const month = date.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay(); const days = []; for (let i = 0; i < firstDay; i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i)); return days; };

    const handleRequestExitPermission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !exitReason || !exitParentPhone) return;
        setIsSubmittingExit(true);
        try {
            await addExitPermission({
                studentId: selectedStudent.studentId,
                studentName: selectedStudent.name,
                grade: selectedStudent.grade,
                className: selectedStudent.className,
                parentName: 'ولي الأمر', // Ideally fetched from auth/profile
                parentPhone: exitParentPhone,
                reason: exitReason,
                createdBy: parentCivilId,
                createdByName: 'ولي الأمر',
                status: 'pending_approval' // Auto-pending for admin review
            });
            setShowExitModal(false);
            setExitReason('');
            setExitParentPhone('');
            // Refresh
            const exits = await getMyExitPermissions([selectedStudent.studentId]);
            setExitPermissions(exits);
            alert("تم إرسال طلب تذكرة الاستئذان للإدارة للمراجعة!");
        } catch (error) {
            alert("حدث خطأ أثناء إرسال الطلب.");
        } finally {
            setIsSubmittingExit(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const VisitorPass = ({ appt }: { appt: Appointment }) => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative w-full max-w-sm mx-auto">
            <div className="h-3 bg-gradient-to-r from-blue-600 to-indigo-600 w-full"></div>
            <div className="p-6 text-center relative">
                <img src={SCHOOL_LOGO} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2 opacity-90" />
                <h3 className="text-lg font-extrabold text-slate-900">{SCHOOL_NAME}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">بطاقة دخول زائر</p>
            </div>
            <div className="relative flex items-center justify-center my-2"><div className="absolute left-0 w-4 h-8 bg-slate-900 rounded-r-full -ml-2"></div><div className="w-full border-t-2 border-dashed border-slate-200 mx-6"></div><div className="absolute right-0 w-4 h-8 bg-slate-900 rounded-l-full -mr-2"></div></div>
            <div className="p-6 space-y-5">
                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs font-bold uppercase">الزائر</span><span className="font-bold text-slate-800 text-base">{appt.parentName}</span></div>
                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs font-bold uppercase">الطالب</span><span className="font-bold text-slate-800">{appt.studentName}</span></div>
                <div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 p-2 rounded-lg text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">التاريخ</p><p className="font-bold text-slate-800">{appt.slot?.date}</p></div><div className="bg-blue-50 p-2 rounded-lg text-center"><p className="text-[10px] text-blue-400 font-bold uppercase">الوقت</p><p className="font-bold text-blue-800 text-lg">{appt.slot?.startTime}</p></div></div>
            </div>
            <div className="bg-slate-900 p-6 flex flex-col items-center justify-center text-white relative">
                {appt.status === 'completed' ? (
                    <div className="text-center py-6">
                        <div className="bg-emerald-500 rounded-full p-4 mx-auto mb-4 w-20 h-20 flex items-center justify-center animate-bounce-slow"><CheckCircle size={40} className="text-white" /></div>
                        <h3 className="text-2xl font-bold mb-2">تم تسجيل الدخول</h3>
                        <p className="text-emerald-300 font-mono text-lg">{new Date(appt.arrivedAt || '').toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white p-3 rounded-xl mb-3 shadow-lg"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${appt.id}`} alt="QR" className="w-32 h-32" /></div>
                        <p className="text-xs mt-2 font-bold text-emerald-400 flex items-center gap-1"><ScanLine size={14} /> يرجى إبراز الرمز عند البوابة</p>
                    </>
                )}
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden isolate">
                {/* Animated Background Gradients */}
                <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
                </div>
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

                <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center relative z-10 animate-fade-in-up">
                    <div className="w-28 h-28 mx-auto mb-8 bg-white/5 border border-white/20 rounded-[2rem] p-4 shadow-inner flex items-center justify-center">
                        <img src={SCHOOL_LOGO} alt="Logo" className="w-full h-full object-contain filter drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">بوابة أولياء الأمور</h1>
                    <p className="text-blue-200/80 text-sm mb-8 font-medium">سجل دخولك برقم الهوية أو الإقامة لمتابعة أبنائك</p>

                    <form onSubmit={handleLogin} className="space-y-6 relative">
                        <div className="relative">
                            <input type="tel" required maxLength={10} value={parentCivilId} onChange={e => setParentCivilId(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-4 bg-slate-900/50 border border-slate-600/50 rounded-2xl text-center text-xl font-extrabold text-white tracking-widest outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-500 placeholder:font-normal" placeholder="رقم الهوية / الإقامة" />
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        </div>
                        {loginMessage && (
                            <p className="text-emerald-400 text-sm font-bold animate-pulse bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">{loginMessage}</p>
                        )}
                        <button disabled={authLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                            <span className="relative z-10 flex items-center gap-2">{authLoading ? <Loader2 className="animate-spin" /> : <>تسجيل الدخول <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /></>}</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans relative selection:bg-blue-200 selection:text-blue-900">
            <div id="print-area" className="hidden" dir="rtl">
                {/* ... (Print Templates Unchanged) ... */}
                {printMode === 'certificate' && certificateData && (
                    <div className="certificate-border text-center flex flex-col justify-between p-10 h-full bg-white relative">
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="text-right text-xs font-bold"><p>المملكة العربية السعودية</p><p>وزارة التعليم</p><p>{SCHOOL_NAME}</p></div>
                            <img src="https://www.raed.net/img?id=1474173" className="h-24 w-auto object-contain" alt="Logo" />
                            <div className="text-left text-xs font-bold"><p>Kingdom of Saudi Arabia</p><p>Ministry of Education</p></div>
                        </div>
                        <div className="relative z-10 flex-1 flex flex-col justify-center">
                            <h1 className="text-4xl font-extrabold text-slate-800 mb-2">شهادة شكر وتقدير</h1>
                            <div className="w-1/3 h-1 bg-amber-400 mx-auto mb-8 rounded-full"></div>
                            <p className="text-lg mb-6 leading-loose">تسر إدارة المدرسة ووكالة شؤون الطلاب أن تتقدم بخالص الشكر والتقدير للطالب:</p>
                            <h2 className="text-3xl font-bold text-blue-900 mb-8 underline underline-offset-8 decoration-amber-400 decoration-4">{certificateData.studentName}</h2>
                            <p className="text-lg mb-4">وذلك لتميزه في: <span className="font-bold">{certificateData.reason}</span></p>
                            {certificateData.points && <div className="inline-block bg-slate-100 border border-slate-300 px-6 py-2 rounded-xl text-lg font-bold my-4">تم منحه {certificateData.points} نقاط تميز</div>}
                            <p className="text-lg mt-6">متمنين له دوام التوفيق والنجاح.</p>
                        </div>
                        <div className="flex justify-between items-end mt-16 px-10 relative z-10">
                            <div className="text-center"><p className="font-bold mb-4">وكيل شؤون الطلاب</p><p>.............................</p></div>
                            <div className="text-center"><div className="w-24 h-24 border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-300 font-bold mb-2">الختم</div></div>
                            <div className="text-center"><p className="font-bold mb-4">مدير المدرسة</p><p>.............................</p></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200/60 shadow-sm safe-area-top">
                <div className="max-w-6xl mx-auto px-6 h-[4.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-3 font-extrabold text-slate-800">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-inner border border-blue-200/50">
                            <Users size={20} className="text-blue-600" />
                        </div>
                        <span className="hidden md:inline tracking-wide font-extrabold">بوابة ولي الأمر</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {pushStatus !== 'granted' && <button onClick={handleEnablePush} disabled={pushLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all">{pushLoading ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />} تفعيل التنبيهات</button>}
                        <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"><Bell size={20} className="text-slate-600" />{notifications.filter(n => !n.isRead).length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-bounce shadow-sm"></span>}</button>
                        <button onClick={handleLogout} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"><LogOut size={20} /></button>
                    </div>
                </div>
            </div>

            {showNotifications && (
                <div className="fixed top-16 left-0 right-0 z-40 px-4 md:absolute md:left-4 md:right-auto md:w-80 animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-3 border-b border-slate-50 font-bold text-sm flex justify-between bg-slate-50"><span>الإشعارات</span><button onClick={() => setShowNotifications(false)}><X size={16} /></button></div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? <p className="p-6 text-center text-xs text-slate-400">لا توجد إشعارات</p> : notifications.map(n => (
                                <div key={n.id} className={`p-3 border-b text-sm cursor-pointer hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => markNotificationRead(n.id)}>
                                    <p className="font-bold mb-1 flex items-center gap-2">{n.type === 'alert' && <AlertTriangle size={12} className="text-red-500" />}{n.title}</p><p className="text-xs text-slate-500">{n.message}</p>
                                    <span className="text-[10px] text-slate-400 block mt-1">{new Date(n.createdAt).toLocaleTimeString('ar-SA')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {!selectedStudent ? (
                    <div className="animate-fade-in space-y-8">
                        <div className="bg-[#0f172a] rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-white/10 isolate">
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f172a] via-blue-950 to-indigo-950"></div>
                            <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-blob z-0"></div>
                            <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 mb-3 border border-white/10 shadow-sm">
                                        <Sparkles size={12} /> بوابة النظام الذكي
                                    </div>
                                    <h2 className="text-3xl font-extrabold mb-2 tracking-tight">مرحباً بك مجدداً</h2>
                                    <p className="text-blue-200 font-medium text-base md:text-lg">تابع أبناءك لحظة بلحظة وبكل سهولة من مكان واحد.</p>
                                </div>
                                <div className="hidden md:flex w-24 h-24 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm items-center justify-center rotate-3 hover:rotate-0 transition-transform shadow-lg">
                                    <Users size={40} className="text-blue-300 opacity-80" />
                                </div>
                            </div>
                        </div>
                        {news.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-3 px-1"><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Newspaper size={16} className="text-blue-600" /> أخبار المدرسة</h3></div>
                                <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x scrollbar-hide">
                                    {news.map(n => (
                                        <div key={n.id} onClick={() => setSelectedNews(n)} className="snap-center shrink-0 w-64 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md">
                                            <div className="flex items-center justify-between mb-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${n.isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{n.isUrgent ? 'عاجل' : 'خبر'}</span><span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span></div>
                                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">{n.title}</h4>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="flex justify-between items-center mb-4 px-1"><h3 className="font-bold text-slate-800 text-lg">أبنائي</h3><button onClick={() => setIsAddingChild(true)} className="bg-slate-100 p-2 rounded-xl"><Plus size={20} /></button></div>
                            {isAddingChild && (
                                <div className="bg-white p-4 rounded-2xl shadow-lg border border-blue-100 mb-4 animate-fade-in-up">
                                    <div className="flex gap-2"><input autoFocus placeholder="رقم الهوية أو الجوال..." value={newChildInput} onChange={e => setNewChildInput(e.target.value)} className="flex-1 p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none" /><button onClick={handleAddChild} disabled={loading} className="bg-blue-600 text-white px-4 rounded-xl font-bold">{loading ? <Loader2 className="animate-spin" /> : 'إضافة'}</button></div>
                                    <button onClick={() => setIsAddingChild(false)} className="text-xs text-slate-400 mt-2 w-full">إلغاء</button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myChildren.map(child => (
                                    <div key={child.id} onClick={() => handleSelectStudent(child)} className="group bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] border border-slate-100 cursor-pointer hover:border-blue-200 relative overflow-hidden active:scale-[0.98] transition-all duration-300 hover:-translate-y-1">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 flex items-center justify-center text-2xl font-extrabold shadow-inner group-hover:rotate-6 transition-transform">
                                                {child.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-xl text-slate-900 tracking-tight leading-none mb-1 group-hover:text-blue-700 transition-colors">{child.name.split(' ').slice(0, 2).join(' ')}</h3>
                                                <p className="text-sm font-medium text-slate-500">{child.grade}</p>
                                            </div>
                                            <div className="mr-auto w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                                <ChevronLeft size={20} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
                        {/* ... (Existing Student Profile View) ... */}
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setSelectedStudent(null)} className="p-2.5 bg-white border border-slate-200/60 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><ArrowRight size={20} className="text-slate-600" /></button>
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">ملف الطالب</h2>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 text-center relative overflow-hidden isolate">
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-50/80 to-transparent -z-10"></div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl -z-10 animate-pulse-slow"></div>

                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-[1.5rem] flex items-center justify-center text-4xl font-extrabold text-blue-600 shadow-xl border-4 border-white mx-auto mb-4 rotate-3 hover:rotate-0 transition-transform">
                                    {selectedStudent.name.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">{selectedStudent.name}</h2>
                                <p className="text-base font-medium text-slate-500">{selectedStudent.grade} - {selectedStudent.className}</p>

                                <div className="flex justify-center gap-4 mt-8">
                                    <button onClick={() => setShowDigitalId(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all"><CreditCard size={16} /> الهوية الرقمية</button>
                                    <button onClick={() => navigate(`/submit?studentId=${selectedStudent.studentId}`)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"><FileText size={16} /> تقديم عذر إلكتروني</button>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-2 rounded-2xl flex gap-1.5 overflow-x-auto pb-2 md:pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-2 shadow-sm border border-slate-200/50">
                            {[
                                { id: 'overview', label: 'ملخص', icon: Activity },
                                { id: 'absence_reg', label: 'سجل غياب', icon: FilePlus },
                                { id: 'positive_behavior', label: 'التميز', icon: Trophy },
                                { id: 'calendar', label: 'التقويم', icon: CalendarDays },
                                { id: 'report', label: 'التقرير', icon: Sparkles },
                                { id: 'exits', label: 'الاستئذان', icon: ExitIcon },
                                { id: 'visits', label: 'المواعيد', icon: CalendarCheck },
                                { id: 'behavior', label: 'المخالفات', icon: ShieldAlert },
                                { id: 'observations', label: 'الملاحظات', icon: MessageSquare },
                                { id: 'activities', label: 'الموافقات', icon: CalendarCheck },
                                { id: 'certificates', label: 'الشهادات', icon: Award },
                                { id: 'wallet', label: 'المقصف', icon: CreditCard }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 min-w-max ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-md border border-slate-100 scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-white/50 border border-transparent hover:text-slate-900'}`}>
                                    <tab.icon size={18} className={activeTab === tab.id ? "text-blue-600" : "opacity-70"} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-[300px]">
                            {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> : (
                                <>
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Comprehensive Dashboard (8 Key Metrics) */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                                {/* 1. Days Present */}
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] text-center hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
                                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform"><Check size={28} /></div>
                                                    <h3 className="text-3xl font-extrabold text-slate-800 mb-1">{summaryStats.present}</h3>
                                                    <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">أيام الحضور</p>
                                                </div>

                                                {/* 2. Unexcused Absence (Red) */}
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] text-center hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group relative overflow-hidden">
                                                    {summaryStats.unexcused > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-[2rem] -z-0"></div>}
                                                    <div className="relative z-10 w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform"><AlertTriangle size={28} /></div>
                                                    <h3 className="text-3xl font-extrabold text-slate-800 mb-1">{summaryStats.unexcused}</h3>
                                                    <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">غياب (بدون عذر)</p>
                                                </div>

                                                {/* 3. Excused Absence (Blue) */}
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] text-center hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
                                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform"><FileText size={28} /></div>
                                                    <h3 className="text-3xl font-extrabold text-slate-800 mb-1">{summaryStats.excused}</h3>
                                                    <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">غياب (بعذر)</p>
                                                </div>

                                                {/* 4. Lateness (Amber) */}
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] text-center hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
                                                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform"><Clock size={28} /></div>
                                                    <h3 className="text-3xl font-extrabold text-slate-800 mb-1">{summaryStats.late}</h3>
                                                    <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">مرات التأخير</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                {/* 5. Exit Permissions */}
                                                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center gap-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group isolate relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/50 rounded-bl-full -z-10"></div>
                                                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform"><ExitIcon size={32} /></div>
                                                    <div>
                                                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">{summaryStats.exits}</h3>
                                                        <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">تصاريح الاستئذان المستخرجة</p>
                                                    </div>
                                                </div>

                                                {/* Points (Gold) */}
                                                <div className="bg-gradient-to-br from-[#f59e0b] via-[#fbbf24] to-[#fb923c] p-6 rounded-[2rem] text-white shadow-lg flex items-center gap-5 hover:-translate-y-1 transition-transform group relative overflow-hidden isolate">
                                                    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full mix-blend-screen filter blur-[20px] -z-10"></div>
                                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-[1.25rem] border border-white/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Trophy size={32} className="text-white drop-shadow-md" /></div>
                                                    <div>
                                                        <h3 className="text-4xl font-extrabold tracking-tight leading-none mb-1 drop-shadow-sm">{points.total}</h3>
                                                        <p className="text-sm text-yellow-50 font-bold tracking-wide uppercase">إجمالي نقاط التميز</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Latest Updates Feed (6, 7, 8) */}
                                            <h3 className="font-extrabold text-slate-800 text-xl mt-8 mb-5 flex items-center gap-3 tracking-tight"><Activity size={24} className="text-blue-600" /> آخر المستجدات</h3>
                                            <div className="grid md:grid-cols-3 gap-5">

                                                {/* 8. Last Positive Behavior */}
                                                <div className="bg-white border border-slate-100 border-r-4 border-r-emerald-500 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><Star size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" fill="currentColor" /> السلوك الإيجابي</h4>
                                                    {positiveObservations.length > 0 ? (
                                                        <div>
                                                            <p className="font-extrabold text-slate-800 text-sm line-clamp-2 leading-relaxed">{positiveObservations[0].content.replace('تعزيز سلوكي: ', '').split('(')[0]}</p>
                                                            <span className="text-xs font-bold text-slate-400 mt-2 block">{positiveObservations[0].date}</span>
                                                        </div>
                                                    ) : <p className="text-xs text-slate-400 font-medium">لا يوجد سجلات.</p>}
                                                </div>

                                                {/* 6. Last Violation */}
                                                <div className="bg-white border border-slate-100 border-r-4 border-r-red-500 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><ShieldAlert size={16} className="text-red-500 group-hover:scale-110 transition-transform" /> المخالفات</h4>
                                                    {behaviorHistory.length > 0 ? (
                                                        <div>
                                                            <p className="font-extrabold text-slate-800 text-sm line-clamp-2 leading-relaxed">{behaviorHistory[0].violationName}</p>
                                                            <span className="text-xs font-bold text-slate-400 mt-2 block">{behaviorHistory[0].date} - {behaviorHistory[0].violationDegree}</span>
                                                        </div>
                                                    ) : <p className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">سجل نظيف.</p>}
                                                </div>

                                                {/* 7. Last Observation */}
                                                <div className="bg-white border border-slate-100 border-r-4 border-r-blue-500 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><MessageSquare size={16} className="text-blue-500 group-hover:scale-110 transition-transform" /> أحدث ملاحظة</h4>
                                                    {observations.length > 0 ? (
                                                        <div>
                                                            <p className="font-extrabold text-slate-800 text-sm line-clamp-2 leading-relaxed">{observations[0].content}</p>
                                                            <span className="text-xs font-bold text-slate-400 mt-2 block">{observations[0].date} - {observations[0].staffName}</span>
                                                        </div>
                                                    ) : <p className="text-xs text-slate-400 font-medium">لا يوجد ملاحظات.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'absence_reg' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-[2rem] text-center relative overflow-hidden isolate shadow-sm">
                                                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/60 rounded-full blur-2xl -z-10"></div>
                                                <div className="w-20 h-20 bg-white text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 shadow-sm border border-blue-50"><FileText size={40} /></div>
                                                <h3 className="text-2xl font-extrabold text-blue-950 mb-2 tracking-tight">تقديم عذر غياب إلكتروني</h3>
                                                <p className="text-base text-blue-800/80 mb-8 font-medium max-w-sm mx-auto">يمكنك تقديم وصياغة عذر غياب لليوم أو لأيام سابقة بخطوات بسيطة ومدعومة بالذكاء الاصطناعي.</p>
                                                <button
                                                    onClick={() => navigate(`/submit?studentId=${selectedStudent.studentId}&date=${new Date().toISOString().split('T')[0]}`)}
                                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mx-auto"
                                                >
                                                    <Plus size={20} /> تقديم عذر لغياب اليوم
                                                </button>
                                            </div>
                                            {missingExcuses.length > 0 && (
                                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                                                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3"><AlertTriangle size={18} /> أيام غياب بدون عذر</h3>
                                                    <div className="space-y-2">
                                                        {missingExcuses.map((record, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 flex justify-between items-center">
                                                                <span className="font-bold text-slate-800 text-sm">{record.date}</span>
                                                                <button
                                                                    onClick={() => navigate(`/submit?studentId=${selectedStudent.studentId}&date=${record.date}`)}
                                                                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700"
                                                                >
                                                                    تقديم عذر
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                                <h4 className="font-bold text-sm mb-3">سجل الطلبات السابقة</h4>
                                                {history.length === 0 ? <p className="text-center text-slate-400 text-xs py-4">لا توجد طلبات سابقة.</p> : (
                                                    <div className="space-y-3">
                                                        {history.map(req => (
                                                            <div key={req.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm flex flex-col gap-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-bold text-slate-800">{req.date}</p>
                                                                        <p className="text-xs text-slate-500">{req.reason}</p>
                                                                    </div>
                                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        {req.status === 'APPROVED' ? 'مقبول' : req.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                                                                    </span>
                                                                </div>
                                                                {req.adminReply && (
                                                                    <div className="mt-2 bg-white p-3 rounded-lg border border-slate-200">
                                                                        <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1"><CheckCircle size={12} className="text-blue-500" /> رد الإدارة</p>
                                                                        <p className="text-xs text-slate-700 leading-relaxed font-bold">{req.adminReply}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'exits' && (
                                        <div className="space-y-4 animate-fade-in">
                                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100/60 p-8 rounded-[2rem] relative overflow-hidden text-center shadow-sm isolate">
                                                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/60 rounded-full blur-2xl -z-10"></div>
                                                <h3 className="text-xl font-extrabold text-orange-950 mb-6 tracking-tight flex items-center justify-center gap-2"><QrCode size={24} className="text-orange-500" /> بطاقة الاستئذان الرقمية</h3>
                                                {(() => {
                                                    const activeExit = exitPermissions.find(p => {
                                                        if (p.status !== 'pending_pickup') return false;
                                                        const createdTime = new Date(p.createdAt).getTime();
                                                        const now = new Date().getTime();
                                                        const diffHours = (now - createdTime) / (1000 * 60 * 60);
                                                        return diffHours < 1;
                                                    });
                                                    if (activeExit) {
                                                        return (
                                                            <div className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100/50 inline-block animate-fade-in-up relative z-10 w-full max-w-xs">
                                                                <div className="mb-4"><img src={SCHOOL_LOGO} className="w-12 h-12 mx-auto object-contain drop-shadow-sm" /></div>
                                                                <div className="bg-slate-50 p-2 rounded-2xl mb-4 inline-block">
                                                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=EXIT:${activeExit.id}`} alt="Exit QR" className="w-40 h-40 mx-auto mix-blend-multiply" />
                                                                </div>
                                                                <p className="text-base font-extrabold text-slate-900 mb-1 tracking-tight">تصريح استئذان</p>
                                                                <p className="text-xs font-bold text-slate-500 mb-3">يرجى إبراز الرمز عند نقطة الحراسة</p>
                                                                <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-3 py-1.5 rounded-full inline-block animate-pulse">صالح لمدة ساعة من الإصدار</div>
                                                            </div>
                                                        );
                                                    }
                                                    return <p className="text-base font-bold text-orange-800/60 py-8 bg-white/50 rounded-2xl border border-orange-100/50 border-dashed">لا يوجد تصريح خروج نشط حالياً.</p>;
                                                })()}

                                                <button onClick={() => setShowExitModal(true)} className="mt-6 bg-orange-500 text-white font-bold py-3 px-6 rounded-xl w-full max-w-xs mx-auto block shadow-lg hover:shadow-orange-500/20 hover:bg-orange-600 transition-colors">طلب استئذان مبكر</button>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-3 text-sm">سجل الاستئذان</h3>
                                                <div className="space-y-3">
                                                    {exitPermissions.length === 0 ? <p className="text-center text-slate-400 text-xs">السجل فارغ.</p> : exitPermissions.map(p => (
                                                        <div key={p.id} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0 text-sm">
                                                            <div><p className="font-bold text-slate-800">{p.reason || 'بدون سبب'}</p><p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</p></div>
                                                            <div className="text-left">
                                                                <span className={`text-[10px] font-bold block ${p.status === 'completed' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-600' : p.status === 'pending_approval' ? 'text-amber-500' : 'text-orange-600'}`}>
                                                                    {p.status === 'completed' ? 'تم الخروج' : p.status === 'pending_approval' ? 'قيد المراجعة' : p.status === 'rejected' ? 'مرفوض' : p.status === 'expired' ? 'منتهي' : 'جاهز للإبراز'}
                                                                </span>
                                                                {p.status === 'completed' && p.completedAt && <span className="text-[10px] text-slate-400 font-mono">{new Date(p.completedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'positive_behavior' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-3xl text-white shadow-lg text-center relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                                <div className="relative z-10">
                                                    <Trophy size={48} className="mx-auto mb-2 text-yellow-300 drop-shadow-md" />
                                                    <h2 className="text-4xl font-extrabold">{points.total}</h2>
                                                    <p className="text-emerald-100 text-sm font-bold tracking-widest uppercase">إجمالي نقاط التميز</p>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm px-2">سجل التكريم والملاحظات الإيجابية</h3>
                                            {positiveObservations.length === 0 ? <p className="text-center text-slate-400 text-sm py-10 border-2 border-dashed border-slate-200 rounded-2xl">لا يوجد سجلات حتى الآن.</p> : (
                                                <div className="grid gap-3">
                                                    {positiveObservations.map(obs => (
                                                        <div key={obs.id} className="bg-white p-4 rounded-2xl border-l-4 border-emerald-500 shadow-sm flex flex-col gap-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><Medal size={24} /></div>
                                                                    <div><p className="font-bold text-slate-800 text-sm">{obs.content.replace('تعزيز سلوكي: ', '').split('(')[0]}</p><p className="text-[10px] text-slate-400 mt-0.5">{obs.date} • {obs.staffName}</p></div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => handlePrintCertificate(obs)} className="text-xs bg-slate-800 text-white w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"><Printer size={14} /> عرض وطباعة الشهادة</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {certificates.length > 0 && (
                                                <div className="mt-8 mb-4">
                                                    <h3 className="font-bold text-slate-800 text-sm px-2 mb-3">شهادات التميز والانضباط المعتمدة</h3>
                                                    <div className="grid gap-3">
                                                        {certificates.map(cert => (
                                                            <div key={cert.id} className="bg-white p-4 rounded-2xl border border-slate-200 border-r-4 border-r-amber-400 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                    <div className={`p-3 rounded-xl ${cert.type === 'attendance' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}><Medal size={24} /></div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-sm">شهادة {cert.type === 'attendance' ? 'انتظام ومواظبة' : 'تفوق وتميز'} ( شهر {cert.month} )</p>
                                                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">تم استصدارها بتاريخ {new Date(cert.createdAt).toLocaleDateString('ar-SA')}</p>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => {
                                                                    const reasonText = cert.type === 'attendance' ? 'انضباطه وعدم غيابه' : 'تفوقه العلمي والعملي';
                                                                    setCertificateData({ studentName: selectedStudent!.name, reason: `${reasonText} طوال شهر ${cert.month}`, date: new Date(cert.createdAt).toLocaleDateString('ar-SA') });
                                                                    setPrintMode('certificate');
                                                                    setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
                                                                }} className="w-full sm:w-auto text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-amber-200"><Printer size={14} /> عرض وطباعة</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* --- Activities & Trips Approvals Tab --- */}
                                    {activeTab === ('activities' as any) && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                                                <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                                    <CalendarCheck className="text-indigo-500" />
                                                    التفويض الرقمي للأنشطة والرحلات (E-Slips)
                                                </h3>

                                                {activities.length === 0 ? (
                                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <CalendarCheck size={48} className="mx-auto text-slate-300 mb-3" />
                                                        <p className="text-slate-500 font-bold">لا يوجد أنشطة أو رحلات تتطلب تفويض حالياً.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-4">
                                                        {activities.map(act => {
                                                            const app = approvals.find(a => a.activityId === act.id);
                                                            return (
                                                                <div key={act.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                                                        <div className="flex-1">
                                                                            <h4 className="font-extrabold text-indigo-900 text-base mb-1">{act.title}</h4>
                                                                            <p className="text-sm text-slate-600 leading-relaxed">{act.description}</p>
                                                                            <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold text-slate-500">
                                                                                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><Calendar size={14} className="text-indigo-500" /> {act.date}</span>
                                                                                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><CreditCard size={14} className="text-emerald-500" /> {act.cost ? `التكلفة: ${act.cost} ريال` : 'مجانية تماماً'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                                                                        {app ? (
                                                                            <div className={`w-full text-center py-3 rounded-xl text-sm font-bold border ${app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                                {app.status === 'approved' ? '✅ تمت الموافقة من قبلك (تم التفويض)' : '❌ قمت بالاعتذار عن المشاركة'}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex gap-2 w-full">
                                                                                <button onClick={async () => {
                                                                                    await updateActivityApproval({ id: crypto.randomUUID(), activityId: act.id, studentId: selectedStudent.studentId, studentName: selectedStudent.name, grade: selectedStudent.grade, className: selectedStudent.className, parentCivilId: parentCivilId, status: 'approved', updatedAt: new Date().toISOString() });
                                                                                    const updatedApps = await getActivityApprovals();
                                                                                    setApprovals(updatedApps.filter(a => a.studentId === selectedStudent?.studentId));
                                                                                    alert('تم الموافقة على الرحلة بنجاح.');
                                                                                }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">أوافق على المشاركة <CheckCircle size={18} /></button>
                                                                                <button onClick={async () => {
                                                                                    await updateActivityApproval({ id: crypto.randomUUID(), activityId: act.id, studentId: selectedStudent.studentId, studentName: selectedStudent.name, grade: selectedStudent.grade, className: selectedStudent.className, parentCivilId: parentCivilId, status: 'rejected', updatedAt: new Date().toISOString() });
                                                                                    const updatedApps = await getActivityApprovals();
                                                                                    setApprovals(updatedApps.filter(a => a.studentId === selectedStudent?.studentId));
                                                                                    alert('تم تسجيل الاعتذار.');
                                                                                }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2">أعتذر <X size={18} /></button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- Certificates Tab --- */}
                                    {activeTab === ('certificates' as any) && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><Award size={24} className="text-purple-600" /> شهادات الشكر والتميز المعتمدة</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {certificates.length === 0 ? (
                                                    <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                                                        <Award size={48} className="mx-auto text-slate-300 mb-3" />
                                                        <p className="text-slate-500 font-bold">لا توجد شهادات مصدرة حالياً.</p>
                                                    </div>
                                                ) : certificates.map(cert => (
                                                    <div key={cert.id} className="relative p-6 rounded-3xl border border-slate-100 bg-white flex flex-col items-center group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                                                        <div className={`absolute top-0 right-0 w-full h-2 ${cert.type === 'attendance' ? 'bg-gradient-to-l from-emerald-400 to-teal-400' : 'bg-gradient-to-l from-purple-400 to-pink-400'}`}></div>
                                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 mt-2 shadow-inner border-4 border-white ring-2 ${cert.type === 'attendance' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-purple-50 text-purple-600 ring-purple-100'}`}>
                                                            <Award size={40} className="group-hover:scale-110 transition-transform" />
                                                        </div>
                                                        <h4 className={`font-extrabold text-xl mb-1 ${cert.type === 'attendance' ? 'text-emerald-700' : 'text-purple-700'}`}>
                                                            {cert.type === 'attendance' ? 'شهادة انتظام ومواظبة' : 'شهادة تفوق وتميز'}
                                                        </h4>
                                                        <p className="text-sm font-bold text-slate-500 mb-6 bg-slate-50 px-4 py-1.5 rounded-full inline-block">لشهر {cert.month}</p>

                                                        <button
                                                            onClick={() => {
                                                                setCertificateData({
                                                                    studentName: cert.studentName,
                                                                    reason: cert.type === 'attendance' ? `انضباطه وعدم غيابه طوال شهر ${cert.month}` : `تفوقه العلمي والعملي طوال شهر ${cert.month}`,
                                                                    date: new Date(cert.createdAt).toLocaleDateString('ar-SA')
                                                                });
                                                                setPrintMode('certificate');
                                                                setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
                                                            }}
                                                            className={`mt-auto w-full py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-lg ${cert.type === 'attendance' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'}`}
                                                        >
                                                            <Printer size={18} /> عرض وطباعة الشهادة
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- Wallet Tab --- */}
                                    {activeTab === ('wallet' as any) && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Digital Wallet Card */}
                                            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-[2rem] p-8 text-white shadow-lg relative overflow-hidden">
                                                <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6">
                                                    <div>
                                                        <p className="text-orange-100 text-sm font-bold mb-2 uppercase tracking-wider">الرصيد المتاح للمقصف المدرسي</p>
                                                        <h3 className="text-5xl font-extrabold">{walletBalance} <span className="text-xl font-bold">ر.س</span></h3>
                                                    </div>
                                                    <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-sm shadow-inner hidden md:block">
                                                        <CreditCard size={48} className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm font-bold text-orange-50 gap-4">
                                                    <p className="flex items-center gap-2"><Sparkles size={16} /> يستخدم الرصيد إلكترونياً عند الشراء عبر المقصف</p>
                                                    <p className="bg-orange-600/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-orange-400 font-mono">ID: {selectedStudent.studentId}</p>
                                                </div>
                                            </div>

                                            {/* Recent Transactions List */}
                                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                                <div className="p-5 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center justify-between">
                                                    <span className="flex items-center gap-2"><Clock size={16} className="text-slate-400" /> سجل العمليات الأخيره</span>
                                                    <span className="text-xs text-slate-400">{walletTransactions.length} عملية</span>
                                                </div>

                                                <div className="divide-y divide-slate-50">
                                                    {walletTransactions.length === 0 ? (
                                                        <div className="p-12 text-center text-slate-400">
                                                            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                                                            <p className="text-sm">لا توجد حركات شراء أو شحن مسجلة حالياً.</p>
                                                        </div>
                                                    ) : (
                                                        walletTransactions.map(tx => (
                                                            <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'recharge' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                        {tx.type === 'recharge' ? <Zap size={18} /> : <CreditCard size={18} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-sm">{tx.description || (tx.type === 'recharge' ? 'شحن رصيد' : 'عملية شراء')}</p>
                                                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                                            {new Date(tx.timestamp).toLocaleDateString('ar-SA')}
                                                                            <span className="opacity-30">•</span>
                                                                            {new Date(tx.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className={`text-sm font-black ${tx.type === 'recharge' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {tx.type === 'recharge' ? '+' : '-'}{tx.amount} <span className="text-[10px] mr-0.5">ر.س</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                                                <QrCode size={40} className="mx-auto text-slate-300 mb-3" />
                                                <h3 className="font-bold text-slate-700 text-base mb-1 tracking-tight">الدفع المباشر</h3>
                                                <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto leading-relaxed">يرجى إبراز الهوية الرقمية للطالب عند نقطة البيع لبرمجة عملية الشراء.</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'calendar' && (
                                        <div className="animate-fade-in">
                                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-4">
                                                <div className="flex justify-between items-center mb-6">
                                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1)))} className="p-2 bg-slate-50 rounded-full"><ChevronRight size={16} /></button>
                                                    <h3 className="font-bold text-slate-800 text-lg">{calendarMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</h3>
                                                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1)))} className="p-2 bg-slate-50 rounded-full"><ChevronLeft size={16} /></button>
                                                </div>
                                                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2"><div>أ</div><div>إ</div><div>ث</div><div>أ</div><div>خ</div><div>ج</div><div>س</div></div>
                                                <div className="grid grid-cols-7 gap-2">
                                                    {getDaysInMonth(calendarMonth).map((date, i) => {
                                                        if (!date) return <div key={i}></div>;
                                                        const dateStr = date.toISOString().split('T')[0];
                                                        const attRecord = attendanceHistory.find(r => r.date === dateStr);
                                                        const hasExcuse = history.find(req => req.date === dateStr && req.status !== RequestStatus.REJECTED);
                                                        const hasExit = exitPermissions.find(e => e.createdAt.startsWith(dateStr));
                                                        let bgClass = 'bg-slate-50 text-slate-300';
                                                        if (attRecord?.status === AttendanceStatus.ABSENT) bgClass = hasExcuse ? 'bg-blue-500 text-white' : 'bg-red-500 text-white';
                                                        else if (attRecord?.status === AttendanceStatus.LATE) bgClass = 'bg-amber-400 text-white';
                                                        else if (attRecord?.status === AttendanceStatus.PRESENT) bgClass = 'bg-emerald-500 text-white';
                                                        let borderClass = hasExit ? 'ring-2 ring-purple-500' : '';
                                                        return <div key={i} className={`h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold ${bgClass} ${borderClass}`}><span>{date.getDate()}</span></div>;
                                                    })}
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 justify-center text-[10px] font-bold text-slate-600">
                                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> حضور</div>
                                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> غياب (بدون عذر)</div>
                                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> غياب (بعذر)</div>
                                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> تأخر</div>
                                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-purple-500"></span> استئذان</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'report' && (
                                        <div className="space-y-4 animate-fade-in">
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                                                <div className="relative z-10"><h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Sparkles size={20} /> التقرير التربوي الذكي</h3><p className="text-blue-100 text-sm mb-4">تحليل شامل لأداء الطالب.</p>{!smartReport ? <button onClick={handleGenerateSmartReport} disabled={generatingReport} className="bg-white text-blue-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2">{generatingReport ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} توليد التقرير الآن</button> : <button onClick={() => setSmartReport(null)} className="bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/30">إعادة التوليد</button>}</div>
                                            </div>
                                            {smartReport && <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm leading-relaxed text-slate-700 text-sm whitespace-pre-line animate-fade-in">{smartReport}</div>}
                                        </div>
                                    )}

                                    {(activeTab === 'behavior' || activeTab === 'observations') && (
                                        <div className="space-y-4 animate-fade-in">
                                            {(activeTab === 'behavior' ? behaviorHistory : observations).length === 0 ? <p className="text-center py-10 text-slate-400 text-sm">سجل نظيف.</p> : (activeTab === 'behavior' ? behaviorHistory : observations).map((rec: any) => (
                                                <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-800 text-sm">{activeTab === 'behavior' ? rec.violationName : rec.staffName}</h4><span className="text-xs text-slate-400">{rec.date}</span></div>
                                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-3 leading-relaxed">{activeTab === 'behavior' ? rec.actionTaken : rec.content}</p>
                                                    {!rec.parentViewed ? (replyMode?.id === rec.id ? <div className="animate-fade-in"><textarea className="w-full p-3 border rounded-xl text-sm mb-2 outline-none" placeholder="اكتب ردك..." value={replyContent} onChange={e => setReplyContent(e.target.value)} autoFocus></textarea><div className="flex gap-2"><button onClick={() => { setReplyMode(null); setReplyContent(''); }} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold">إلغاء</button><button onClick={handleSubmitReply} disabled={submittingReply} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">{submittingReply ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'إرسال'}</button></div></div> : <button onClick={() => { setReplyMode({ id: rec.id, type: activeTab === 'behavior' ? 'behavior' : 'observation' }); setReplyContent(''); }} className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100">تأكيد الاطلاع والرد</button>) : <div className="bg-emerald-50 p-2 rounded-lg text-xs text-emerald-700 font-bold flex items-center gap-2 border border-emerald-100"><CheckCircle size={14} /> تم الاطلاع {rec.parentFeedback && `- الرد: ${rec.parentFeedback}`}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'visits' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><CalendarCheck size={16} className="text-blue-600" /> المواعيد المتاحة</h3>
                                                {availableSlots.length === 0 ? <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">لا توجد مواعيد متاحة حالياً.</div> : <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{availableSlots.map(slot => (<button key={slot.id} onClick={() => handleSlotClick(slot)} className="bg-white border border-slate-200 p-4 rounded-xl text-center hover:border-blue-500 hover:shadow-md transition-all group"><p className="font-bold text-blue-900 text-lg group-hover:text-blue-600">{slot.startTime}</p><p className="text-xs text-slate-400 mt-1">{slot.date}</p><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded mt-2 inline-block">حجز</span></button>))}</div>}
                                            </div>
                                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm">سجل حجوزاتي</div>
                                                {myAppointments.length === 0 ? <p className="p-6 text-center text-slate-400 text-xs">لا يوجد حجوزات سابقة.</p> : (
                                                    <div className="divide-y divide-slate-50">
                                                        {myAppointments.map(app => (
                                                            <div key={app.id} className="p-4 flex justify-between items-center text-sm hover:bg-slate-50 cursor-pointer" onClick={() => { if (app.status !== 'cancelled') openTicket(app); }}>
                                                                <div><p className="font-bold text-slate-800">{app.slot?.startTime} - {app.slot?.date}</p><p className="text-xs text-slate-500">{app.visitReason}</p></div>
                                                                <div className="flex flex-col items-end gap-1">{app.status === 'pending' && <span className="text-blue-500"><QrCode size={18} /></span>}<span className={`px-2 py-1 rounded text-xs font-bold ${app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{app.status === 'completed' ? `وصل ${new Date(app.arrivedAt || '').toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'قادم'}</span></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALs */}

            {/* Exit Permission Request Modal */}
            {showExitModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative">
                        <button onClick={() => setShowExitModal(false)} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/30"><X size={24} /></button>
                        <form onSubmit={handleRequestExitPermission} className="space-y-4">
                            <h3 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><ExitIcon size={20} className="text-purple-600" /> طلب استئذان مبكر</h3>
                            <input type="tel" value={exitParentPhone} onChange={e => setExitParentPhone(e.target.value)} placeholder="رقم جوال المستلم (أثناء الخروج)" className="w-full p-3 border rounded-xl font-bold text-sm bg-slate-50 focus:bg-white" required />
                            <textarea value={exitReason} onChange={e => setExitReason(e.target.value)} placeholder="سبب الاستئذان المبرر..." className="w-full p-3 border rounded-xl font-bold text-sm h-32 bg-slate-50 focus:bg-white resize-none" required />
                            <div className="flex gap-2"><button type="button" onClick={() => setShowExitModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200">إلغاء</button><button type="submit" disabled={isSubmittingExit} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700">{isSubmittingExit ? <Loader2 className="animate-spin mx-auto" /> : 'إرسال الطلب للإدارة'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showBookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative">
                        {bookingSuccess ? (
                            <div className="relative w-full">
                                <button onClick={() => { setShowBookingModal(false); setBookingSuccess(null) }} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/30"><X size={24} /></button>
                                <VisitorPass appt={bookingSuccess} />
                                <p className="text-center text-slate-500 text-xs mt-4">تم الحفظ</p>
                            </div>
                        ) : (
                            <form onSubmit={handleConfirmBooking} className="space-y-4">
                                <h3 className="font-bold text-lg text-slate-900">تأكيد الحجز</h3>
                                <input value={parentNameForVisit} onChange={e => setParentNameForVisit(e.target.value)} placeholder="اسم الزائر" className="w-full p-3 border rounded-xl font-bold text-sm" required />
                                <input value={visitReason} onChange={e => setVisitReason(e.target.value)} placeholder="سبب الزيارة" className="w-full p-3 border rounded-xl font-bold text-sm" required />
                                <div className="flex gap-2"><button type="button" onClick={() => setShowBookingModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200">إلغاء</button><button type="submit" disabled={isBooking} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700">{isBooking ? <Loader2 className="animate-spin mx-auto" /> : 'تأكيد'}</button></div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showTicketModal && selectedTicket && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-sm">
                        <button onClick={() => { setShowTicketModal(false); setSelectedTicket(null) }} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/30"><X size={24} /></button>
                        <VisitorPass appt={selectedTicket} />
                    </div>
                </div>
            )}

            {showDigitalId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowDigitalId(false)}>
                    <div className="w-full max-w-sm aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start"><div><p className="text-[10px] text-blue-200 font-bold tracking-widest uppercase mb-1">Student ID Card</p><h3 className="text-lg font-bold text-white leading-tight">{SCHOOL_NAME}</h3></div><img src={SCHOOL_LOGO} alt="Logo" className="w-10 h-10 object-contain bg-white/10 rounded-full p-1" /></div>
                            <div className="flex items-end justify-between mt-auto">
                                <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Name</p><p className="text-xl font-bold text-white mb-3 tracking-wide">{selectedStudent?.name}</p><div className="flex gap-4"><div><p className="text-[9px] text-slate-400 font-bold uppercase">ID</p><p className="text-sm font-mono text-blue-100">{selectedStudent?.studentId}</p></div><div><p className="text-[9px] text-slate-400 font-bold uppercase">Grade</p><p className="text-sm font-mono text-blue-100">{selectedStudent?.grade}</p></div></div></div>
                                <div className="bg-white p-1.5 rounded-lg"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedStudent?.studentId}`} className="w-16 h-16 mix-blend-multiply" alt="QR" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inquiry;