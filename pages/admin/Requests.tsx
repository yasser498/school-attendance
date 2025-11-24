import React, { useState, useMemo, useEffect } from 'react';
import { Check, X, Eye, Calendar, Filter, MessageCircle, Sparkles, Loader2, Copy, Search, MoreHorizontal, FileText, User, RefreshCw } from 'lucide-react';
import { getRequests, updateRequestStatus, invalidateCache } from '../../services/storage';
import { RequestStatus, ExcuseRequest } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReq, setSelectedReq] = useState<ExcuseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI Reply State
  const [aiReply, setAiReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [replyType, setReplyType] = useState<'accept' | 'reject' | null>(null);

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

  const handleRefresh = () => {
    fetchRequests(true);
  };

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    // Optimistic Update: Update UI immediately
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(null); // Close modal
      setAiReply('');
      setReplyType(null);
    }

    try {
        await updateRequestStatus(id, newStatus);
    } catch (error) {
        alert("فشل تحديث الحالة.");
        fetchRequests(true); // Revert on failure
    }
  };

  const generateAiReply = async (type: 'accept' | 'reject') => {
    if (!selectedReq) return;
    setIsGenerating(true);
    setReplyType(type);
    setAiReply(''); // Clear previous

    try {
      const key = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
      if (!key) throw new Error("Missing Key");

      const ai = new GoogleGenAI({ apiKey: key });
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text) {
        setAiReply(response.text.trim());
      }
    } catch (error) {
      setAiReply("حدث خطأ أثناء توليد الرد. تأكد من وجود مفتاح API في الإعدادات.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesFilter = filter === 'ALL' ? true : r.status === filter;
      const matchesSearch = r.studentName.includes(searchTerm) || r.studentId.includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  // Counts for Tabs
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

  // --- Virtualized Row Component ---
  const Row = ({ index, style }: ListChildComponentProps) => {
    const req = filteredRequests[index];
    const styleObj = statusStyles[req.status];
    
    return (
      <div 
        style={style} 
        className="flex items-center border-b border-slate-50 hover:bg-blue-50/30 transition-colors group px-2"
      >
        {/* Student Column (30%) */}
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

        {/* Class Column (15%) */}
        <div className="w-[15%] p-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-700">{req.grade}</span>
            <span className="text-xs text-slate-500">فصل {req.className}</span>
          </div>
        </div>

        {/* Reason Column (25%) */}
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

        {/* Status Column (20%) */}
        <div className="w-[20%] p-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${styleObj.bg} ${styleObj.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styleObj.dot}`}></span>
            <span className={`text-xs font-bold ${styleObj.text}`}>{styleObj.label}</span>
          </div>
        </div>

        {/* Action Column (10%) */}
        <div className="w-[10%] p-4 flex justify-end">
          <button 
            onClick={() => setSelectedReq(req)}
            className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-all"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">إدارة طلبات الأعذار</h1>
            <p className="text-slate-500 mt-1 text-sm">مراجعة واتخاذ القرارات بشأن غياب الطلاب</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button 
               onClick={handleRefresh}
               className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200 transition-colors"
               title="تحديث القائمة"
             >
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
             </button>
             <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث باسم الطالب أو رقم الهوية..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm transition-all"
                />
             </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto pb-1">
          {(['ALL', RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                relative px-6 py-3 text-sm font-bold transition-all whitespace-nowrap
                ${filter === f ? 'text-blue-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'}
              `}
            >
              <div className="flex items-center gap-2">
                <span>{f === 'ALL' ? 'كل الطلبات' : f === RequestStatus.PENDING ? 'طلبات جديدة' : f === RequestStatus.APPROVED ? 'المقبولة' : 'المرفوضة'}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${filter === f ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {counts[f]}
                </span>
              </div>
              {filter === f && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-900 rounded-t-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List (Virtualized) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {/* Static Header Row */}
        <div className="flex bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100 pr-2 pl-4">
           <div className="w-[30%] p-5 text-right">الطالب</div>
           <div className="w-[15%] p-5 text-right">الصف / الفصل</div>
           <div className="w-[25%] p-5 text-right">بيانات العذر</div>
           <div className="w-[20%] p-5 text-right">الحالة</div>
           <div className="w-[10%] p-5 text-left">إجراء</div>
        </div>

        {loading ? (
            <div className="animate-pulse">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex p-5 border-b border-slate-50 items-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full ml-4"></div>
                        <div className="flex-1 space-y-2">
                           <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                           <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                        <div className="w-20 h-6 bg-slate-100 rounded-full"></div>
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
          <div style={{ direction: 'ltr' }}> {/* Reset direction for scrollbar, handle RTL inside items */}
            <List
              height={500}
              itemCount={filteredRequests.length}
              itemSize={100}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
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
                 <div className="md:col-span-1 bg-slate-50 p-6 border-l border-slate-100 space-y-6">
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
                    <div className="pt-4 border-t border-slate-200">
                       <label className="text-xs font-bold text-slate-400 uppercase block mb-1">تاريخ الغياب</label>
                       <div className="flex items-center gap-2 text-blue-900 font-bold bg-blue-100/50 p-2 rounded-lg border border-blue-100 text-sm">
                          <Calendar size={16} />
                          {selectedReq.date}
                       </div>
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

                    {/* Attachment */}
                    <div>
                       <h4 className="font-bold text-slate-800 mb-3 text-sm">المرفقات والإثباتات</h4>
                       {selectedReq.attachmentName ? (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm text-red-500">
                                   <FileText size={20} />
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-slate-700 group-hover:text-blue-900 transition-colors">{selectedReq.attachmentName}</p>
                                   <p className="text-xs text-slate-400">انقر للمعاينة</p>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">لا يوجد مرفقات</div>
                       )}
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
                               disabled={isGenerating}
                               className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-emerald-400/30"
                             >
                                {isGenerating && replyType === 'accept' ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                رد قبول
                             </button>
                             <button 
                               onClick={() => generateAiReply('reject')}
                               disabled={isGenerating}
                               className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-white/10"
                             >
                                {isGenerating && replyType === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                                رد رفض
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
               <button 
                onClick={() => handleStatusChange(selectedReq.id, RequestStatus.APPROVED)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
               >
                 <Check size={18} /> اعتماد القبول
               </button>
               <button 
                onClick={() => handleStatusChange(selectedReq.id, RequestStatus.REJECTED)}
                className="flex-1 bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
               >
                 <X size={18} /> رفض الطلب
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;