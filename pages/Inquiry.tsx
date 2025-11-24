import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, School, Copy, Check, FileX, CalendarDays, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { getStudents, getRequests, getStudentAttendanceHistory } from '../services/storage';
import { Student, ExcuseRequest, RequestStatus, AttendanceStatus } from '../types';

const Inquiry: React.FC = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<ExcuseRequest[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<{ date: string, status: AttendanceStatus }[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId) return;

    setLoading(true);
    setSearched(false);
    setStudent(null);
    setHistory([]);
    setAttendanceHistory([]);

    try {
      const allStudents = await getStudents();
      const found = allStudents.find(s => s.studentId === searchId);
      
      if (found) {
        setStudent(found);
        const allRequests = await getRequests();
        const studentRequests = allRequests.filter(r => r.studentId === searchId);
        setHistory(studentRequests);
        
        // Fetch attendance history recorded by staff
        const attHist = await getStudentAttendanceHistory(found.studentId);
        setAttendanceHistory(attHist);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
      setSearched(true);
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

  return (
    <div className="space-y-8 pb-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-900">الاستعلام عن الطالب</h1>
        <p className="text-slate-500 mt-2">أدخل رقم الهوية (السجل المدني) للاطلاع على حالة الغياب</p>
      </div>
      
      {/* Search Box */}
      <div className="max-w-xl mx-auto bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input 
            type="text"
            placeholder="أدخل رقم الهوية..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 pl-4 pr-12 py-3 bg-transparent border-none focus:ring-0 outline-none text-lg text-slate-800 placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={loading}
            className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-md disabled:bg-slate-400"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'بحث'}
          </button>
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </form>
      </div>

      {/* Results */}
      {searched && !student && !loading && (
        <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 max-w-2xl mx-auto">
          <FileX className="mx-auto mb-4 text-slate-300" size={64} />
          <p className="text-lg font-medium">عفواً، لم يتم العثور على طالب بهذا الرقم.</p>
          <p className="text-sm">يرجى التأكد من صحة الرقم المدني وإعادة المحاولة.</p>
        </div>
      )}

      {student && (
        <div className="grid md:grid-cols-3 gap-8 animate-fade-in max-w-6xl mx-auto">
          {/* Student Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-br from-blue-900 to-slate-800 h-28 relative">
                 <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full p-1.5 shadow-md">
                    <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-blue-900">
                      <User size={48} />
                    </div>
                 </div>
              </div>
              <div className="pt-14 pb-8 px-6 text-center space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-2 text-slate-600 text-sm bg-slate-50 py-1.5 px-4 rounded-full inline-flex border border-slate-100">
                    <span className="font-mono tracking-wide">{student.studentId}</span>
                    <button onClick={() => copyToClipboard(student.studentId)} className="hover:text-blue-600 transition-colors">
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs flex items-center gap-1"><School size={14}/> الصف</span>
                    <span className="font-bold text-slate-800 text-sm">{student.grade}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs flex items-center gap-1"><School size={14}/> الفصل</span>
                    <span className="font-bold text-slate-800 text-sm">{student.className}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs flex items-center gap-1"><Phone size={14}/> الجوال</span>
                    <span className="font-bold text-slate-800 text-sm dir-ltr">{student.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Records & Requests List */}
          <div className="md:col-span-2 space-y-8">
            
            {/* 1. Official Attendance History (Recorded by Staff) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <CalendarDays className="text-blue-900" size={20} />
                  <h3 className="font-bold text-slate-800">سجل الانضباط والغياب</h3>
               </div>
               
               {attendanceHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                     <Check className="mx-auto mb-2 text-emerald-500 opacity-50" size={32} />
                     <p>لم يتم رصد أي غياب أو تأخير للطالب حتى الآن.</p>
                  </div>
               ) : (
                  <div className="divide-y divide-slate-100">
                     {attendanceHistory.map((record, idx) => {
                        // Check if there is an excuse for this absence
                        const relatedExcuse = history.find(req => req.date === record.date);
                        
                        return (
                           <div key={idx} className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4 w-full sm:w-auto">
                                 <div className={`w-2 h-12 rounded-full ${
                                    record.status === AttendanceStatus.ABSENT ? 'bg-red-500' :
                                    record.status === AttendanceStatus.LATE ? 'bg-amber-500' : 'bg-emerald-500'
                                 }`}></div>
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="font-bold text-slate-800">{record.date}</span>
                                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded border 
                                          ${record.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-100' : 
                                            record.status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                          {record.status === AttendanceStatus.ABSENT ? 'غائب' : 
                                           record.status === AttendanceStatus.LATE ? 'متأخر' : 'حاضر'}
                                       </span>
                                    </div>
                                    <p className="text-xs text-slate-500">تم الرصد بواسطة المعلم</p>
                                 </div>
                              </div>
                              
                              {record.status === AttendanceStatus.ABSENT && (
                                 <div className="w-full sm:w-auto flex justify-end">
                                    {relatedExcuse ? (
                                       <div className="flex items-center gap-2 text-xs font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                          <Check size={14} /> تم تقديم عذر ({getStatusText(relatedExcuse.status)})
                                       </div>
                                    ) : (
                                       <button 
                                          onClick={() => navigate(`/submit?studentId=${student.studentId}&date=${record.date}`)}
                                          className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                                       >
                                          <AlertCircle size={14} />
                                          تقديم عذر لهذا اليوم
                                          <ArrowLeft size={14} />
                                       </button>
                                    )}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* 2. Excuse History Table */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">أرشيف الأعذار المقدمة</h3>
              {history.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200 shadow-sm">
                  <p>لا توجد طلبات أعذار سابقة.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(req => (
                    <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg text-slate-800">{req.reason}</span>
                          <span className="text-slate-400 text-sm bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{req.date}</span>
                        </div>
                        <p className="text-slate-600 text-sm">{req.details || 'لا توجد تفاصيل إضافية'}</p>
                        {req.attachmentName && (
                          <p className="text-xs text-blue-600 mt-3 flex items-center gap-1 bg-blue-50 w-fit px-2 py-1 rounded">
                             📎 مرفق: {req.attachmentName}
                          </p>
                        )}
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getStatusColor(req.status)}`}>
                        {getStatusText(req.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiry;