import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Eye, Calendar, Search, User, FileText, RefreshCw, Loader2, MessageCircle } from 'lucide-react';
import { getRequests, updateRequestStatus } from '../../services/storage';
import { RequestStatus, ExcuseRequest, StaffUser } from '../../types';

const StaffRequests: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReq, setSelectedReq] = useState<ExcuseRequest | null>(null);
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }
    setCurrentUser(JSON.parse(session));
  }, [navigate]);

  const fetchRequests = async (force = false) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allRequests = await getRequests(force);
      
      // Filter requests for students in classes assigned to this staff member
      const assignedClasses = currentUser.assignments || [];
      const myRequests = allRequests.filter(req => 
        assignedClasses.some(a => a.grade === req.grade && a.className === req.className)
      );
      
      setRequests(myRequests);
    } catch (e) {
      console.error("Error fetching requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(null);
    }

    try {
      await updateRequestStatus(id, newStatus);
    } catch (error) {
      alert("فشل تحديث الحالة، يرجى المحاولة مرة أخرى.");
      fetchRequests(true); // Revert
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesFilter = filter === 'ALL' ? true : r.status === filter;
      const matchesSearch = r.studentName.includes(searchTerm) || r.studentId.includes(searchTerm);
      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  const statusStyles = {
    [RequestStatus.PENDING]: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'قيد المراجعة' },
    [RequestStatus.APPROVED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'تم القبول' },
    [RequestStatus.REJECTED]: { bg: 'bg-red-50', text: 'text-red-700', label: 'مرفوض' },
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
               <MessageCircle className="text-amber-500" /> طلبات الأعذار (فصولي)
            </h1>
            <p className="text-slate-500 mt-1">مراجعة أعذار الطلاب في الفصول المسندة إليك</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button 
               onClick={() => fetchRequests(true)}
               className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200 transition-colors"
               title="تحديث القائمة"
             >
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
             </button>
             <div className="relative w-full md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث بالطالب..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-sm"
                />
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 overflow-x-auto pb-1">
          {(['ALL', RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.REJECTED] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap
                ${filter === f ? 'bg-blue-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}
              `}
            >
              {f === 'ALL' ? 'الكل' : f === RequestStatus.PENDING ? 'جديدة' : f === RequestStatus.APPROVED ? 'مقبولة' : 'مرفوضة'}
              <span className={`mr-2 px-1.5 py-0.5 rounded text-[10px] ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {f === 'ALL' ? requests.length : requests.filter(r => r.status === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
         <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
             <Loader2 className="mx-auto mb-4 animate-spin" size={32} />
             <p className="font-bold">جاري جلب الطلبات...</p>
         </div>
      ) : filteredRequests.length === 0 ? (
         <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
             <FileText className="mx-auto mb-4 opacity-50" size={48} />
             <p className="font-bold text-lg">لا توجد طلبات مطابقة</p>
         </div>
      ) : (
         <div className="grid gap-4">
            {filteredRequests.map(req => (
               <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
                        {req.studentName.charAt(0)}
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg">{req.studentName}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                           <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{req.grade} - {req.className}</span>
                           <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                              <Calendar size={12} /> {req.date}
                           </span>
                        </div>
                        <p className="text-slate-700 mt-2 font-medium">
                           <span className="text-slate-400 text-xs ml-1">السبب:</span>
                           {req.reason}
                        </p>
                     </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                     <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[req.status].bg} ${statusStyles[req.status].text}`}>
                        {statusStyles[req.status].label}
                     </div>
                     <button 
                       onClick={() => setSelectedReq(req)}
                       className="flex items-center gap-2 text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold transition-colors text-sm border border-blue-100 w-full md:w-auto justify-center"
                     >
                        <Eye size={16} /> عرض التفاصيل واتخاذ قرار
                     </button>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Detail Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User size={20} className="text-blue-900" /> تفاصيل العذر
                 </h3>
                 <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">الطالب</label>
                       <p className="font-bold text-slate-800">{selectedReq.studentName}</p>
                       <p className="text-xs text-slate-500">{selectedReq.grade} - {selectedReq.className}</p>
                    </div>
                    
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">تاريخ الغياب</label>
                       <p className="font-bold text-blue-900 bg-blue-50 w-fit px-3 py-1 rounded-lg mt-1">{selectedReq.date}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <label className="text-xs font-bold text-slate-400 uppercase block mb-2">سبب الغياب</label>
                       <p className="font-bold text-slate-800 mb-1">{selectedReq.reason}</p>
                       <p className="text-sm text-slate-600 leading-relaxed">{selectedReq.details || 'لا توجد تفاصيل إضافية'}</p>
                    </div>

                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">المرفقات</label>
                       {selectedReq.attachmentUrl ? (
                          <a 
                            href={selectedReq.attachmentUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-3 p-3 mt-2 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-900 font-bold text-sm group"
                          >
                             <div className="bg-white p-2 rounded-lg text-blue-500 group-hover:scale-110 transition-transform"><FileText size={18} /></div>
                             <span>فتح المرفق (صورة/PDF)</span>
                          </a>
                       ) : (
                          <p className="text-sm text-slate-400 italic mt-1 bg-slate-50 p-2 rounded">لا يوجد مرفق (أو تم حذفه)</p>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => handleStatusChange(selectedReq.id, RequestStatus.APPROVED)}
                      className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                       <Check size={18} /> قبول العذر
                    </button>
                    <button 
                      onClick={() => handleStatusChange(selectedReq.id, RequestStatus.REJECTED)}
                      className="bg-white border-2 border-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                       <X size={18} /> رفض الطلب
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffRequests;