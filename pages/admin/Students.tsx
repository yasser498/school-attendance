
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, UserCheck, School, X, CheckSquare, Square, Loader2, RefreshCw, Edit, Save, Smartphone, Hash, GraduationCap, Filter } from 'lucide-react';
import { getStudents, syncStudentsBatch, getStudentsSync, addStudent, deleteStudent, updateStudent, getAvailableClassesForGrade } from '../../services/storage';
import { Student } from '../../types';
import { GRADES, CLASSES } from '../../constants';

// Declare XLSX for TypeScript since it's loaded via CDN in index.html
declare var XLSX: any;

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => getStudentsSync() || []);
  const [loading, setLoading] = useState(() => !getStudentsSync());
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [processingFile, setProcessingFile] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Grade filter state
  const [filterGrade, setFilterGrade] = useState('');

  // Student Form State
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    grade: GRADES[0],
    className: '',
    phone: ''
  });

  // Dynamic class list for suggestions
  const [existingClassesForForm, setExistingClassesForForm] = useState<string[]>([]);

  const fetchStudents = async (force = false) => {
    if (force || students.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await getStudents(force);
      setStudents(data);
    } catch (e: any) {
      setError(e.message || "تعذر جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      if (formData.grade && showModal) {
        const classes = await getAvailableClassesForGrade(formData.grade);
        setExistingClassesForForm(classes);
      } else {
        setExistingClassesForForm([]);
      }
    };
    loadClasses();
  }, [formData.grade, showModal]);

  const handleRefresh = () => fetchStudents(true);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.name.includes(searchTerm) || s.studentId.includes(searchTerm) || s.phone.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const filteredStudentsWithGrade = useMemo(() => {
    return filteredStudents.filter(s => !filterGrade || s.grade === filterGrade);
  }, [filteredStudents, filterGrade]);

  // --- Bulk Selection ---
  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudentsWithGrade.length) setSelectedIds([]);
    else setSelectedIds(filteredStudentsWithGrade.map(s => s.id));
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(item => item !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} طالب؟`)) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteStudent(id);
      }
      setSelectedIds([]);
      await fetchStudents(true);
      alert("تم الحذف بنجاح.");
    } catch (e) {
      alert("حدث خطأ أثناء الحذف.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentStudentId(null);
    setFormData({ name: '', studentId: '', grade: GRADES[0], className: '', phone: '' });
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setIsEditing(true);
    setCurrentStudentId(student.id);
    setFormData({
      name: student.name,
      studentId: student.studentId,
      grade: student.grade,
      className: student.className,
      phone: student.phone
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.studentId || !formData.grade || !formData.className) {
      alert("يرجى إكمال جميع الحقول المطلوبة.");
      return;
    }
    setLoading(true);
    try {
      if (isEditing && currentStudentId) {
        await updateStudent({ id: currentStudentId, ...formData });
        alert("تم تعديل بيانات الطالب بنجاح.");
      } else {
        await addStudent(formData);
        alert("تم إضافة الطالب بنجاح.");
      }
      await fetchStudents(true);
      setShowModal(false);
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      const previousStudents = [...students];
      setStudents(prev => prev.filter(s => s.id !== id));
      try {
        await deleteStudent(id);
      } catch (error) {
        alert("فشل الحذف.");
        setStudents(previousStudents);
      }
    }
  };

  // --- Excel Logic ---
  const mapCodeToGrade = (code: string | number): string => {
    const c = code ? code.toString().trim() : '';
    if (c === '725' || c === '0725' || c.includes('أول')) return 'الأول متوسط';
    if (c === '825' || c === '0825' || c.includes('ثاني')) return 'الثاني متوسط';
    if (c === '925' || c === '0925' || c.includes('ثالث')) return 'الثالث متوسط';
    if (GRADES.includes(c)) return c;
    return c || GRADES[0];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert("مكتبة Excel غير محملة."); return; }

    setProcessingFile(true);
    try {
      const currentDbStudents = await getStudents(true);
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      let ws = wb.Sheets['Sheet2'];
      if (!ws && wb.SheetNames.length > 1) {
        ws = wb.Sheets[wb.SheetNames[1]];
      }
      if (!ws) ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { alert("لا يوجد جدول صالح في الملف."); return; }

      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 'A', raw: false, defval: '' });

      const toUpsert: Student[] = [];
      const fileStudentIds = new Set<string>();

      rows.slice(1).forEach((row: any) => {
        const phone = row['B'] ? row['B'].toString().trim() : '';
        const className = row['C'] ? row['C'].toString().trim() : '';
        const gradeRaw = row['D'] ? row['D'].toString().trim() : '';
        const name = row['E'] ? row['E'].toString().trim() : '';
        const studentId = row['F'] ? row['F'].toString().trim() : '';

        if (name && studentId) {
          const grade = mapCodeToGrade(gradeRaw);
          toUpsert.push({
            id: '',
            name,
            studentId,
            grade: grade || GRADES[0],
            className: className || '1',
            phone
          });
          fileStudentIds.add(studentId);
        }
      });

      if (toUpsert.length === 0) { alert("لا توجد بيانات صالحة (تأكد من الأعمدة B-F في Sheet2)."); return; }

      const toDeleteDbIds = currentDbStudents
        .filter(s => !fileStudentIds.has(s.studentId))
        .map(s => s.id);

      const deleteMsg = toDeleteDbIds.length > 0
        ? `\n⚠️ سيتم حذف ${toDeleteDbIds.length} طالب موجودين في النظام ولكن غير موجودين في الملف.`
        : '';

      if (window.confirm(`تم العثور على ${toUpsert.length} طالب في الملف.${deleteMsg}\n\nهل تريد المتابعة وتحديث قاعدة البيانات بالكامل؟`)) {
        await syncStudentsBatch(toUpsert, [], toDeleteDbIds);
        await fetchStudents(true);
        alert("تم تحديث البيانات بنجاح!");
      }
    } catch (error: any) {
      console.error(error);
      alert(`خطأ: ${error.message}`);
    } finally {
      setProcessingFile(false);
      e.target.value = '';
    }
  };

  const inputClasses = "w-full p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none transition-all font-bold text-sm";
  const labelClasses = "block text-xs font-bold text-slate-500 uppercase mb-1.5";

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <UserCheck className="text-emerald-500" /> إدارة الطلاب
          </h1>
          <p className="text-slate-500 text-sm mt-1">قاعدة بيانات الطلاب (إضافة، تعديل، حذف، استيراد)</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={handleRefresh} className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200" title="تحديث"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={openAddModal} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl hover:bg-blue-800 font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-900/20"><Plus size={18} /> إضافة طالب</button>
          <div className="relative">
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="excel-upload" disabled={processingFile} />
            <label htmlFor="excel-upload" className={`flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-lg shadow-emerald-600/20 cursor-pointer ${processingFile ? 'opacity-50' : ''}`}>
              {processingFile ? <Loader2 className="animate-spin" size={18} /> : <span className="flex items-center gap-2">+ استيراد Excel</span>}
            </label>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلاب', value: students.length, color: 'text-blue-900', bg: 'bg-blue-50', border: 'border-blue-100', Icon: UserCheck },
          { label: 'طلاب مُختارون', value: selectedIds.length, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100', Icon: CheckSquare },
          { label: 'نتائج البحث', value: filteredStudentsWithGrade.length, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', Icon: Search },
          { label: 'الصفوف المسجلة', value: Array.from(new Set(students.map(s => s.grade))).length, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', Icon: GraduationCap },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border ${stat.border} p-4 rounded-2xl flex items-center justify-between`}>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
            <stat.Icon size={28} className={`${stat.color} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهوية أو الجوال..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 p-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-900/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-900/30 bg-white">
            <option value="">كل الصفوف</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50">
            {isBulkDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            حذف {selectedIds.length} محدد
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold">{error}</div>}

      {/* Table */}
      {loading && students.length === 0 ? (
        <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-900 mb-3" size={32} /><p className="text-slate-400 font-bold">جاري تحميل البيانات...</p></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 w-10">
                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-900 transition-colors">
                      {selectedIds.length === filteredStudentsWithGrade.length && filteredStudentsWithGrade.length > 0 ? <CheckSquare size={18} className="text-blue-900" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-4 font-extrabold text-slate-600">#</th>
                  <th className="p-4 font-extrabold text-slate-600">الاسم</th>
                  <th className="p-4 font-extrabold text-slate-600">رقم الهوية</th>
                  <th className="p-4 font-extrabold text-slate-600">الصف</th>
                  <th className="p-4 font-extrabold text-slate-600">الفصل</th>
                  <th className="p-4 font-extrabold text-slate-600">الجوال</th>
                  <th className="p-4 font-extrabold text-slate-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudentsWithGrade.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 font-bold">لا يوجد طلاب مطابقون للبحث</td></tr>
                ) : (
                  filteredStudentsWithGrade.map((student, index) => (
                    <tr key={student.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(student.id) ? 'bg-blue-50' : ''}`}>
                      <td className="p-4">
                        <button onClick={() => handleSelectOne(student.id)} className="text-slate-300 hover:text-blue-900 transition-colors">
                          {selectedIds.includes(student.id) ? <CheckSquare size={18} className="text-blue-900" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm">{student.name.charAt(0)}</div>
                          <span className="font-bold text-slate-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600 text-xs">{student.studentId}</td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-lg text-xs font-bold">{student.grade}</span></td>
                      <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold">{student.className}</span></td>
                      <td className="p-4 text-slate-500 font-mono text-xs">{student.phone || '—'}</td>
                      <td className="p-4">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(student)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors" title="تعديل"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(student.id)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors" title="حذف"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredStudentsWithGrade.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400">إجمالي {filteredStudentsWithGrade.length} طالب</p>
              {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClasses}>الاسم الكامل *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClasses} placeholder="اسم الطالب كاملاً" />
              </div>
              <div>
                <label className={labelClasses}>رقم الهوية الوطنية *</label>
                <input type="text" required value={formData.studentId} onChange={e => setFormData(p => ({ ...p, studentId: e.target.value }))} className={inputClasses} placeholder="10 أرقام" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>الصف الدراسي *</label>
                  <select required value={formData.grade} onChange={e => setFormData(p => ({ ...p, grade: e.target.value, className: '' }))} className={inputClasses}>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>الفصل *</label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={e => setFormData(p => ({ ...p, className: e.target.value }))}
                    className={inputClasses}
                    placeholder="مثال: 1 أو أ"
                    list="class-suggestions"
                  />
                  <datalist id="class-suggestions">
                    {existingClassesForForm.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className={labelClasses}>جوال ولي الأمر</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={inputClasses} placeholder="05xxxxxxxx" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isEditing ? 'حفظ التعديلات' : 'إضافة الطالب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
