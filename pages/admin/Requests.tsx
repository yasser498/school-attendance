
import React, { useState, useMemo, useEffect } from 'react';
import { Check, X, Eye, Calendar, Filter, MessageCircle, Sparkles, Loader2, Copy, Search, MoreHorizontal, FileText, User, RefreshCw, History, ChevronDown, ChevronUp, BrainCircuit, Send } from 'lucide-react';
import { getRequests, updateRequestStatus, invalidateCache, getStudentAttendanceHistory, generateSmartContent, sendAdminInsight } from '../../services/storage';
import { RequestStatus, ExcuseRequest, AttendanceStatus } from '../../types';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReq, setSelectedReq] = useState<ExcuseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Responsive List logic
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [studentHistory, setStudentHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // AI Logic
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  // For individual reply generation
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [replyType, setReplyType] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const itemSize = isMobile ? 140 : 90; 

  const fetchRequests = async (force = false) => {
    setLoading(true);
    try {
      const data = await getRequests(force);
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch History when selectedReq changes
  useEffect(() => {
      if (selectedReq) {
          setLoadingHistory(true);
          getStudentAttendanceHistory(selectedReq.studentId, selectedReq.grade, selectedReq.className)
              .then(setStudentHistory)
              .catch(console.error)
              .finally(() => setLoadingHistory(false));
      } else {
          setStudentHistory([]);
          setHistoryOpen(false);
      }
  }, [selectedReq]);

  const handleRefresh = () => {
    fetchRequests(true);
  };

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(null); 
      setAiReply('');
      setReplyType(null);
    }

    try {
        await updateRequestStatus(id, newStatus);
    } catch (error) {
        alert("فشل تحديث الحالة.");
        fetchRequests(true); 
    }
  };

  const generateAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const pendingCount = requests.filter(r => r.status === RequestStatus.PENDING).length;
          const reasons = requests.map(r => r.reason);
          const reasonCounts: Record<string, number> = {};
          reasons.forEach(r => reasonCounts[r] = (reasonCounts[r] || 0) + 1);
          const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

          const prompt = `
            بصفتك مدير مدرسة، حلل طلبات الأعذار التالية:
            - إجمالي الطلبات: ${requests.length}
            - المعلقة: ${pendingCount}
            - السبب الأكثر شيوعاً: ${topReason}

            المطلوب:
            هل هناك نمط غير طبيعي للأعذار (مثل كثرة الأعذار المرضية)؟
            ما التوجيه المناسب للموجه الطلابي؟
          `;
          
          const res = await generateSmartContent(prompt);
          setAnalysisReport(res);
      } catch(e:any) {
          setAnalysisReport(e.message);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const broadcastAnalysis = async (target: 'counselor' | 'deputy') => {
      if(!analysisReport) return;
      try {
          await sendAdminInsight(target, analysisReport);
          alert('تم الإرسال بنجاح');
      } catch (e) { alert('فشل الإرسال'); }
  };

  const generateAiReply = async (type: 'accept' | 'reject') => {
    if (!selectedReq) return;
    setIsGeneratingReply(true);
    setReplyType(type);
    setAiReply(''); 

    try {
      const prompt = `
        بصفتك مدير مدرسة "متوسطة عماد الدين زنكي".
        اكتب رسالة نصية قصيرة (SMS) لولي أمر الطالب "${selectedReq.studentName}".
        الموضوع: رد على عذر غياب ليوم ${selectedReq.date}.
        الحالة: ${type === 'accept' ? 'تم قبول العذر' : 'تم رفض العذر'}.
        ${type === 'reject' ? 'سبب الرفض: عدم كفاية المرفقات.' : ''}
        الأسلوب: رسمي ومحترم جداً.
        الرسالة يجب أن تكون أقل من 20 كلمة.
        بدون مقدمات.
      `;

      const res = await generateSmartContent(prompt);
      setAiReply(res.trim());
    } catch (error:any) {
      setAiReply(`خطأ: ${error.message}`);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Filter Logic & Row Component... (Same as previous)
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesFilter = filter === 'ALL' ? true : r.status === filter;
      const matchesSearch = r.studentName.includes(searchTerm) || r.studentId.includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  const counts = useMemo(() => {
    return {
      ALL: requests.length,
      [RequestStatus.PENDING]: requests.filter(r => r.status === RequestStatus.PENDING).length,
      [RequestStatus.APPROVED]: requests.filter(r => r.status === RequestStatus.APPROVED).length,
      [RequestStatus.REJECTED]: requests.filter(r => r.status === RequestStatus.REJECTED).length,
    };
  }, [requests]);

  const statusStyles = {
    [RequestStatus.PENDING]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200', label: 'قيد المراجعة' },
    [RequestStatus.APPROVED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200', label: 'تم القبول' },
    [RequestStatus.REJECTED]: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200', label: 'مرفوض' },
  };

  const Row = ({ index, style }: ListChildComponentProps) => {
    const req = filteredRequests[index];
    const styleObj = statusStyles[req.status];
    
    return (
      <div 
        style={style} 
        className="flex items-center border-b border-slate-50 hover:bg-blue-50/30 transition-colors group px-3 py-2"
      >
        {isMobile ? (
           // Mobile Row Layout (Stacked)
           <div className="w-full flex flex-col gap-2" onClick={() => setSelectedReq(req)}>
              <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                       {req.studentName.charAt(0)}
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 text-sm">{req.studentName}</p>
                       <p className="text-xs text-slate-500">{req.grade} - {req.className}</p>
                    </div>
                 </div>
                 <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${styleObj.bg} ${styleObj.text} ${styleObj.border}`}>
                    {styleObj.label}
                 </div>
              </div>
              <div className="flex justify-between items-center pl-1">
                 <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{req.reason}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {req.date}</span>
                 </div>
                 {req.attachmentName && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">📎 مرفق</span>}
              </div>
           </div>
        ) : (
           // Desktop Row Layout
           <>
            <div className="w-[30%] p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm shrink-0">
                  {req.studentName.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 text-sm mb-0.5 truncate">{req.studentName}</p>
                  <p className="font-mono text-xs text-slate-400 tracking-wide">{req.studentId}</p>
                </div>
              </div>
            </div>

            <div className="w-[15%] p-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">{req.grade}</span>
                <span className="text-xs text-slate-500">فصل {req.className}</span>
              </div>
            </div>

            <div className="w-[25%] p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm truncate">{req.reason}</span>
                  {req.attachmentName && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">مرفق</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={12} />
                  <span>{req.date}</span>
                </div>
              </div>
            </div>

            <div className="w-[20%] p-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${styleObj.bg} ${styleObj.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${styleObj.dot}`}></span>
                <span className={`text-xs font-bold ${styleObj.text}`}>{styleObj.label}</span>
              </div>
            </div>

            <div className="w-[10%] p-4 flex justify-end">
              <button 
                onClick={() => setSelectedReq(req)}
                className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all"
              >
                <Eye size={20} />
              </button>
            </div>
           </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">إدارة طلبات الأعذار</h1>
            <p className="text-slate-500 mt-1 text-sm">مراجعة واتخاذ القرارات بشأن غياب الطلاب</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
             <button onClick={generateAnalysis} disabled={isAnalyzing} className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl hover:bg-purple-100 transition-colors font-bold text-sm flex items-center gap-2 border border-purple-100">
                 {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18}/>} تحليل الطلبات
             </button>
             <div className="flex gap-2 w-full">
               <button 
                 onClick={handleRefresh}
                 className="bg-slate-100 text-slate-600 p-3 md:p-2.5 rounded-xl hover:bg-slate-200 transition-colors shrink-0"
                 title="تحديث القائمة"
               >
                 <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
               </button>
               <div className="relative w-full md:w-80">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="بحث بالاسم أو الهوية..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 md:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm transition-all"
                  />
               </div>
             </div>
          </div>
        </div>

        {/* Analysis Panel */}
        {analysisReport && (
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                    <Sparkles className="text-purple-600 mt-1" size={20}/>
                    <div className="flex-1">
                        <h4 className="font-bold text-purple-800 mb-1">تحليل الذكاء الاصطناعي</h4>
                        <p className="text-sm text-purple-700 leading-relaxed whitespace-pre-line">{analysisReport}</p>
                        <div className="mt-3 flex gap-3">
                            <button onClick={() => broadcastAnalysis('counselor')} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-50 flex items-center gap-1"><Send size={12}/> للموجه الطلابي</button>
                            <button onClick={() => broadcastAnalysis('deputy')} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-50 flex items-center gap-1"><Send size={12}/> للوكيل</button>
                        </div>
                    </div>
                    <button onClick={() => setAnalysisReport(null)} className="text-purple-400 hover:text-purple-700"><X size={16}/></button>
                </div>
            </div>
        )}

        {/* Modern Tabs */}
        {/* ... Tab code ... */}
      </div>

      {/* Requests List (Virtualized) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {/* Header Row - Desktop Only */}
        {!isMobile && (
          <div className="flex bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100 pr-2 pl-4">
             <div className="w-[30%] p-5 text-right">الطالب</div>
             <div className="w-[15%] p-5 text-right">الصف / الفصل</div>
             <div className="w-[25%] p-5 text-right">بيانات العذر</div>
             <div className="w-[20%] p-5 text-right">الحالة</div>
             <div className="w-[10%] p-5 text-left">إجراء</div>
          </div>
        )}

        {loading ? (
            <div className="animate-pulse">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex p-5 border-b border-slate-50 items-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full ml-4"></div>
                        <div className="flex-1 space-y-2">
                           <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                           <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="opacity-50" />
            </div>
            <p className="font-medium text-lg">لا توجد طلبات في هذه القائمة</p>
          </div>
        ) : (
          <div style={{ direction: 'ltr' }}>
            <List
              height={500}
              itemCount={filteredRequests.length}
              itemSize={itemSize}
              width={'100%'}
              direction="rtl"
              className="scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
            >
              {Row}
            </List>
          </div>
        )}
      </div>

      {/* Professional Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-50 p-2 rounded-lg text-blue-900">
                    <User size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">تفاصيل الطالب والعذر</h3>
                    <p className="text-xs text-slate-500">رقم الطلب #{selectedReq.id.slice(-6)}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedReq(null)} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                 <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3">
                 
                 {/* Sidebar Details */}
                 <div className="md:col-span-1 bg-slate-50 p-6 border-l border-slate-100 space-y-4 md:space-y-6">
                    {/* ... Same sidebar ... */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase block mb-1">اسم الطالب</label>
                           <p className="font-bold text-slate-800 text-sm">{selectedReq.studentName}</p>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase block mb-1">السجل المدني</label>
                           <p className="font-mono text-slate-600 text-sm bg-white border border-slate-200 px-2 py-1 rounded inline-block">{selectedReq.studentId}</p>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase block mb-1">الصف والفصل</label>
                           <p className="font-medium text-slate-700 text-sm">{selectedReq.grade} - {selectedReq.className}</p>
                        </div>
                    </div>
                    <div className="pt-2 md:pt-4 border-t border-slate-200">
                       <label className="text-xs font-bold text-slate-400 uppercase block mb-1">تاريخ الغياب</label>
                       <div className="flex items-center gap-2 text-blue-900 font-bold bg-blue-100/50 p-2 rounded-lg border border-blue-100 text-sm w-fit">
                          <Calendar size={16} />
                          {selectedReq.date}
                       </div>
                    </div>

                    {/* Attendance History Collapsible */}
                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <button 
                            onClick={() => setHistoryOpen(!historyOpen)}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-blue-900 transition-colors uppercase"
                        >
                            <span className="flex items-center gap-2"><History size={14}/> سجل الحضور</span>
                            {historyOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        
                        {historyOpen && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-white rounded-lg border border-slate-200 p-2">
                                {loadingHistory ? (
                                    <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-slate-400"/></div>
                                ) : studentHistory.length > 0 ? (
                                    studentHistory.map((rec, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs p-1.5 border-b border-slate-50 last:border-0">
                                            <span className="text-slate-600 font-mono">{rec.date}</span>
                                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                                                rec.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600' :
                                                rec.status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600' :
                                                'bg-emerald-50 text-emerald-600'
                                            }`}>
                                                {rec.status === AttendanceStatus.ABSENT ? 'غائب' : rec.status === AttendanceStatus.LATE ? 'متأخر' : 'حاضر'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-xs text-slate-400 py-2">لا يوجد سجلات سابقة</p>
                                )}
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Main Content */}
                 <div className="md:col-span-2 p-6 space-y-6">
                    {/* Reason Section */}
                    <div>
                       <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <FileText size={18} className="text-amber-500"/> سبب الغياب
                       </h4>
                       <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-blue-900">{selectedReq.reason}</span>
                             {statusStyles[selectedReq.status] && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[selectedReq.status].bg} ${statusStyles[selectedReq.status].text}`}>
                                   {statusStyles[selectedReq.status].label}
                                </span>
                             )}
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">
                             {selectedReq.details || 'لا توجد تفاصيل إضافية مكتوبة.'}
                          </p>
                       </div>
                    </div>

                    {/* Attachment (Same as old) */}
                    <div>
                        {/* ... */}
                    </div>

                    {/* AI Tools */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 opacity-10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
                       
                       <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4">
                             <Sparkles size={16} className="text-amber-400" />
                             <span className="font-bold text-sm">الرد الذكي (AI Reply)</span>
                          </div>

                          {aiReply ? (
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 animate-fade-in mb-3">
                                <p className="text-xs text-amber-300 font-bold mb-1 opacity-80">نص الرسالة المقترح:</p>
                                <p className="text-sm leading-relaxed font-light">{aiReply}</p>
                                <button 
                                  onClick={() => {navigator.clipboard.writeText(aiReply);}} 
                                  className="mt-2 text-xs flex items-center gap-1.5 text-white hover:text-amber-300 transition-colors"
                                >
                                  <Copy size={12} /> نسخ النص
                                </button>
                            </div>
                          ) : (
                             <p className="text-xs text-blue-200 mb-4 opacity-80">قم بتوليد رد رسمي لولي الأمر بنقرة واحدة باستخدام الذكاء الاصطناعي.</p>
                          )}

                          <div className="flex gap-2">
                             <button 
                               onClick={() => generateAiReply('accept')}
                               disabled={isGeneratingReply}
                               className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 px-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-emerald-400/30"
                             >
                                {isGeneratingReply && replyType === 'accept' ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                رد قبول
                             </button>
                             <button 
                               onClick={() => generateAiReply('reject')}
                               disabled={isGeneratingReply}
                               className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2.5 px-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                             >
                                {isGeneratingReply && replyType === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                                رد رفض
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Modal Footer Actions */}
            <div className="p-4 md:p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
               <button 
                onClick={() => handleStatusChange(selectedReq.id, RequestStatus.APPROVED)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95"
               >
                 <Check size={18} /> اعتماد
               </button>
               <button 
                onClick={() => handleStatusChange(selectedReq.id, RequestStatus.REJECTED)}
                className="flex-1 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 active:scale-95"
               >
                 <X size={18} /> رفض
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
