
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, Phone, FileText, CheckCircle, Search, 
  Filter, TrendingUp, TrendingDown, Printer, Activity, Mail
} from 'lucide-react';
import { getStudents, getAttendanceRecords, resolveAbsenceAlert } from '../../services/storage';
import { Student, AttendanceStatus, AttendanceRecord } from '../../types';

interface AttendanceMonitorProps {
  onPrintAction?: (student: Student, type: 'pledge' | 'summons') => void;
}

const AttendanceMonitor: React.FC<AttendanceMonitorProps> = ({ onPrintAction }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([getStudents(), getAttendanceRecords()]);
        setStudents(s);
        setRecords(r);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Process Data
  const studentStats = useMemo(() => {
    const stats: Record<string, { student: Student, absent: number, late: number, riskLevel: 'high'|'medium'|'low' }> = {};
    
    // Initialize
    students.forEach(s => {
      stats[s.id] = { student: s, absent: 0, late: 0, riskLevel: 'low' };
    });

    // Count
    records.forEach(r => {
      r.records.forEach(rec => {
        if (stats[rec.studentId]) { // Ensure student still exists
            if (rec.status === AttendanceStatus.ABSENT) stats[rec.studentId].absent++;
            if (rec.status === AttendanceStatus.LATE) stats[rec.studentId].late++;
        }
      });
    });

    // Determine Risk
    Object.keys(stats).forEach(key => {
      const { absent } = stats[key];
      if (absent >= 10) stats[key].riskLevel = 'high';
      else if (absent >= 3) stats[key].riskLevel = 'medium';
      else stats[key].riskLevel = 'low';
    });

    return Object.values(stats).sort((a, b) => b.absent - a.absent);
  }, [students, records]);

  const filteredStats = studentStats.filter(s => {
    const matchesSearch = s.student.name.includes(searchTerm) || s.student.studentId.includes(searchTerm);
    const matchesRisk = filterRisk === 'all' ? true : s.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const handleAction = (studentId: string, action: string) => {
      // Log action logic here (expandable)
      alert(`تم تسجيل الإجراء: ${action}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">غياب حرج (+10)</p>
             <p className="text-2xl font-extrabold text-red-600">{studentStats.filter(s=>s.absent >= 10).length}</p>
           </div>
           <div className="bg-red-50 p-3 rounded-full text-red-600"><AlertTriangle size={24}/></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">غياب متوسط (3-9)</p>
             <p className="text-2xl font-extrabold text-amber-600">{studentStats.filter(s=>s.absent >= 3 && s.absent < 10).length}</p>
           </div>
           <div className="bg-amber-50 p-3 rounded-full text-amber-600"><Activity size={24}/></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">منتظمون</p>
             <p className="text-2xl font-extrabold text-emerald-600">{studentStats.filter(s=>s.absent < 3).length}</p>
           </div>
           <div className="bg-emerald-50 p-3 rounded-full text-emerald-600"><CheckCircle size={24}/></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الطالب..." 
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border-none rounded-xl outline-none font-bold"
            />
         </div>
         <div className="flex gap-2">
            {(['all', 'high', 'medium', 'low'] as const).map(risk => (
               <button 
                 key={risk}
                 onClick={() => setFilterRisk(risk)}
                 className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${filterRisk === risk ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
               >
                 {risk === 'all' ? 'الكل' : risk === 'high' ? 'حرج' : risk === 'medium' ? 'متوسط' : 'طبيعي'}
               </button>
            ))}
         </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
               <tr>
                  <th className="p-4">الطالب</th>
                  <th className="p-4 text-center">أيام الغياب</th>
                  <th className="p-4 text-center">أيام التأخر</th>
                  <th className="p-4">حالة الخطر</th>
                  <th className="p-4 text-center">الإجراءات</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filteredStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 group">
                     <td className="p-4">
                        <p className="font-bold text-slate-800">{stat.student.name}</p>
                        <p className="text-xs text-slate-500">{stat.student.grade} - {stat.student.className}</p>
                     </td>
                     <td className="p-4 text-center font-bold text-red-600 bg-red-50/30">{stat.absent}</td>
                     <td className="p-4 text-center font-bold text-amber-600 bg-amber-50/30">{stat.late}</td>
                     <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                           stat.riskLevel === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                           stat.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                           'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                           {stat.riskLevel === 'high' ? 'مرتفع جداً' : stat.riskLevel === 'medium' ? 'متوسط' : 'طبيعي'}
                        </span>
                     </td>
                     <td className="p-4 text-center">
                        <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleAction(stat.student.id, 'call')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="تم الاتصال"><Phone size={16}/></button>
                           {onPrintAction && (
                             <>
                               <button onClick={() => onPrintAction(stat.student, 'pledge')} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="طباعة تعهد"><FileText size={16}/></button>
                               <button onClick={() => onPrintAction(stat.student, 'summons')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="طباعة استدعاء"><Mail size={16}/></button>
                             </>
                           )}
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
         {filteredStats.length === 0 && <p className="text-center py-10 text-slate-400">لا توجد بيانات</p>}
      </div>
    </div>
  );
};

export default AttendanceMonitor;
