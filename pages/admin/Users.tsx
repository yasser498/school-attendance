import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, UserCheck, School, X, CheckSquare, Square, Loader2, RefreshCw } from 'lucide-react';
import { getStaffUsersSync, getStaffUsers, addStaffUser, deleteStaffUser, getAvailableClassesForGrade } from '../../services/storage';
import { StaffUser, ClassAssignment } from '../../types';
import { GRADES } from '../../constants';

const Users: React.FC = () => {
  // Use synchronous getter for instant load if available
  const [users, setUsers] = useState<StaffUser[]>(() => getStaffUsersSync() || []);
  const [loading, setLoading] = useState(() => !getStaffUsersSync());
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  
  // New User Form State
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  
  // Assignment State
  const [selectedGrade, setSelectedGrade] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassesForGrade, setSelectedClassesForGrade] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);

  const fetchUsers = async () => {
    // Only show loading if we didn't have cache
    if (users.length === 0) setLoading(true);
    try {
      const usersData = await getStaffUsers();
      setUsers(usersData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch classes dynamically when grade changes
  useEffect(() => {
    if (!selectedGrade) {
      setAvailableClasses([]);
      return;
    }

    const loadClasses = async () => {
      setLoadingClasses(true);
      try {
        const classes = await getAvailableClassesForGrade(selectedGrade);
        setAvailableClasses(classes);
      } catch (e) {
        console.error("Failed to load classes", e);
      } finally {
        setLoadingClasses(false);
      }
    };
    loadClasses();
  }, [selectedGrade]);


  const handleToggleClass = (className: string) => {
    if (selectedClassesForGrade.includes(className)) {
      setSelectedClassesForGrade(prev => prev.filter(c => c !== className));
    } else {
      setSelectedClassesForGrade(prev => [...prev, className]);
    }
  };

  const addAssignments = () => {
    if (!selectedGrade || selectedClassesForGrade.length === 0) return;
    
    const newAssignments = selectedClassesForGrade.map(c => ({
      grade: selectedGrade,
      className: c
    }));

    // Filter out duplicates
    const uniqueAssignments = newAssignments.filter(newA => 
      !assignments.some(existingA => existingA.grade === newA.grade && existingA.className === newA.className)
    );

    setAssignments([...assignments, ...uniqueAssignments]);
    setSelectedClassesForGrade([]); // Reset checkboxes
  };

  const removeAssignment = (index: number) => {
    const updated = [...assignments];
    updated.splice(index, 1);
    setAssignments(updated);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (users.some(u => u.passcode === passcode)) {
      alert("رمز الدخول هذا مستخدم بالفعل، الرجاء اختيار رمز آخر.");
      return;
    }

    if (assignments.length === 0) {
      alert("يجب تخصيص فصل دراسي واحد على الأقل للمعلم.");
      return;
    }

    setSaving(true);
    try {
      // Ensure plain objects
      const cleanAssignments = assignments.map(a => ({
        grade: a.grade,
        className: a.className
      }));

      const newUser: StaffUser = {
        id: '', // Will be generated
        name: name,
        passcode: passcode,
        assignments: cleanAssignments,
      };

      await addStaffUser(newUser);
      // Refresh user list
      const updatedUsers = await getStaffUsers(true);
      setUsers(updatedUsers);

      setShowAddModal(false);
      
      // Reset form
      setName(''); setPasscode(''); setAssignments([]); setSelectedGrade(''); setSelectedClassesForGrade([]);
    } catch (error) {
      console.error("Error saving user:", error);
      alert("حدث خطأ أثناء حفظ المستخدم. تأكد من اتصالك بالإنترنت وصلاحيات قاعدة البيانات.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      await deleteStaffUser(id);
      const updatedUsers = await getStaffUsers(true);
      setUsers(updatedUsers);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.includes(searchTerm)
  );

  const inputClasses = "w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all";
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-1.5";

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">إدارة المستخدمين والمعلمين</h1>
          <p className="text-slate-500 text-sm mt-1">تحديد صلاحيات الدخول للفصول الدراسية</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-900 text-white px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-colors font-bold shadow-sm hover:shadow"
        >
          <Plus size={18} /> إضافة مستخدم جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative max-w-md w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="بحث باسم المعلم..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none text-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-700 text-sm font-bold border-b border-slate-200">
            <tr>
              <th className="p-4 w-1/4">اسم المعلم</th>
              <th className="p-4 w-1/4">رمز الدخول</th>
              <th className="p-4 w-1/3">الصفوف المسندة</th>
              <th className="p-4">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filteredUsers.map(u => (
               <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                 <td className="p-4 font-bold text-slate-900 align-top">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0"><UserCheck size={16}/></div>
                      <span>{u.name}</span>
                    </div>
                 </td>
                 <td className="p-4 align-top">
                    <span className="text-slate-700 font-mono text-sm bg-slate-50 inline-block rounded px-3 py-1 tracking-widest border border-slate-200">
                      {u.passcode}
                    </span>
                 </td>
                 <td className="p-4 text-slate-700 align-top">
                    <div className="flex flex-col gap-2">
                      {u.assignments && u.assignments.length > 0 ? (
                        u.assignments.map((a, idx) => (
                           <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                             <School size={14} className="text-blue-500 shrink-0" />
                             <span className="text-xs font-bold text-slate-700">{a.grade}</span>
                             <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">فصل {a.className}</span>
                           </div>
                        ))
                      ) : (
                         <span className="text-slate-400 text-xs">لا يوجد صفوف</span>
                      )}
                    </div>
                 </td>
                 <td className="p-4 align-top">
                   <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                 </td>
               </tr>
             ))}
             {filteredUsers.length === 0 && (
                <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                        <UserCheck size={48} className="mx-auto mb-2 opacity-50" />
                        <p>لا يوجد مستخدمين مسجلين حالياً</p>
                    </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-fade-in-up border border-slate-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">✕</button>
              
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-900"><Plus size={20}/></div>
                 إضافة مستخدم جديد
              </h2>
              
              <form onSubmit={handleAddUser} className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                     <label className={labelClasses}>اسم المعلم / المشرف</label>
                     <input required value={name} onChange={e => setName(e.target.value)} className={inputClasses} placeholder="مثال: أ. محمد عبدالله" />
                   </div>
                   <div>
                      <label className={labelClasses}>رمز الدخول (رقم سري)</label>
                      <input required value={passcode} onChange={e => setPasscode(e.target.value)} className={inputClasses} placeholder="مثال: 1234" />
                   </div>
                 </div>

                 {/* Assignments Builder */}
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">إسناد الفصول</div>
                    
                    <div className="space-y-4">
                       <div>
                          <label className={labelClasses}>1. اختر الصف الدراسي</label>
                          <select 
                            value={selectedGrade} 
                            onChange={e => { setSelectedGrade(e.target.value); setSelectedClassesForGrade([]); }} 
                            className={inputClasses}
                          >
                             <option value="">-- اختر الصف --</option>
                             {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                       </div>

                       {selectedGrade && (
                         <div className="animate-fade-in">
                            <label className={labelClasses}>2. حدد الفصول (الشعب)</label>
                            
                            {loadingClasses ? (
                                <div className="text-sm text-slate-500 flex items-center gap-2 p-2">
                                    <Loader2 className="animate-spin" size={14} /> جاري جلب الفصول المتاحة...
                                </div>
                            ) : availableClasses.length > 0 ? (
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {availableClasses.map(cls => {
                                        const isSelected = selectedClassesForGrade.includes(cls);
                                        return (
                                            <button
                                                key={cls}
                                                type="button"
                                                onClick={() => handleToggleClass(cls)}
                                                className={`
                                                flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                                                ${isSelected 
                                                    ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}
                                                `}
                                            >
                                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                <span className="font-bold">{cls}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-amber-50 text-amber-600 text-xs p-3 rounded-lg border border-amber-100">
                                    تنبيه: لا يوجد طلاب مسجلين في هذا الصف حتى الآن، لذلك لا تظهر أي فصول. قم بإضافة طلاب أولاً.
                                </div>
                            )}

                            <div className="mt-4 text-left">
                               <button 
                                 type="button"
                                 onClick={addAssignments}
                                 disabled={selectedClassesForGrade.length === 0}
                                 className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                               >
                                 + إضافة الفصول المحددة
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Selected Assignments List */}
                 <div>
                    <label className={labelClasses}>الفصول المسندة حالياً:</label>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[100px]">
                       {assignments.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                             {assignments.map((assign, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-100">
                                   <div className="flex items-center gap-2">
                                      <School size={16} className="text-blue-500" />
                                      <span className="text-sm font-bold text-blue-900">{assign.grade} - فصل {assign.className}</span>
                                   </div>
                                   <button 
                                     type="button" 
                                     onClick={() => removeAssignment(idx)}
                                     className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                   >
                                      <X size={16} />
                                   </button>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <p className="text-slate-400 text-sm text-center py-6">لم يتم إضافة أي فصول بعد.</p>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-slate-100">
                   <button 
                     type="submit" 
                     disabled={saving}
                     className="flex-1 bg-blue-900 text-white py-3 rounded-xl hover:bg-blue-800 font-bold transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                   >
                     {saving ? <Loader2 className="animate-spin" /> : 'حفظ المستخدم'}
                   </button>
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl hover:bg-slate-50 font-bold transition-colors">إلغاء</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;