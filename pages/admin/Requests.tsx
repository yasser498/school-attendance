import React, { useState, useMemo, useEffect } from 'react';
import {
    Check, X, Eye, Calendar, FileText, User, RefreshCw, History,
    ChevronDown, ChevronUp, BrainCircuit, Loader2, Copy, Search,
    Paperclip, School, Clock, CheckCircle, XCircle, Sparkles, MessageCircle
} from 'lucide-react';
import { getRequests, updateRequestStatus, updateRequestWithReply, getStudentAttendanceHistory, generateSmartContent, sendWhatsAppMessage, getStudents } from '../../services/storage';
import { RequestStatus, ExcuseRequest, AttendanceStatus, Student } from '../../types';

const Requests: React.FC = () => {
    const [requests, setRequests] = useState<ExcuseRequest[]>([]);
    const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReq, setSelectedReq] = useState<ExcuseRequest | null>(null);
    const [loading, setLoading] = useState(true);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [studentHistory, setStudentHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<string | null>(null);
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [aiReply, setAiReply] = useState('');
    const [replyType, setReplyType] = useState<'accept' | 'reject' | null>(null);

    const fetchRequests = async (force = false) => {
        setLoading(true);
        try {
            const data = await getRequests(force);
            setRequests(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRequests(); }, []);

    useEffect(() => {
        if (selectedReq) {
            setLoadingHistory(true);
            getStudentAttendanceHistory(selectedReq.studentId)
                .then(setStudentHistory)
                .catch(console.error)
                .finally(() => setLoadingHistory(false));
        } else {
            setStudentHistory([]);
            setHistoryOpen(false);
        }
    }, [selectedReq]);

    const counts = useMemo(() => ({
        'ALL': requests.length,
        [RequestStatus.PENDING]: requests.filter(r => r.status === RequestStatus.PENDING).length,
        [RequestStatus.APPROVED]: requests.filter(r => r.status === RequestStatus.APPROVED).length,
        [RequestStatus.REJECTED]: requests.filter(r => r.status === RequestStatus.REJECTED).length,
    }), [requests]);

    const handleStatusChangeWithReply = async (id: string, newStatus: RequestStatus) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, adminReply: aiReply } : r));
        if (selectedReq?.id === id) {
            setSelectedReq(null);
            setAiReply('');
            setReplyType(null);
        }
        try {
            if (aiReply) {
                await updateRequestWithReply(id, newStatus, aiReply);
            } else {
                await updateRequestStatus(id, newStatus);
            }

            // --- WhatsApp Integration ---
            if (localStorage.getItem('whatsapp_integration') === 'true') {
                const reqData = requests.find(r => r.id === id);
                if (reqData) {
                    // We need the student phone number
                    const allStudents = await getStudents();
                    const studentData = allStudents.find(s => s.studentId === reqData.studentId || s.id === reqData.studentId);
                    if (studentData && studentData.phone) {
                        const statusAr = newStatus === RequestStatus.APPROVED ? 'معتمد ✅' : 'مرفوض ❌';
                        const message = aiReply ? aiReply : `مرحباً بك أخي ولي أمر الطالب: ${reqData.studentName}\nتم تحديث حالة طلب العذر ليوم ${reqData.date} إلى: *${statusAr}*\n\nمدرسة عماد الدين زنكي المتوسطة.`;

                        await sendWhatsAppMessage(studentData.phone, message);
                    }
                }
            }

        } catch {
            alert('فشل تحديث الحالة.');
            fetchRequests(true);
        }
    };

    const generateAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const pendingCount = requests.filter(r => r.status === RequestStatus.PENDING).length;
            const prompt = `بصفتك مدير مدرسة، حلل طلبات الأعذار التالية:\n- إجمالي الطلبات: ${requests.length}\n- المعلقة: ${pendingCount}\nالمطلوب: هل هناك نمط غير طبيعي للأعذار؟ وما التوجيه المناسب؟`;
            const res = await generateSmartContent(prompt);
            setAnalysisReport(res);
        } catch (e: any) { setAnalysisReport(e.message); }
        finally { setIsAnalyzing(false); }
    };

    const generateAiReply = async (type: 'accept' | 'reject') => {
        if (!selectedReq) return;
        setIsGeneratingReply(true);
        setReplyType(type);
        setAiReply('');
        try {
            const prompt = `اكتب رسالة نصية قصيرة (SMS) لولي أمر الطالب "${selectedReq.studentName}".\nالموضوع: رد على عذر غياب ليوم ${selectedReq.date}.\nالحالة: ${type === 'accept' ? 'تم قبول العذر' : 'تم رفض العذر'}.\nأسلوب رسمي ومختصر.`;
            const res = await generateSmartContent(prompt);
            setAiReply(res.trim());
        } catch (error: any) { setAiReply(`خطأ: ${error.message}`); }
        finally { setIsGeneratingReply(false); }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const matchesFilter = filter === 'ALL' ? true : r.status === filter;
            const matchesSearch = r.studentName.includes(searchTerm) || r.studentId.includes(searchTerm);
            return matchesFilter && matchesSearch;
        });
    }, [requests, filter, searchTerm]);

    const statusConfig = {
        [RequestStatus.PENDING]: {
            bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500',
            border: 'border-amber-200', label: 'قيد المراجعة', bar: 'bg-amber-400'
        },
        [RequestStatus.APPROVED]: {
            bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
            border: 'border-emerald-200', label: 'تم القبول', bar: 'bg-emerald-400'
        },
        [RequestStatus.REJECTED]: {
            bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500',
            border: 'border-red-200', label: 'مرفوض', bar: 'bg-red-400'
        },
    };

    const isImage = (url: string) => {
        if (!url) return false;
        if (url.startsWith('data:image')) return true;
        return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
    };

    const filterButtons = [
        { key: 'ALL', label: 'جميع الطلبات', count: counts['ALL'], Icon: FileText, activeGradient: 'from-blue-600 to-blue-700', activeShadow: 'shadow-blue-200' },
        { key: RequestStatus.PENDING, label: 'جديدة / معلقة', count: counts[RequestStatus.PENDING], Icon: Clock, activeGradient: 'from-amber-500 to-orange-500', activeShadow: 'shadow-amber-200' },
        { key: RequestStatus.APPROVED, label: 'مقبولة', count: counts[RequestStatus.APPROVED], Icon: CheckCircle, activeGradient: 'from-emerald-500 to-teal-600', activeShadow: 'shadow-emerald-200' },
        { key: RequestStatus.REJECTED, label: 'مرفوضة', count: counts[RequestStatus.REJECTED], Icon: XCircle, activeGradient: 'from-red-500 to-rose-600', activeShadow: 'shadow-red-200' },
    ];

    return (
        <div className="space-y-6 pb-12 animate-fade-in">

            {/* ── Header ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-blue-900 flex items-center gap-2">
                            <MessageCircle className="text-blue-500" size={26} />
                            إدارة طلبات الأعذار
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">مراجعة واتخاذ القرارات بشأن غياب الطلاب</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={generateAnalysis}
                            disabled={isAnalyzing}
                            className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl hover:bg-purple-100 transition-all font-bold text-sm flex items-center gap-2 border border-purple-100 shadow-sm"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                            تحليل ذكي
                        </button>
                        <button onClick={() => fetchRequests(true)} className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" title="تحديث">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو الهوية..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-700 transition-all w-64"
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filterButtons.map(({ key, label, count, Icon, activeGradient, activeShadow }) => {
                        const isActive = filter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key as any)}
                                className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 overflow-hidden group text-right
                                    ${isActive
                                        ? `bg-gradient-to-br ${activeGradient} text-white border-transparent shadow-lg ${activeShadow} scale-[1.02]`
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full mb-3">
                                    <span className={`text-xs font-bold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{label}</span>
                                    <Icon size={18} className={isActive ? 'text-white/80' : 'text-slate-400'} />
                                </div>
                                <span className={`text-3xl font-extrabold ${isActive ? 'text-white' : 'text-slate-800'}`}>{count}</span>
                                {/* Decorative background icon */}
                                <Icon size={64} className={`absolute -bottom-3 -left-3 transition-all duration-300 ${isActive ? 'text-white/10' : 'text-slate-100 group-hover:text-slate-200'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* AI Analysis Panel */}
            {analysisReport && (
                <div className="bg-purple-50 border border-purple-200 p-5 rounded-2xl relative animate-fade-in">
                    <button onClick={() => setAnalysisReport(null)} className="absolute top-3 left-3 text-purple-400 hover:text-purple-700 bg-white rounded-full p-1 shadow-sm transition-colors">
                        <X size={14} />
                    </button>
                    <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2 text-sm">
                        <Sparkles size={16} className="text-purple-500" /> تحليل الذكاء الاصطناعي
                    </h4>
                    <p className="text-sm text-purple-700 leading-relaxed whitespace-pre-line">{analysisReport}</p>
                </div>
            )}

            {/* Results Info */}
            {!loading && (
                <p className="text-xs text-slate-400 font-bold px-1">
                    عرض {filteredRequests.length} من {requests.length} طلب
                </p>
            )}

            {/* Requests Grid */}
            {loading ? (
                <div className="py-24 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                    <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={36} />
                    <p className="font-bold">جاري تحميل الطلبات...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="py-24 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                    <FileText className="mx-auto mb-4 opacity-30" size={48} />
                    <p className="font-bold text-lg">لا توجد طلبات</p>
                    <p className="text-sm mt-1">جرب تغيير فلتر البحث</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredRequests.map(req => {
                        const sc = statusConfig[req.status];
                        return (
                            <div
                                key={req.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group hover:border-blue-200"
                            >
                                {/* Colored top accent bar */}
                                <div className={`h-1.5 w-full ${sc.bar}`}></div>

                                {/* Card Header */}
                                <div className="p-4 flex items-start justify-between gap-3 border-b border-slate-50">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-lg border border-blue-100 shrink-0">
                                            {req.studentName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            {/* ✅ Full name — NO truncation */}
                                            <h3 className="font-extrabold text-slate-800 text-sm leading-snug break-words">
                                                {req.studentName}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{req.studentId}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                        {sc.label}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 space-y-3">
                                    {/* Grade & Date chips */}
                                    <div className="flex flex-wrap gap-2">
                                        <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200">
                                            <School size={11} className="text-slate-400" />
                                            {req.grade} - {req.className}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-blue-100">
                                            <Calendar size={11} />
                                            {req.date}
                                        </span>
                                    </div>

                                    {/* Reason */}
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">السبب</p>
                                        <p className="text-sm font-extrabold text-slate-800">{req.reason}</p>
                                        {req.details && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{req.details}</p>
                                        )}
                                    </div>

                                    {/* Attachment chip */}
                                    {req.attachmentName && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold bg-blue-50 w-fit px-2.5 py-1.5 rounded-xl border border-blue-100">
                                            <Paperclip size={11} /> مرفق: {req.attachmentName}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer Action */}
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => setSelectedReq(req)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-300 hover:bg-blue-50 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-800"
                                    >
                                        <Eye size={15} /> معاينة التفاصيل
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">

                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-blue-50 to-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2.5 rounded-2xl text-blue-700">
                                    <User size={20} />
                                </div>
                                <div>
                                    {/* ✅ Full name in modal header too */}
                                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">{selectedReq.studentName}</h3>
                                    <p className="text-xs text-slate-400 font-mono">#{selectedReq.id.slice(-6)} · تفاصيل العذر</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReq(null)}
                                className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'اسم الطالب', value: selectedReq.studentName },
                                    { label: 'الصف / الفصل', value: `${selectedReq.grade} - ${selectedReq.className}` },
                                    { label: 'تاريخ الغياب', value: selectedReq.date, mono: true },
                                    { label: 'رقم الهوية', value: selectedReq.studentId, mono: true },
                                ].map(({ label, value, mono }) => (
                                    <div key={label} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1">{label}</p>
                                        <p className={`font-extrabold text-slate-800 text-sm break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Status Badge */}
                            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${statusConfig[selectedReq.status].bg} ${statusConfig[selectedReq.status].border}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[selectedReq.status].dot}`}></span>
                                <span className={`font-extrabold text-sm ${statusConfig[selectedReq.status].text}`}>
                                    {statusConfig[selectedReq.status].label}
                                </span>
                            </div>

                            {/* Attendance History */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setHistoryOpen(!historyOpen)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700"
                                >
                                    <div className="flex items-center gap-2">
                                        <History size={16} className="text-slate-400" /> سجل الحضور والغياب السابق
                                    </div>
                                    {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {historyOpen && (
                                    <div className="p-3 max-h-48 overflow-y-auto divide-y divide-slate-50">
                                        {loadingHistory ? (
                                            <div className="p-4 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                                        ) : studentHistory.length > 0 ? studentHistory.map((rec, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs py-2.5 hover:bg-slate-50 transition-colors rounded px-2">
                                                <span className="text-slate-500 font-mono">{rec.date}</span>
                                                <span className={`px-2.5 py-1 rounded-xl font-bold text-[10px] ${rec.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    rec.status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    }`}>
                                                    {rec.status === AttendanceStatus.ABSENT ? 'غائب' : rec.status === AttendanceStatus.LATE ? 'متأخر' : 'حاضر'}
                                                </span>
                                            </div>
                                        )) : <p className="text-center text-xs text-slate-400 py-6">لا يوجد سجلات سابقة</p>}
                                    </div>
                                )}
                            </div>

                            {/* Reason & Details */}
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                                <h4 className="font-extrabold text-blue-800 mb-1 text-sm flex items-center gap-2">
                                    <FileText size={15} /> سبب الغياب
                                </h4>
                                <p className="font-bold text-blue-900 text-sm mb-2">{selectedReq.reason}</p>
                                {selectedReq.details && (
                                    <p className="text-sm text-blue-700 leading-relaxed opacity-80">{selectedReq.details}</p>
                                )}
                            </div>

                            {/* Attachment */}
                            {selectedReq.attachmentUrl ? (
                                <div>
                                    <p className="text-xs font-extrabold text-slate-400 uppercase mb-2">المرفقات</p>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50">
                                        <div className="bg-white p-2 rounded-xl text-blue-500 shadow-sm"><FileText size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <a href={selectedReq.attachmentUrl} target="_blank" rel="noreferrer"
                                                className="text-sm font-bold text-blue-800 hover:underline break-all">
                                                {selectedReq.attachmentName || 'عرض الملف'}
                                            </a>
                                        </div>
                                    </div>
                                    {isImage(selectedReq.attachmentUrl) && (
                                        <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 relative group">
                                            <img src={selectedReq.attachmentUrl} alt="مرفق" className="w-full h-auto max-h-64 object-contain bg-slate-50" />
                                            <div
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl"
                                                onClick={() => window.open(selectedReq.attachmentUrl, '_blank')}
                                            >
                                                <span className="text-white font-bold flex items-center gap-2 text-sm"><Eye size={18} /> تكبير الصورة</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 text-center">
                                    لا يوجد مرفقات لهذا الطلب
                                </div>
                            )}

                            {/* Existing Admin Reply */}
                            {selectedReq.adminReply && (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                    <h4 className="font-bold text-emerald-800 mb-2 text-sm flex items-center gap-2">
                                        <CheckCircle size={16} /> الرد المسجل مسبقاً
                                    </h4>
                                    <p className="text-sm text-emerald-700 leading-relaxed">{selectedReq.adminReply}</p>
                                </div>
                            )}

                            {/* AI Reply Panel */}
                            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400 opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles size={16} className="text-amber-400" />
                                        <span className="font-bold text-sm">الرد الذكي — AI</span>
                                    </div>
                                    {aiReply ? (
                                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-4">
                                            <p className="text-xs text-amber-300 font-bold mb-2">نص الرسالة المقترح:</p>
                                            <p className="text-sm leading-relaxed">{aiReply}</p>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(aiReply)}
                                                className="mt-3 text-xs flex items-center gap-1.5 text-white/70 hover:text-amber-300 transition-colors"
                                            >
                                                <Copy size={12} /> نسخ النص
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-blue-200/80 mb-4">اضغط على أحد الزرين لتوليد رد رسمي مناسب.</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => generateAiReply('accept')}
                                            disabled={isGeneratingReply}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-emerald-400/30 shadow-lg"
                                        >
                                            {isGeneratingReply && replyType === 'accept' ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                            رد قبول
                                        </button>
                                        <button
                                            onClick={() => generateAiReply('reject')}
                                            disabled={isGeneratingReply}
                                            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                                        >
                                            {isGeneratingReply && replyType === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                                            رد رفض
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
                            <button
                                onClick={() => handleStatusChangeWithReply(selectedReq.id, RequestStatus.APPROVED)}
                                className="flex-1 bg-emerald-600 text-white py-3.5 rounded-2xl font-extrabold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/15 active:scale-95"
                            >
                                <Check size={18} /> اعتماد العذر
                            </button>
                            <button
                                onClick={() => handleStatusChangeWithReply(selectedReq.id, RequestStatus.REJECTED)}
                                className="flex-1 bg-white border-2 border-red-200 text-red-600 py-3.5 rounded-2xl font-extrabold hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <X size={18} /> رفض العذر
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Requests;