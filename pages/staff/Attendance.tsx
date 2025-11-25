
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, XCircle, Save, Check, School, Users, ListChecks, ChevronDown, Loader2 } from 'lucide-react';
import { getStudents, saveAttendanceRecord, getAttendanceRecordForClass } from '../../services/storage';
import { Student, StaffUser, AttendanceStatus, AttendanceRecord, ClassAssignment } from '../../types';

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<ClassAssignment | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  
  const [saved, setSaved] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (!session) {
      navigate('/staff/login');
      return;
    }
    const user = JSON.parse(session) as StaffUser;
    setCurrentUser(user);
    
    // Default to first assignment if available
    if (user.assignments && user.assignments.length > 0) {
      setCurrentAssignment(user.assignments[0]);
    }

  }, [navigate]);

  // Fetch students AND existing attendance when assignment or date changes
  useEffect(() => {
    if (!currentUser || !currentAssignment) return;

    const fetchStudentsAndAttendance = async () => {
      setLoadingStudents(true);
      try {
        // 1. Get Students for this class
        const allStudents = await getStudents();
        const classStudents = allStudents.filter(s => 
          s.grade === currentAssignment.grade && s.className === currentAssignment.className
        );
        setStudents(classStudents);

        // 2. Check if attendance is already recorded for this day/class
        const existingRecord = await getAttendanceRecordForClass(selectedDate, currentAssignment.grade, currentAssignment.className);
        
        const initialMap: Record<string, AttendanceStatus> = {};
        
        if (existingRecord) {
           // Populate map from existing DB record
           classStudents.forEach(s => {
              const record = existingRecord.records.find(r => r.studentId === s.studentId);
              initialMap[s.id] = record ? record.status : AttendanceStatus.PRESENT;
           });
           setSaved(true); // Indicate data exists
        } else {
           // Default to Present
           classStudents.forEach(s => initialMap[s.id] = AttendanceStatus.PRESENT);
           setSaved(false);
        }
        
        setAttendanceMap(initialMap);
      } catch (error) {
        console.error("Failed to load students", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsAndAttendance();
  }, [currentUser, currentAssignment, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const markAll = (status: AttendanceStatus) => {
    if (window.confirm(status === AttendanceStatus.ABSENT ? 'هل أنت متأكد من تغييب جميع الطلاب؟' : 'هل تريد تحضير الجميع؟')) {
       const newMap: Record<string, AttendanceStatus> = {};
       students.forEach(s => newMap[s.id] = status);
       setAttendanceMap(newMap);
       setSaved(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !currentAssignment) return;
    
    setSaving(true);
    try {
      const record: AttendanceRecord = {
        id: '', // ID handled by storage logic (Insert/Update)
        date: selectedDate,
        grade: currentAssignment.grade,
        className: currentAssignment.className,
        staffId: currentUser.id,
        records: students.map(s => ({
          studentId: s.studentId,
          studentName: s.name,
          status: attendanceMap[s.id] || AttendanceStatus.PRESENT
        }))
      };

      await saveAttendanceRecord(record);
      setSaved(true);
      // Remove timeout for "Saved" state so user knows data is safe
    } catch (e) {
      alert("حدث خطأ أثناء الحفظ. يرجى التحقق من الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const values = Object.values(attendanceMap);
    return {
      present: values.filter(s => s === AttendanceStatus.PRESENT).length,
      absent: values.filter(s => s === AttendanceStatus.ABSENT).length,
      late: values.filter(s => s === AttendanceStatus.LATE).length,
    };
  }, [attendanceMap]);

  if (!currentUser) return null;

  return (
    <div className="space-y-8 pb-32 animate-fade-in relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-amber-100 text-amber-700 p-2 rounded-lg"><ListChecks size={24} /></span>
              <span className="text-blue-900">أهلاً، {currentUser.name}</span>
            </h1>
            
            {/* Date Picker */}
            <div className="mt-3 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg w-fit border border-slate-200">
               <Calendar size={16} className="text-slate-400" />
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent border-none outline-none text-sm font-bold text-slate-700"
               />
            </div>
          </div>

          {/* Class Selector */}
          {currentUser.assignments && currentUser.assignments.length > 0 ? (
             <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">الصف الحالي</label>
                <div className="relative">
                  <select
                    value={currentAssignment ? JSON.stringify(currentAssignment) : ''}
                    onChange={(e) => setCurrentAssignment(JSON.parse(e.target.value))}
                    className="w-full md:min-w-[250px] appearance-none bg-blue-50 border border-blue-200 text-blue-900 font-bold py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-sm cursor-pointer"
                  >
                    {currentUser.assignments.map((assign, idx) => (
                      <option key={idx} value={JSON.stringify(assign)}>
                        {assign.grade} - فصل {assign.className}
                      </option>
                    ))}
                  </select>
                  <School className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-900 pointer-events-none" size={18} />
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={18} />
                </div>
             </div>
          ) : (
            <div className="text-red-500 font-bold">لا توجد فصول مسندة لك</div>
          )}
        </div>

        {/* Top Actions (Bulk) */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => markAll(AttendanceStatus.PRESENT)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
            <CheckCircle size={18} /> تحضير الكل
          </button>
          <button onClick={() => markAll(AttendanceStatus.ABSENT)} className="bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-red-100">
            <XCircle size={18} /> تغييب الكل
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
         <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
            <span className="block text-2xl font-bold text-emerald-700">{stats.present}</span>
            <span className="text-xs font-bold text-emerald-600">حاضر</span>
         </div>
         <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
            <span className="block text-2xl font-bold text-red-700">{stats.absent}</span>
            <span className="text-xs font-bold text-red-600">غائب</span>
         </div>
         <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
            <span className="block text-2xl font-bold text-amber-700">{stats.late}</span>
            <span className="text-xs font-bold text-amber-600">متأخر</span>
         </div>
      </div>

      {/* Student List */}
      {loadingStudents ? (
         <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
             <Loader2 className="mx-auto mb-4 animate-spin" size={32} />
             <p className="font-bold">جاري جلب بيانات الطلاب والحضور...</p>
         </div>
      ) : students.length === 0 ? (
         <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
             <Users className="mx-auto mb-4 opacity-50" size={48} />
             <p className="font-bold text-lg">لا يوجد طلاب مسجلين في هذا الفصل</p>
         </div>
      ) : (
         <div className="grid gap-4">
            {students.map(student => (
              <div 
                key={student.id} 
                className={`bg-white p-4 rounded-xl border-2 transition-all flex items-center justify-between
                   ${attendanceMap[student.id] === AttendanceStatus.ABSENT ? 'border-red-100 shadow-sm' : 
                     attendanceMap[student.id] === AttendanceStatus.LATE ? 'border-amber-100 shadow-sm' : 
                     'border-transparent shadow-sm'}
                `}
              >
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2
                       ${attendanceMap[student.id] === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-100' :
                         attendanceMap[student.id] === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600 border-amber-100' :
                         'bg-slate-100 text-slate-600 border-slate-200'}
                    `}>
                       {student.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-800">{student.name}</h3>
                       <p className="text-xs text-slate-400 font-mono tracking-wider">{student.studentId}</p>
                    </div>
                 </div>

                 <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                      className={`p-2 rounded-md transition-all ${attendanceMap[student.id] === AttendanceStatus.PRESENT ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      title="حاضر"
                    >
                       <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, AttendanceStatus.LATE)}
                      className={`p-2 rounded-md transition-all ${attendanceMap[student.id] === AttendanceStatus.LATE ? 'bg-white text-amber-500 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      title="متأخر"
                    >
                       <Clock size={20} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                      className={`p-2 rounded-md transition-all ${attendanceMap[student.id] === AttendanceStatus.ABSENT ? 'bg-white text-red-500 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      title="غائب"
                    >
                       <XCircle size={20} />
                    </button>
                 </div>
              </div>
            ))}
         </div>
      )}

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:right-auto md:left-0 md:w-[calc(100%-18rem)] md:mr-72 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 flex justify-between items-center">
        <div className="hidden md:block text-slate-500 text-sm font-medium">
           تأكد من رصد جميع الطلاب قبل الحفظ
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`w-full md:w-auto flex items-center justify-center gap-3 px-10 py-3 rounded-xl font-bold text-lg shadow-lg transition-all ml-auto
              ${saved 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-blue-900 text-white hover:bg-blue-800 hover:shadow-blue-900/20'}
              ${saving ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          {saving ? <Loader2 className="animate-spin" /> : saved ? <Check size={24} /> : <Save size={24} />}
          <span>{saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ الغياب'}</span>
        </button>
      </div>
    </div>
  );
};

export default Attendance;
