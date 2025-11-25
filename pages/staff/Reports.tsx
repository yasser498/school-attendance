import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BarChart2, Users, AlertCircle, Clock, CheckCircle, School, ChevronDown, Loader2, Printer } from 'lucide-react';
import { getDailyAttendanceReport } from '../../services/storage';
import { AttendanceStatus, StaffUser, ClassAssignment } from '../../types';

const StaffReports: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Initial empty state
  const [reportData, setReportData] = useState<{
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    details: any[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // School Identity
  const SCHOOL_NAME = localStorage.getItem('school_name') || "المدرسة";
  const SCHOOL_LOGO = localStorage.getItem('school_logo') || "";

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }
    setCurrentUser(JSON.parse(session));
  }, [navigate]);

  // Fetch report when date changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch full report for the day
        const data = await getDailyAttendanceReport(selectedDate);
        
        // Filter details to only show classes assigned to this teacher
        const assignedClasses = currentUser.assignments || [];
        const filteredDetails = data.details.filter(d => 
            assignedClasses.some(a => a.grade === d.grade && a.className === d.className)
        );

        // Re-calculate totals based on filtered details
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;

        // Note: The 'data' from getDailyAttendanceReport only returns absent/late details in 'details' array for compactness
        // So for 'Total Present', we can't calculate it easily without fetching all class counts.
        // For simplicity in this view, we will just show the absent/late count from the filtered list.
        
        filteredDetails.forEach(d => {
            if (d.status === AttendanceStatus.ABSENT) totalAbsent++;
            if (d.status === AttendanceStatus.LATE) totalLate++;
        });

        setReportData({
            totalPresent: 0, // Placeholder as we don't have full count in this view mode
            totalAbsent,
            totalLate,
            details: filteredDetails
        });

      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedDate, currentUser]);

  const handlePrint = () => {
    window.print();
  };

  if (!currentUser) return null;

  return (
    <>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #staff-report-print, #staff-report-print * { visibility: visible; }
            #staff-report-print { position: absolute; left: 0; top: 0; width: 100%; background: white; z-index: 9999; padding: 20px; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Print View */}
      <div id="staff-report-print" className="hidden">
         <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
            {SCHOOL_LOGO && <img src={SCHOOL_LOGO} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />}
            <h1 className="text-2xl font-bold">تقرير غياب الفصول المسندة</h1>
            <h2 className="text-lg">المعلم: {currentUser.name}</h2>
            <p className="text-sm mt-2">التاريخ: {selectedDate}</p>
         </div>
         
         <table className="w-full text-right border-collapse border border-slate-300">
            <thead>
               <tr className="bg-slate-100">
                  <th className="border p-2">الطالب</th>
                  <th className="border p-2">الصف</th>
                  <th className="border p-2">الفصل</th>
                  <th className="border p-2">الحالة</th>
               </tr>
            </thead>
            <tbody>
               {reportData?.details.map((d, idx) => (
                  <tr key={idx}>
                     <td className="border p-2">{d.studentName}</td>
                     <td className="border p-2">{d.grade}</td>
                     <td className="border p-2">{d.className}</td>
                     <td className="border p-2">{d.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}</td>
                  </tr>
               ))}
               {reportData?.details.length === 0 && (
                  <tr><td colSpan={4} className="border p-4 text-center">لا يوجد غياب أو تأخر مسجل للفصول المسندة</td></tr>
               )}
            </tbody>
         </table>
      </div>

      <div className="space-y-8 pb-12 animate-fade-in">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
               <BarChart2 className="text-amber-500" /> تقاريري
            </h1>
            <p className="text-slate-500 mt-1">سجل الغياب للفصول المسندة إليك فقط</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-slate-800 font-bold bg-white"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             </div>
             <button onClick={handlePrint} className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 transition-colors">
                <Printer size={20} />
             </button>
          </div>
        </div>

        {loading || !reportData ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <Loader2 className="mx-auto mb-4 animate-spin" size={32} />
                <p className="font-bold">جاري جلب البيانات...</p>
            </div>
        ) : (
            <>
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-red-100 p-4 rounded-full text-red-600">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase">غياب فصولي</p>
                            <p className="text-3xl font-bold text-red-900">{reportData.totalAbsent}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-amber-100 p-4 rounded-full text-amber-600">
                            <Clock size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase">تأخر فصولي</p>
                            <p className="text-3xl font-bold text-amber-900">{reportData.totalLate}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">قائمة الطلاب (فصولي فقط)</h3>
                    </div>
                    
                    {reportData.details.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Users className="mx-auto mb-2 opacity-50" size={48} />
                            <p>سجل نظيف! لا يوجد غياب أو تأخر في فصولك لهذا اليوم.</p>
                        </div>
                    ) : (
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                                <tr>
                                <th className="p-4">اسم الطالب</th>
                                <th className="p-4">الصف</th>
                                <th className="p-4">الفصل</th>
                                <th className="p-4">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reportData.details.map((d, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{d.studentName}</td>
                                    <td className="p-4 text-slate-600">{d.grade}</td>
                                    <td className="p-4 text-slate-600">{d.className}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            d.status === AttendanceStatus.ABSENT 
                                            ? 'bg-red-100 text-red-700' 
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {d.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                                        </span>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        )}
      </div>
    </>
  );
};

export default StaffReports;