
import React, { useEffect, useState, useMemo } from 'react';
import { FileText, CheckCircle, XCircle, Search, Filter, Loader2, Paperclip, Eye, X, Download, School, Trash2 } from 'lucide-react';
import { getRequests, updateRequestStatus, deleteAttachmentFile, removeRequestAttachmentRef } from '../../services/storage';
import { ExcuseRequest, RequestStatus } from '../../types';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [search, setSearch] = useState('');
  
  // Preview Modal State (Includes ID for deleting from DB)
  const [previewFile, setPreviewFile] = useState<{url: string, type: 'image' | 'pdf' | 'other', name: string, requestId: string} | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: RequestStatus) => {
    if (!confirm(status === RequestStatus.APPROVED ? 'قبول العذر؟' : 'رفض العذر؟')) return;
    try {
      await updateRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      alert("حدث خطأ");
    }
  };

  const filteredRequests = useMemo(() => {
      return requests.filter(r => {
        if (!r) return false;
        const matchesFilter = filter === 'ALL' || r.status === filter;
        const name = r.studentName || '';
        const sid = r.studentId || '';
        const searchTerm = search || '';
        const matchesSearch = name.includes(searchTerm) || sid.includes(searchTerm);
        return matchesFilter && matchesSearch;
      });
  }, [requests, filter, search]);

  const stats = useMemo(() => {
      return {
          total: requests.length,
          pending: requests.filter(r => r.status === 'PENDING').length,
          approved: requests.filter(r => r.status === 'APPROVED').length,
          rejected: requests.filter(r => r.status === 'REJECTED').length
      };
  }, [requests]);

  const handleViewAttachment = (url?: string, name?: string, requestId?: string) => {
      if (!url || !requestId) return;
      const extension = name?.split('.').pop()?.toLowerCase();
      let type: 'image' | 'pdf' | 'other' = 'other';
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) type = 'image';
      else if (extension === 'pdf') type = 'pdf';
      
      setPreviewFile({ url, type, name: name || 'مرفق', requestId });
  };

  const handleDeleteAttachment = async () => {
      if (!previewFile) return;
      if (!confirm("هل أنت متأكد من حذف هذا المرفق نهائياً لتوفير المساحة؟ لا يمكن التراجع.")) return;

      try {
          // 1. Delete from Storage
          await deleteAttachmentFile(previewFile.url);
          
          // 2. Update DB reference
          await removeRequestAttachmentRef(previewFile.requestId);

          // 3. Update Local State
          setRequests(prev => prev.map(r => r.id === previewFile.requestId ? { ...r, attachmentUrl: undefined, attachmentName: undefined } : r));
          
          alert("تم حذف المرفق بنجاح.");
          setPreviewFile(null); // Close modal
      } catch (e) {
          console.error(e);
          alert("حدث خطأ أثناء الحذف.");
      }
  };

  const statusColors = {
    [RequestStatus.PENDING]: 'bg-amber-100 text-amber-700',
    [RequestStatus.APPROVED]: 'bg-emerald-100 text-emerald-700',
    [RequestStatus.REJECTED]: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      
      {/* 1. Dashboard Stats Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2 mb-6">
                <FileText className="text-amber-500" /> لوحة طلبات الأعذار
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div onClick={() => setFilter('ALL')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === 'ALL' ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                  <p className="text-xs text-slate-500 font-bold uppercase">الكل</p>
                  <p className="text-2xl font-extrabold text-slate-800">{stats.total}</p>
              </div>
              <div onClick={() => setFilter(RequestStatus.PENDING)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === RequestStatus.PENDING ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100 hover:border-amber-200'}`}>
                  <p className="text-xs text-amber-600 font-bold uppercase">جديد (قيد الانتظار)</p>
                  <p className="text-2xl font-extrabold text-amber-700">{stats.pending}</p>
              </div>
              <div onClick={() => setFilter(RequestStatus.APPROVED)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === RequestStatus.APPROVED ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-100 hover:border-emerald-200'}`}>
                  <p className="text-xs text-emerald-600 font-bold uppercase">مقبول</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{stats.approved}</p>
              </div>
              <div onClick={() => setFilter(RequestStatus.REJECTED)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filter === RequestStatus.REJECTED ? 'bg-red-50 border-red-300' : 'bg-white border-slate-100 hover:border-red-200'}`}>
                  <p className="text-xs text-red-600 font-bold uppercase">مرفوض</p>
                  <p className="text-2xl font-extrabold text-red-700">{stats.rejected}</p>
              </div>
          </div>
      </div>

      {/* 2. Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="بحث باسم الطالب أو الهوية..." 
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
              />
          </div>
      </div>

      {/* 3. Requests Grid */}
      {loading ? (
          <div className="py-20 text-center text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p>جاري التحميل...</p>
          </div>
      ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              <FileText className="mx-auto mb-4 opacity-50" size={48} />
              <p>لا يوجد طلبات مطابقة</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                      {/* Header with Name & Status */}
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200">
                                  {(req.studentName || '?').charAt(0)}
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-900 text-base leading-snug">{req.studentName || 'اسم غير متوفر'}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-slate-500 font-mono">{req.studentId}</span>
                                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                          <School size={10} /> {req.grade} - {req.className}
                                      </span>
                                  </div>
                              </div>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusColors[req.status]}`}>
                              {req.status === 'PENDING' ? 'جديد' : req.status === 'APPROVED' ? 'مقبول' : 'مرفوض'}
                          </span>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4 flex-1">
                          <div className="flex justify-between text-xs text-slate-500 mb-3 font-bold bg-slate-50 p-2 rounded-lg">
                              <span>تاريخ الغياب: {req.date}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-1">السبب: {req.reason}</p>
                          {req.details && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed mt-2 border border-slate-100">{req.details}</p>}
                          
                          {/* Attachment Button */}
                          {req.attachmentUrl && (
                              <button 
                                onClick={() => handleViewAttachment(req.attachmentUrl, req.attachmentName, req.id)}
                                className="mt-4 w-full flex items-center justify-center gap-2 text-xs bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100 font-bold"
                              >
                                  <Paperclip size={14}/> <span>معاينة المرفق ({req.attachmentName})</span>
                              </button>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(req.id, RequestStatus.APPROVED)} 
                            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={req.status === RequestStatus.APPROVED}
                          >
                              <CheckCircle size={14}/> قبول
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(req.id, RequestStatus.REJECTED)} 
                            className="flex-1 bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={req.status === RequestStatus.REJECTED}
                          >
                              <XCircle size={14}/> رفض
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Attachment Preview Modal */}
      {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setPreviewFile(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Eye size={18}/> معاينة المرفق</h3>
                      <button onClick={() => setPreviewFile(null)} className="p-2 bg-white rounded-full hover:bg-red-50 text-slate-500 hover:text-red-500"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
                      {previewFile.type === 'image' ? (
                          <img src={previewFile.url} alt="Attachment" className="max-w-full max-h-full rounded-lg shadow-md" />
                      ) : (
                          <div className="text-center">
                              <FileText size={64} className="mx-auto text-slate-400 mb-4"/>
                              <p className="mb-4 text-slate-600 font-bold">هذا الملف ({previewFile.name}) لا يدعم المعاينة المباشرة.</p>
                              <a href={previewFile.url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto w-fit hover:bg-blue-700">
                                  <Download size={18}/> تحميل الملف
                              </a>
                          </div>
                      )}
                  </div>

                  {/* Delete Button Footer */}
                  <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 max-w-xs">يمكنك حذف المرفق بعد الاطلاع عليه لتوفير مساحة التخزين.</p>
                      <button 
                        onClick={handleDeleteAttachment}
                        className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-100 transition-colors"
                      >
                          <Trash2 size={16}/> حذف المرفق (توفير مساحة)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Requests;
