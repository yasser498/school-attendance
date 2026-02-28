
import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    Users, Search, Phone, User, MapPin, School, CheckCircle,
    ShieldAlert, Printer, Plus, Inbox, FileText, LayoutGrid,
    BookOpen, MessageSquare, AlertTriangle, Calendar, Loader2,
    Clock, Activity, ClipboardList, Send, Check, X, Edit, Trash2,
    Archive, HeartHandshake, Filter, ArrowLeft, Copy, MessageCircle, Sparkles,
    PieChart as PieIcon, BarChart2, TrendingUp, BrainCircuit, FileOutput, QrCode
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    getStudents, getReferrals, getGuidanceSessions, getConsecutiveAbsences,
    getStudentAttendanceHistory, getBehaviorRecords, getStudentObservations,
    addGuidanceSession, updateGuidanceSession, deleteGuidanceSession,
    updateReferralStatus, resolveAbsenceAlert, generateGuidancePlan, generateSmartContent
} from '../../services/storage';
import { Student, StaffUser, Referral, GuidanceSession, AttendanceStatus, BehaviorRecord, StudentObservation } from '../../types';
import { GRADES } from '../../constants';

// --- Official Print Header ---
const OfficialCounselorHeader = ({ title, date }: { title: string, date: string }) => (
    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="text-right font-bold text-sm space-y-1">
            <p>المملكة العربية السعودية</p>
            <p>وزارة التعليم</p>
            <p>إدارة التوجيه الطلابي</p>
        </div>
        <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <p className="text-lg">التاريخ: {date}</p>
        </div>
        <div className="text-left font-bold text-sm">
            <p>Ministry of Education</p>
            <p>Student Counseling</p>
            <p>{new Date().toLocaleDateString('en-GB')}</p>
        </div>
    </div>
);

const { useLocation } = ReactRouterDOM as any;

const StaffStudents: React.FC = () => {
    const location = useLocation();
    // We assume if they are on /directory path OR don't have 'students' permission, they are in restricted mode
    const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);

    // Determine role-based view (Counselor only now)
    const isCounselor = true;

    const [students, setStudents] = useState<Student[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [sessions, setSessions] = useState<GuidanceSession[]>([]);
    const [activeRiskList, setActiveRiskList] = useState<any[]>([]);

    const [activeView, setActiveView] = useState<'dashboard' | 'inbox' | 'sessions' | 'cases'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [loading, setLoading] = useState(true);
    const [studentDetails, setStudentDetails] = useState<{
        history: { date: string, status: AttendanceStatus }[],
        behavior: BehaviorRecord[],
        observations: StudentObservation[]
    }>({ history: [], behavior: [], observations: [] });
    // Student Detail Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [modalTab, setModalTab] = useState<'info' | 'history' | 'behavior' | 'sessions' | 'card' | 'timeline'>('info');
    const [cardFlipped, setCardFlipped] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Session Form State
    const [showSessionForm, setShowSessionForm] = useState(false);
    const [editingSession, setEditingSession] = useState<GuidanceSession | null>(null);
    const [sessionTopic, setSessionTopic] = useState('');
    const [sessionRecs, setSessionRecs] = useState('');
    const [sessionType, setSessionType] = useState<'individual' | 'group' | 'parent_meeting'>('individual');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    // Referral Action State
    const [processingReferralId, setProcessingReferralId] = useState<string | null>(null);
    const [referralOutcome, setReferralOutcome] = useState('');
    const [referralFilter, setReferralFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'returned_to_deputy'>('all');
    const [returningReferralId, setReturningReferralId] = useState<string | null>(null);
    const [returnNote, setReturnNote] = useState('');

    // AI Analysis State
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
    const [isAnalyzingCase, setIsAnalyzingCase] = useState(false);

    // Print State
    const [printMode, setPrintMode] = useState<'none' | 'case_study' | 'session_log'>('none');

    // Constants
    const today = new Date().toISOString().split('T')[0];
    const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

    useEffect(() => {
        const session = localStorage.getItem('ozr_staff_session');
        if (session) {
            const user = JSON.parse(session);
            setCurrentUser(user);
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sData, rData, sessData, riskData] = await Promise.all([
                getStudents(),
                getReferrals(),
                getGuidanceSessions(),
                getConsecutiveAbsences()
            ]);
            setStudents(sData);
            setReferrals(rData);
            setSessions(sessData);
            setActiveRiskList(riskData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Statistics ---
    const stats = useMemo(() => {
        const totalSessions = sessions.length;
        const totalReferrals = referrals.length;
        const pendingRef = referrals.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
        const returnedRef = referrals.filter(r => r.status === 'returned_to_deputy').length;
        const resolvedRef = referrals.filter(r => r.status === 'resolved').length;

        const sessionTypes = {
            individual: sessions.filter(s => s.sessionType === 'individual').length,
            group: sessions.filter(s => s.sessionType === 'group').length,
            parent: sessions.filter(s => s.sessionType === 'parent_meeting').length,
        };

        const pieData = [
            { name: 'فردي', value: sessionTypes.individual },
            { name: 'جماعي', value: sessionTypes.group },
            { name: 'ولي أمر', value: sessionTypes.parent },
        ].filter(d => d.value > 0);

        const referralSources = referrals.reduce((acc: any, curr) => {
            const key = curr.referredBy === 'deputy' ? 'الوكيل' : curr.referredBy === 'admin' ? 'الإدارة' : 'المعلمين';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const barData = Object.entries(referralSources).map(([name, value]) => ({ name, value }));

        return { totalSessions, totalReferrals, pendingRef, resolvedRef, returnedRef, pieData, barData };
    }, [sessions, referrals]);

    const handleOpenStudent = async (student: Student) => {
        setSelectedStudent(student);
        setModalTab('info');

        setLoadingDetails(true);
        setAiAnalysisResult(null);
        try {
            const [h, b, o] = await Promise.all([
                getStudentAttendanceHistory(student.studentId),
                getBehaviorRecords(student.studentId),
                getStudentObservations(student.studentId)
            ]);
            setStudentDetails({ history: h, behavior: b, observations: o });
        } catch (e) { console.error(e); }
        finally { setLoadingDetails(false); }
    };

    const handleGeneratePlan = async () => {
        if (!selectedStudent) return;
        setIsGeneratingPlan(true);
        try {
            const summary = `
            بيانات الطالب: ${selectedStudent.name} (${selectedStudent.grade}).
            سجل الغياب: ${studentDetails.history.filter(h => h.status === 'ABSENT').length} أيام.
            المخالفات السلوكية: ${studentDetails.behavior.map(b => b.violationName).join(', ')}.
            الملاحظات: ${studentDetails.observations.map(o => o.content).join(', ')}.
          `;
            const plan = await generateGuidancePlan(selectedStudent.name, summary);
            setSessionRecs(plan);
        } catch (e) { alert("فشل التوليد"); }
        finally { setIsGeneratingPlan(false); }
    };

    const handleAnalyzeCase = async () => {
        if (!selectedStudent) return;
        setIsAnalyzingCase(true);
        try {
            const prompt = `
            أنت خبير توجيه طلابي. قم بتحليل حالة الطالب "${selectedStudent.name}" بناءً على البيانات التالية:
            - الغياب: ${studentDetails.history.filter(h => h.status === 'ABSENT').length} أيام.
            - المخالفات: ${studentDetails.behavior.length > 0 ? studentDetails.behavior.map(b => b.violationName).join(', ') : 'لا يوجد'}.
            - الملاحظات: ${studentDetails.observations.map(o => o.content).join(', ')}.
            
            المطلوب:
            1. تشخيص مبدئي للحالة (هل هي سلوكية، دراسية، اجتماعية؟).
            2. تقييم مستوى الخطر (منخفض، متوسط، مرتفع).
            3. ثلاث توصيات عملية للموجه الطلابي.
          `;
            const res = await generateSmartContent(prompt);
            setAiAnalysisResult(res);
        } catch (e) { alert("تعذر التحليل"); }
        finally { setIsAnalyzingCase(false); }
    };

    const handleSaveSession = async () => {
        if (!selectedStudent || !sessionTopic) return;
        try {
            if (editingSession) {
                await updateGuidanceSession({
                    ...editingSession,
                    topic: sessionTopic,
                    recommendations: sessionRecs,
                    sessionType: sessionType
                });
            } else {
                await addGuidanceSession({
                    id: '', studentId: selectedStudent.studentId, studentName: selectedStudent.name,
                    date: new Date().toISOString().split('T')[0], sessionType: sessionType, topic: sessionTopic, recommendations: sessionRecs, status: 'completed'
                });
            }
            setShowSessionForm(false);
            setEditingSession(null);
            setSessionTopic(''); setSessionRecs('');
            fetchData();
            alert("تم حفظ الجلسة.");
        } catch (e) { alert("حدث خطأ."); }
    };

    const handleAcceptReferral = async (id: string) => {
        await updateReferralStatus(id, 'in_progress', undefined);
        fetchData();
    };

    const handleReturnReferral = async (id: string) => {
        if (!referralOutcome.trim()) return alert("اكتب الإجراء المتخذ أولاً.");
        await updateReferralStatus(id, 'resolved', referralOutcome);
        setProcessingReferralId(null);
        setReferralOutcome('');
        fetchData();
        alert("تمت الإفادة وإغلاق الإحالة. سيظهر ردك للوكيل مباشرة.");
    };

    const handleReturnToDeputy = async (id: string) => {
        if (!returnNote.trim()) return alert("اكتب سبب الإرجاع.");
        await updateReferralStatus(id, 'returned_to_deputy', returnNote);
        setReturningReferralId(null);
        setReturnNote('');
        fetchData();
        alert("تم إرجاع الإحالة للوكيل مع الملاحظة.");
    };

    const handlePrintCaseStudy = () => {
        setPrintMode('case_study');
        setTimeout(() => { window.print(); setPrintMode('none'); }, 300);
    };

    // Derived Data Lists
    const pendingReferrals = useMemo(() => referrals.filter(r => r.status === 'pending' || r.status === 'in_progress'), [referrals]);
    const filteredReferrals = useMemo(() => {
        if (referralFilter === 'all') return referrals;
        return referrals.filter(r => r.status === referralFilter);
    }, [referrals, referralFilter]);
    const myCases = useMemo(() => {
        // Students who have open referrals OR active sessions this month
        const activeIds = new Set<string>();
        referrals.forEach(r => { if (r.status !== 'resolved') activeIds.add(r.studentId); });
        sessions.forEach(s => { if (new Date(s.date).getMonth() === new Date().getMonth()) activeIds.add(s.studentId); });
        return students.filter(s => activeIds.has(s.studentId));
    }, [students, referrals, sessions]);

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert('تم نسخ الرقم'); };
    const openWhatsApp = (phone: string) => {
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('05')) clean = '966' + clean.substring(1);
        window.open(`https://wa.me/${clean}`, '_blank');
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600" /></div>;

    return (
        <>
            {/* PRINT TEMPLATES */}
            <div id="print-area" className="hidden" dir="rtl">
                <div className="print-page-a4">
                    {printMode === 'case_study' && selectedStudent && (
                        <div>
                            <OfficialCounselorHeader title="تقرير دراسة حالة طالب" date={new Date().toLocaleDateString('ar-SA')} />
                            <div className="p-4 border border-black mb-6">
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div><span className="font-bold">اسم الطالب:</span> {selectedStudent.name}</div>
                                    <div><span className="font-bold">الصف:</span> {selectedStudent.grade} - {selectedStudent.className}</div>
                                    <div><span className="font-bold">رقم الهوية:</span> {selectedStudent.studentId}</div>
                                    <div><span className="font-bold">رقم الولي:</span> {selectedStudent.phone}</div>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg border-b border-black mb-2">1. سجل الغياب والتأخر</h3>
                            <p className="mb-4 text-sm">
                                عدد أيام الغياب: {studentDetails.history.filter(h => h.status === 'ABSENT').length} |
                                عدد مرات التأخر: {studentDetails.history.filter(h => h.status === 'LATE').length}
                            </p>

                            <h3 className="font-bold text-lg border-b border-black mb-2">2. السلوك والمخالفات</h3>
                            {studentDetails.behavior.length > 0 ? (
                                <ul className="list-disc pr-6 mb-4 text-sm">
                                    {studentDetails.behavior.map((b, i) => (
                                        <li key={i}>{b.violationName} - {b.date} ({b.actionTaken})</li>
                                    ))}
                                </ul>
                            ) : <p className="mb-4 text-sm">سجل سلوكي ممتاز.</p>}

                            <h3 className="font-bold text-lg border-b border-black mb-2">3. الجلسات الإرشادية</h3>
                            {sessions.filter(s => s.studentId === selectedStudent.studentId).length > 0 ? (
                                <table className="w-full text-right border-collapse border border-black text-sm mb-6">
                                    <thead><tr className="bg-gray-100"><th className="border p-2">التاريخ</th><th className="border p-2">الموضوع</th><th className="border p-2">التوصيات</th></tr></thead>
                                    <tbody>
                                        {sessions.filter(s => s.studentId === selectedStudent.studentId).map((s, i) => (
                                            <tr key={i}>
                                                <td className="border p-2 w-24">{s.date}</td>
                                                <td className="border p-2 font-bold">{s.topic}</td>
                                                <td className="border p-2">{s.recommendations}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="mb-4 text-sm">لا يوجد جلسات سابقة.</p>}

                            <h3 className="font-bold text-lg border-b border-black mb-2">4. الرأي المهني للموجه</h3>
                            <div className="border border-black h-32 p-2 mb-6"></div>

                            <div className="flex justify-between mt-12 px-8">
                                <div className="text-center"><p className="font-bold">الموجه الطلابي</p><p>{currentUser?.name}</p></div>
                                <div className="text-center"><p className="font-bold">مدير المدرسة</p><p>....................</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* APP UI */}
            <div className="space-y-6 pb-20 animate-fade-in relative no-print">

                {/* Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
                            <BrainCircuit size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">منصة التوجيه الرقمي</h1>
                            <p className="text-xs text-slate-500">إدارة الحالات | الإحالات | الجلسات</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
                        {[
                            { id: 'dashboard', label: 'لوحة القيادة', icon: LayoutGrid },
                            { id: 'cases', label: 'ملفاتي', icon: FileText },
                            { id: 'inbox', label: 'الإحالات', icon: Inbox, badge: stats.pendingRef, badgeOrange: stats.returnedRef },
                            { id: 'sessions', label: 'الجلسات', icon: MessageSquare }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveView(tab.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeView === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <tab.icon size={16} /> <span className="hidden md:inline">{tab.label}</span>
                                {(tab as any).badge ? <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[18px] text-center">{(tab as any).badge}</span> : null}
                                {(tab as any).badgeOrange ? <span className="bg-orange-400 text-white text-[10px] px-1.5 rounded-full min-w-[18px] text-center">{(tab as any).badgeOrange}</span> : null}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- DASHBOARD VIEW (Counselor Only) --- */}
                {activeView === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-purple-100 transition-colors"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase relative z-10">إجمالي الجلسات</p>
                                <h3 className="text-3xl font-extrabold text-purple-700 mt-1 relative z-10">{stats.totalSessions}</h3>
                                <div className="mt-2 text-[10px] text-purple-400 bg-purple-50 inline-block px-2 py-0.5 rounded-lg font-bold">هذا الفصل</div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase">إحالات نشطة</p>
                                <h3 className="text-3xl font-extrabold text-blue-700 mt-1">{stats.pendingRef}</h3>
                                <div className="mt-2 text-[10px] text-blue-400 bg-blue-50 inline-block px-2 py-0.5 rounded-lg font-bold">تتطلب إجراء</div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-8 -mt-8"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase">حالات معالجة</p>
                                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.resolvedRef}</h3>
                                <div className="mt-2 text-[10px] text-emerald-500 bg-emerald-50 inline-block px-2 py-0.5 rounded-lg font-bold">إنجاز</div>
                            </div>
                            <div className={`p-5 rounded-3xl border shadow-sm text-center relative overflow-hidden ${stats.returnedRef > 0 ? 'bg-orange-50 border-orange-200 animate-pulse-slow' : 'bg-white border-red-100'}`}>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase">مؤشر الخطر</p>
                                <h3 className={`text-3xl font-extrabold mt-1 ${stats.returnedRef > 0 ? 'text-orange-600' : 'text-red-600'}`}>{activeRiskList.length}</h3>
                                <div className="mt-2 text-[10px] text-red-400 bg-red-50 inline-block px-2 py-0.5 rounded-lg font-bold">غياب متصل</div>
                                {stats.returnedRef > 0 && <div className="mt-1 text-[10px] text-orange-600 bg-orange-100 inline-block px-2 py-0.5 rounded-lg font-bold">{stats.returnedRef} مُرجعة من الموجه</div>}
                            </div>
                        </div>

                        {/* Charts & Graphs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieIcon size={16} className="text-purple-600" /> أنواع الجلسات الإرشادية</h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {stats.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> مصادر الإحالات</h3>
                                <div className="flex-1 min-h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.barData}>
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Risk List Widget */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                                <h3 className="font-bold text-red-800 flex items-center gap-2"><ShieldAlert size={18} /> مؤشر الخطر (الغياب المتصل)</h3>
                                <span className="text-xs bg-white text-red-600 px-2 py-1 rounded font-bold border border-red-100">{activeRiskList.length} طلاب</span>
                            </div>
                            <div className="p-4 flex-1 max-h-[300px] overflow-y-auto custom-scrollbar space-y-3">
                                {activeRiskList.length === 0 ? <p className="text-center py-10 text-slate-400">لا يوجد طلاب في دائرة الخطر حالياً.</p> : activeRiskList.map((risk, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-red-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">{risk.studentName.charAt(0)}</div>
                                            <div><h4 className="font-bold text-sm text-slate-800">{risk.studentName}</h4><p className="text-xs text-slate-500">آخر غياب: {risk.lastDate}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-red-600 font-extrabold bg-red-50 px-3 py-1 rounded-lg text-xs">{risk.days} أيام</span>
                                            <button onClick={() => { const s = students.find(x => x.studentId === risk.studentId); if (s) handleOpenStudent(s); }} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50">فتح الملف</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CASES VIEW (MY FILES) --- */}
                {activeView === 'cases' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="text-purple-600" /> ملفات الرعاية النشطة</h2>
                            <button onClick={() => setActiveView('directory')} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 shadow-lg"><Plus size={16} /> حالة جديدة</button>
                        </div>

                        {myCases.length === 0 ? <p className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">لا يوجد حالات نشطة حالياً. ابدأ بإضافة حالة من الدليل.</p> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myCases.map(student => (
                                    <div key={student.id} onClick={() => handleOpenStudent(student)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 group-hover:text-purple-700">{student.name}</h3>
                                                <p className="text-xs text-slate-500">{student.grade} - {student.className}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded border">جلسات: {sessions.filter(s => s.studentId === student.studentId).length}</span>
                                            <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded border">إحالات: {referrals.filter(r => r.studentId === student.studentId).length}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- INBOX VIEW --- */}
                {activeView === 'inbox' && (
                    <div className="space-y-5 animate-fade-in">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl text-white flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-xl"><Inbox size={22} /></div>
                                <div>
                                    <h3 className="font-bold text-lg">صندوق الإحالات الوارد</h3>
                                    <p className="text-blue-100 text-xs">الطلبات الواردة من الوكيل والمعلمين</p>
                                </div>
                            </div>
                            <div className="flex gap-2 text-xs font-bold">
                                <span className="bg-amber-400 text-slate-900 px-3 py-1.5 rounded-full">{referrals.filter(r => r.status === 'pending').length} جديد</span>
                                <span className="bg-blue-400/40 text-white px-3 py-1.5 rounded-full">{referrals.filter(r => r.status === 'in_progress').length} جارٍ</span>
                            </div>
                        </div>

                        {/* Filter Chips */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {[
                                { k: 'all', l: 'الكل', count: referrals.length },
                                { k: 'pending', l: 'جديدة', count: referrals.filter(r => r.status === 'pending').length },
                                { k: 'in_progress', l: 'جارٍ معالجتها', count: referrals.filter(r => r.status === 'in_progress').length },
                                { k: 'resolved', l: 'مغلقة', count: referrals.filter(r => r.status === 'resolved').length },
                            ].map(f => (
                                <button key={f.k} onClick={() => setReferralFilter(f.k as any)} className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all border ${referralFilter === f.k ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                    {f.l} {f.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${referralFilter === f.k ? 'bg-white/20' : 'bg-slate-100'}`}>{f.count}</span>}
                                </button>
                            ))}
                        </div>

                        {/* Referral Cards */}
                        {filteredReferrals.length === 0
                            ? <p className="text-slate-400 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 font-bold">لا توجد إحالات في هذه الفئة</p>
                            : <div className="space-y-4">
                                {[...filteredReferrals].sort((a, b) => b.referralDate.localeCompare(a.referralDate)).map(ref => {
                                    const isProc = processingReferralId === ref.id;
                                    const isRet = returningReferralId === ref.id;
                                    return (
                                        <div key={ref.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${ref.status === 'pending' ? 'border-r-4 border-r-amber-400' : ''}${ref.status === 'in_progress' ? 'border-r-4 border-r-blue-500' : ''}${ref.status === 'resolved' ? 'border-r-4 border-r-emerald-400' : ''}${ref.status === 'returned_to_deputy' ? 'border-r-4 border-r-orange-400' : ''}`}>
                                            <div className="p-5">
                                                {/* Student Row */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-white ${ref.status === 'pending' ? 'bg-amber-500' : ref.status === 'in_progress' ? 'bg-blue-500' : ref.status === 'resolved' ? 'bg-emerald-500' : 'bg-orange-500'}`}>{ref.studentName.charAt(0)}</div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-900">{ref.studentName}</h3>
                                                            <p className="text-xs text-slate-500">{ref.grade} - {ref.className}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full inline-block mb-1 ${ref.status === 'pending' ? 'bg-amber-100 text-amber-700' : ref.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : ref.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {ref.status === 'pending' ? 'جديدة' : ref.status === 'in_progress' ? 'جارٍ المعالجة' : ref.status === 'resolved' ? 'مغلقة ✓' : 'مُرجعة للوكيل'}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 font-mono block">{ref.referralDate} &bull; {ref.referredBy === 'deputy' ? '🔴 الوكيل' : '📝 معلم'}</p>
                                                    </div>
                                                </div>

                                                {/* Reason */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 relative">
                                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase absolute -top-2 right-3 bg-white px-2 border rounded-full">سبب الإحالة</span>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{ref.reason}</p>
                                                </div>

                                                {/* Outcome / Return Note */}
                                                {ref.outcome && (
                                                    <div className={`rounded-xl p-3 mb-3 border ${ref.status === 'resolved' ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                                                        <p className={`text-[10px] font-extrabold uppercase mb-1 ${ref.status === 'resolved' ? 'text-emerald-700' : 'text-orange-700'}`}>{ref.status === 'resolved' ? '✅ الإجراء المتخذ (رد الموجه)' : '↩ ملاحظة الموجه (سبب الإرجاع)'}</p>
                                                        <p className="text-sm text-slate-700">{ref.outcome}</p>
                                                    </div>
                                                )}

                                                {/* === ACTIONS by status === */}
                                                {ref.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { const s = students.find(x => x.studentId === ref.studentId); if (s) handleOpenStudent(s); }} className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50">🗂 فتح ملف الطالب</button>
                                                        <button onClick={() => handleAcceptReferral(ref.id)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">✓ قبول ومتابعة</button>
                                                    </div>
                                                )}

                                                {ref.status === 'in_progress' && !isProc && !isRet && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { const s = students.find(x => x.studentId === ref.studentId); if (s) handleOpenStudent(s); }} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50">🗂 ملف الطالب</button>
                                                        <button onClick={() => setReturningReferralId(ref.id)} className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-100">↩ إرجاع للوكيل</button>
                                                        <button onClick={() => setProcessingReferralId(ref.id)} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-purple-700 shadow-lg shadow-purple-200">✅ إغلاق</button>
                                                    </div>
                                                )}

                                                {ref.status === 'in_progress' && isProc && (
                                                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 animate-fade-in">
                                                        <h4 className="font-bold text-purple-800 text-sm mb-2 flex items-center gap-2"><Send size={14} /> الإجراء المتخذ (يُرسل للوكيل)</h4>
                                                        <textarea className="w-full p-3 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[90px] bg-white mb-3" placeholder="صف الإجراءات: جلسة فردية، خطة علاجية، استدعاء ولي أمر..." value={referralOutcome} onChange={e => setReferralOutcome(e.target.value)} />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setProcessingReferralId(null)} className="flex-1 py-2 bg-white text-slate-600 rounded-xl text-xs font-bold border">إلغاء</button>
                                                            <button onClick={() => handleReturnReferral(ref.id)} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-lg">✅ إغلاق وإرسال للوكيل</button>
                                                        </div>
                                                    </div>
                                                )}

                                                {ref.status === 'in_progress' && isRet && (
                                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 animate-fade-in">
                                                        <h4 className="font-bold text-orange-800 text-sm mb-2">↩ سبب الإرجاع للوكيل</h4>
                                                        <textarea className="w-full p-3 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[80px] bg-white mb-3" placeholder="مثال: يحتاج الطالب متابعة سلوكية من قبلك أولاً..." value={returnNote} onChange={e => setReturnNote(e.target.value)} />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setReturningReferralId(null)} className="flex-1 py-2 bg-white text-slate-600 rounded-xl text-xs font-bold border">إلغاء</button>
                                                            <button onClick={() => handleReturnToDeputy(ref.id)} className="flex-1 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700">↩ إرسال للوكيل</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    </div>
                )}


                {/* --- SESSIONS VIEW (FULL LIST) --- */}
                {activeView === 'sessions' && (
                    <div className="space-y-5 animate-fade-in">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-5 rounded-2xl text-white flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-xl"><MessageSquare size={22} /></div>
                                <div>
                                    <h3 className="font-bold text-lg">سجل الجلسات الإرشادية</h3>
                                    <p className="text-purple-100 text-xs">جميع الجلسات المسجلة — {sessions.length} جلسة</p>
                                </div>
                            </div>
                        </div>

                        {/* Session Type Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { type: 'individual', label: 'فردية', icon: '🧑', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                                { type: 'group', label: 'جماعية', icon: '👥', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                { type: 'parent_meeting', label: 'ولي أمر', icon: '👨‍👧', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                            ].map(s => (
                                <div key={s.type} className={`${s.color} border rounded-2xl p-4 text-center`}>
                                    <p className="text-2xl mb-1">{s.icon}</p>
                                    <p className="text-2xl font-black">{sessions.filter(x => x.sessionType === s.type).length}</p>
                                    <p className="text-xs font-bold">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Sessions List */}
                        {sessions.length === 0
                            ? <p className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 font-bold">لا توجد جلسات مسجلة بعد</p>
                            : <div className="space-y-3">
                                {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                                    const typeMap: Record<string, { label: string, cls: string }> = {
                                        individual: { label: 'فردية', cls: 'bg-purple-100 text-purple-700' },
                                        group: { label: 'جماعية', cls: 'bg-blue-100 text-blue-700' },
                                        parent_meeting: { label: 'ولي أمر', cls: 'bg-emerald-100 text-emerald-700' },
                                    };
                                    const tm = typeMap[s.sessionType] || typeMap.individual;
                                    return (
                                        <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all border-r-4 border-r-purple-400">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">{s.studentName.charAt(0)}</div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{s.studentName}</h3>
                                                        <p className="text-xs font-bold text-purple-700">{s.topic}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full ${tm.cls}`}>{tm.label}</span>
                                                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{s.date}</p>
                                                </div>
                                            </div>
                                            {s.recommendations && (
                                                <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 border border-slate-100 mt-2">
                                                    <span className="font-bold text-slate-400 text-[10px] block mb-1">التوصيات:</span>
                                                    {s.recommendations}
                                                </div>
                                            )}
                                            <div className="flex gap-2 mt-3 justify-end">
                                                <button onClick={() => { const st = students.find(x => x.studentId === s.studentId); if (st) handleOpenStudent(st); }} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-100">🗂 ملف الطالب</button>
                                                <button onClick={async () => { if (window.confirm('حذف هذه الجلسة؟')) { await deleteGuidanceSession(s.id); fetchData(); } }} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100">حذف</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    </div>
                )}

                {/* --- STUDENT MODAL (THE CORE) --- */}
                {selectedStudent && (
                    <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden relative`}>
                        {/* Header */}
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold border border-white/10 shadow-inner">{selectedStudent.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                                    <div className="flex gap-4 text-slate-300 text-sm mt-1">
                                        <span className="flex items-center gap-1"><School size={14} /> {selectedStudent.grade} - {selectedStudent.className}</span>
                                        <span className="w-px h-4 bg-slate-700"></span>
                                        <span className="flex items-center gap-1 font-mono"><User size={14} /> {selectedStudent.studentId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrintCaseStudy} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors" title="طباعة تقرير حالة"><Printer size={20} /></button>
                                <button onClick={() => setSelectedStudent(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 bg-slate-50 px-6 gap-2 overflow-x-auto">
                            {[{ k: 'info', l: 'الملف الشخصي', i: User }, { k: 'history', l: 'سجل الغياب', i: Clock }, { k: 'behavior', l: 'السلوك', i: ShieldAlert }, { k: 'sessions', l: 'جلسات الإرشاد', i: MessageSquare }, { k: 'card', l: 'البطاقة الرقمية', i: QrCode }, { k: 'timeline', l: 'خط الزمن', i: Activity }].map(t => (
                                <button key={t.k} onClick={() => setModalTab(t.k as any)} className={`py-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${modalTab === t.k ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                                    <t.i size={16} /> {t.l}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                            {/* COUNSELOR VIEW (FULL) */}
                            {loadingDetails ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-purple-600" size={32} /><p className="text-slate-400 mt-2 font-bold">جاري تحميل الملف...</p></div> : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Main Content Column */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {modalTab === 'info' && (
                                            <div className="space-y-6 animate-fade-in">
                                                {/* AI Analysis Widget */}
                                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-3xl border border-purple-100 relative overflow-hidden">
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <h3 className="font-bold text-purple-900 text-lg flex items-center gap-2"><Sparkles size={18} className="text-amber-500" /> المساعد الذكي</h3>
                                                            <p className="text-purple-700 text-sm mt-1">تحليل شامل لحالة الطالب واقتراح خطط علاجية.</p>
                                                        </div>
                                                        <button onClick={handleAnalyzeCase} disabled={isAnalyzingCase} className="bg-white text-purple-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-50 border border-purple-200 transition-all flex items-center gap-2">{isAnalyzingCase ? <Loader2 className="animate-spin" /> : <BrainCircuit size={16} />} تحليل الحالة</button>
                                                    </div>
                                                    {aiAnalysisResult && (
                                                        <div className="mt-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl text-sm text-slate-800 leading-relaxed whitespace-pre-line border border-white shadow-sm animate-fade-in">
                                                            {aiAnalysisResult}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Parent Contact Card */}
                                                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                                                    <div className="text-center md:text-right">
                                                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">رقم ولي الأمر المسجل</p>
                                                        <p className="text-4xl font-mono font-bold text-slate-800 tracking-wider">{selectedStudent.phone || '---'}</p>
                                                    </div>
                                                    <div className="flex gap-3 w-full md:w-auto">
                                                        <button onClick={() => window.location.href = `tel:${selectedStudent.phone}`} className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"><Phone size={18} /> اتصال</button>
                                                        <button onClick={() => openWhatsApp(selectedStudent.phone)} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"><MessageCircle size={18} /> واتساب</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {modalTab === 'history' && (
                                            <div className="space-y-4 animate-fade-in">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                                                        <p className="text-red-600 text-xs font-bold uppercase">غياب</p>
                                                        <p className="text-3xl font-extrabold text-red-900">{studentDetails.history.filter(h => h.status === 'ABSENT').length}</p>
                                                    </div>
                                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                                                        <p className="text-amber-600 text-xs font-bold uppercase">تأخر</p>
                                                        <p className="text-3xl font-extrabold text-amber-900">{studentDetails.history.filter(h => h.status === 'LATE').length}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                                    <table className="w-full text-right text-sm">
                                                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100"><tr><th className="p-4">التاريخ</th><th className="p-4">الحالة</th></tr></thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {studentDetails.history.length === 0 ? <tr><td colSpan={2} className="p-6 text-center text-slate-400">سجل نظيف</td></tr> :
                                                                studentDetails.history.map((h, i) => (
                                                                    <tr key={i} className="hover:bg-slate-50"><td className="p-4 font-mono text-slate-700">{h.date}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${h.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{h.status === 'ABSENT' ? 'غائب' : 'متأخر'}</span></td></tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {modalTab === 'behavior' && (
                                            <div className="space-y-4 animate-fade-in">
                                                {studentDetails.behavior.length === 0 ? <p className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">سجل سلوكي نظيف.</p> : studentDetails.behavior.map(b => (
                                                    <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-bold text-slate-800">{b.violationName}</span>
                                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">{b.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <ShieldAlert size={14} className="text-red-500" /> الإجراء: {b.actionTaken}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {modalTab === 'sessions' && (
                                            <div className="space-y-4 animate-fade-in">
                                                <button onClick={() => setShowSessionForm(true)} className="w-full py-4 border-2 border-dashed border-purple-200 rounded-2xl text-purple-600 font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"><Plus size={20} /> توثيق جلسة جديدة</button>

                                                {/* New Session Form */}
                                                {showSessionForm && (
                                                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-fade-in relative shadow-sm">
                                                        <button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="absolute top-4 left-4 text-xs bg-white text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-100 shadow-sm">{isGeneratingPlan ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} اقترح خطة AI</button>
                                                        <h3 className="font-bold text-purple-900 mb-4 text-sm uppercase tracking-wider">تفاصيل الجلسة</h3>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">نوع الجلسة</label><select value={sessionType} onChange={e => setSessionType(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-purple-200 text-sm font-bold bg-white focus:ring-2 focus:ring-purple-500 outline-none"><option value="individual">فردي</option><option value="group">جماعي</option><option value="parent_meeting">لقاء ولي أمر</option></select></div>
                                                            <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">الموضوع</label><input value={sessionTopic} onChange={e => setSessionTopic(e.target.value)} className="w-full p-2.5 rounded-xl border border-purple-200 text-sm font-bold bg-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="عنوان الجلسة" /></div>
                                                        </div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">التوصيات والإجراءات</label>
                                                        <textarea value={sessionRecs} onChange={e => setSessionRecs(e.target.value)} className="w-full p-3 rounded-xl border border-purple-200 text-sm bg-white min-h-[100px] mb-4 focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-slate-400" placeholder="ما تم الاتفاق عليه..."></textarea>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setShowSessionForm(false)} className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50">إلغاء</button>
                                                            <button onClick={handleSaveSession} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-200">حفظ في السجل</button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Sessions List */}
                                                {sessions.filter(s => s.studentId === selectedStudent.studentId).map(s => (
                                                    <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-purple-200 transition-colors shadow-sm group">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h4 className="font-bold text-slate-800 text-lg group-hover:text-purple-700 transition-colors">{s.topic}</h4>
                                                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border">{s.date}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{s.recommendations}</p>
                                                        <div className="mt-3 flex gap-2">
                                                            <span className={`text-[10px] px-2 py-1 rounded font-bold ${s.sessionType === 'individual' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                {s.sessionType === 'individual' ? 'جلسة فردية' : s.sessionType === 'group' ? 'إرشاد جمعي' : 'لقاء ولي أمر'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Column (Summary) - Only for Counselors */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Activity size={16} className="text-blue-600" /> ملخص الأداء</h4>
                                            <ul className="space-y-3 text-sm">
                                                <li className="flex justify-between items-center"><span className="text-slate-500">أيام الغياب</span><span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{studentDetails.history.filter(h => h.status === 'ABSENT').length}</span></li>
                                                <li className="flex justify-between items-center"><span className="text-slate-500">مخالفات</span><span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{studentDetails.behavior.length}</span></li>
                                                <li className="flex justify-between items-center"><span className="text-slate-500">جلسات إرشادية</span><span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{sessions.filter(s => s.studentId === selectedStudent.studentId).length}</span></li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
                                            <h4 className="font-bold text-blue-900 mb-4 text-sm flex items-center gap-2"><FileText size={16} /> ملاحظات المعلمين</h4>
                                            {studentDetails.observations.length === 0 ? <p className="text-xs text-blue-400 italic">لا يوجد ملاحظات.</p> :
                                                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                                    {studentDetails.observations.map(o => (
                                                        <div key={o.id} className="bg-white p-3 rounded-xl text-xs shadow-sm text-slate-600 border border-blue-100">
                                                            <p className="mb-1 font-medium leading-snug">"{o.content}"</p>
                                                            <span className="text-[10px] text-slate-400 block mt-1">- {o.staffName} ({o.date})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            }
                                        </div>
                                    </div>
                                </div>
                            )
                            }

                            {/* IDEA 9: DIGITAL ID CARD */}
                            {!loadingDetails && modalTab === 'card' && (
                                <div className="animate-fade-in flex flex-col items-center justify-center py-8 gap-6">
                                    <p className="text-sm text-slate-400 font-bold">انقر على البطاقة لقلبها</p>
                                    <div className="cursor-pointer" style={{ perspective: '1200px', width: '360px', height: '220px' }} onClick={() => setCardFlipped(f => !f)}>
                                        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1)', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                                            <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', borderRadius: '1.5rem', overflow: 'hidden' }} className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 shadow-2xl border border-white/10 flex flex-col justify-between p-6">
                                                <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl -mb-16 -mr-16"></div>
                                                <div className="relative z-10 flex justify-between items-start">
                                                    <div><p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest">البطاقة المدرسية الرقمية</p></div>
                                                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/20">{selectedStudent.name.charAt(0)}</div>
                                                </div>
                                                <div className="relative z-10">
                                                    <p className="text-white text-xl font-black tracking-tight">{selectedStudent.name}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-xs text-indigo-300 font-bold flex items-center gap-1"><School size={11} /> {selectedStudent.grade} - {selectedStudent.className}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{selectedStudent.studentId}</span>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex justify-between items-end">
                                                    <div><p className="text-[9px] text-slate-500 uppercase font-bold">رقم التواصل</p><p className="text-white font-mono text-sm font-bold">{selectedStudent.phone || '---'}</p></div>
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${studentDetails.history.filter(h => h.status === 'ABSENT').length > 5 ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/30 text-emerald-300'}`}>{studentDetails.history.filter(h => h.status === 'ABSENT').length > 5 ? '⚠ يحتاج متابعة' : '✓ منتظم'}</span>
                                                </div>
                                            </div>
                                            <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', borderRadius: '1.5rem', overflow: 'hidden', transform: 'rotateY(180deg)' }} className="bg-gradient-to-br from-white to-indigo-50 shadow-2xl border border-indigo-100 flex items-center justify-center gap-8 p-6">
                                                <div className="text-center flex-1">
                                                    <p className="text-xs font-extrabold text-slate-400 mb-3 uppercase tracking-wider">QR تواصل</p>
                                                    <div className="bg-white rounded-2xl p-3 shadow-md inline-block border border-slate-100">
                                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=tel:${selectedStudent.phone?.replace(/^0/, '+966')}&color=1e1b4b&bgcolor=ffffff`} alt="QR" className="w-28 h-28" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2 font-mono">{selectedStudent.phone}</p>
                                                </div>
                                                <div className="flex-1 space-y-3 border-r border-dashed border-indigo-200 pr-6">
                                                    <div><p className="text-[10px] text-slate-400 font-bold uppercase">الغياب</p><p className="text-2xl font-black text-red-600">{studentDetails.history.filter(h => h.status === 'ABSENT').length}<span className="text-xs text-slate-400 mr-1">يوم</span></p></div>
                                                    <div><p className="text-[10px] text-slate-400 font-bold uppercase">الجلسات</p><p className="text-2xl font-black text-purple-600">{sessions.filter(s => s.studentId === selectedStudent.studentId).length}<span className="text-xs text-slate-400 mr-1">جلسة</span></p></div>
                                                    <div><p className="text-[10px] text-slate-400 font-bold uppercase">المخالفات</p><p className="text-2xl font-black text-orange-600">{studentDetails.behavior.length}<span className="text-xs text-slate-400 mr-1">مخالفة</span></p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-indigo-400 font-bold animate-pulse">↻ انقر للقلب ورؤية الرصيد</p>
                                    <div className="flex gap-3">
                                        <a href={`tel:${selectedStudent.phone}`} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-1 text-sm"><Phone size={16} /> اتصال</a>
                                        <button onClick={() => openWhatsApp(selectedStudent.phone)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all hover:-translate-y-1 text-sm"><MessageCircle size={16} /> واتساب</button>
                                    </div>
                                </div>
                            )}

                            {/* IDEA 10: TIME MACHINE TIMELINE */}
                            {!loadingDetails && modalTab === 'timeline' && (
                                <div className="animate-fade-in space-y-4">
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 text-center">
                                        <p className="text-xs text-slate-500 font-bold">آلة الزمن — السجل الكامل لمسيرة <span className="text-indigo-600 font-black">{selectedStudent.name}</span></p>
                                    </div>
                                    {(() => {
                                        const evts: { date: string, type: 'absent' | 'late' | 'behavior' | 'session' | 'observation', title: string, detail: string }[] = [];
                                        studentDetails.history.forEach(h => {
                                            if (h.status === 'ABSENT') evts.push({ date: h.date, type: 'absent', title: 'يوم غياب', detail: 'لم يحضر الطالب هذا اليوم' });
                                            if (h.status === 'LATE') evts.push({ date: h.date, type: 'late', title: 'تأخر عن الدراسة', detail: 'حضر الطالب متأخراً' });
                                        });
                                        studentDetails.behavior.forEach(b => evts.push({ date: b.date, type: 'behavior', title: b.violationName, detail: b.actionTaken }));
                                        sessions.filter(s => s.studentId === selectedStudent.studentId).forEach(s => evts.push({ date: s.date, type: 'session', title: `جلسة: ${s.topic}`, detail: s.recommendations }));
                                        studentDetails.observations.forEach(o => evts.push({ date: o.date, type: 'observation', title: o.content.substring(0, 50), detail: `بقلم: ${o.staffName}` }));
                                        evts.sort((a, b) => b.date.localeCompare(a.date));
                                        if (evts.length === 0) return (<div className="py-20 text-center text-slate-400"><Activity size={48} className="mx-auto mb-3 opacity-30" /><p className="font-bold">لا توجد أحداث مسجلة لهذا الطالب بعد</p></div>);
                                        const cMap: Record<string, { bg: string, border: string, dot: string, text: string, icon: string }> = {
                                            absent: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', icon: '🔴' },
                                            late: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700', icon: '🟡' },
                                            behavior: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700', icon: '⚠️' },
                                            session: { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500', text: 'text-purple-700', icon: '💬' },
                                            observation: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400', text: 'text-blue-700', icon: '📝' }
                                        };
                                        return (
                                            <div className="relative pr-8 space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar pl-1 pb-4">
                                                <div className="absolute right-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-slate-200 to-transparent rounded-full"></div>
                                                {evts.map((ev, idx) => {
                                                    const c = cMap[ev.type];
                                                    return (
                                                        <div key={idx} className="relative flex items-start group">
                                                            <div className={`absolute -right-[24px] mt-2 w-4 h-4 rounded-full ${c.dot} border-2 border-white shadow-md shrink-0 group-hover:scale-125 transition-transform z-10`}></div>
                                                            <div className={`${c.bg} border ${c.border} rounded-2xl p-4 flex-1 hover:shadow-md transition-all`}>
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-sm font-extrabold ${c.text}`}><span className="ml-1">{c.icon}</span>{ev.title}</p>
                                                                        <p className="text-xs text-slate-500 mt-1">{ev.detail}</p>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/70 px-2 py-1 rounded-lg border border-slate-100 shrink-0">{ev.date}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >
        </>
    );
};

export default StaffStudents;
