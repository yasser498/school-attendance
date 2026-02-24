import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Search, Phone, User, School,
    MessageCircle, QrCode, Filter, Loader2, X, Smartphone
} from 'lucide-react';
import { getStudents } from '../../services/storage';
import { Student, StaffUser } from '../../types';
import { GRADES } from '../../constants';

const StudentDirectory: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterClass, setFilterClass] = useState('');

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        const session = localStorage.getItem('ozr_staff_session');
        if (session) {
            setCurrentUser(JSON.parse(session));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const sData = await getStudents();
            setStudents(sData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique classes for the filter dropdown
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => {
            if (s.className && (!filterGrade || s.grade === filterGrade)) {
                classes.add(s.className);
            }
        });
        return Array.from(classes).sort();
    }, [students, filterGrade]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.includes(searchTerm) || s.studentId.includes(searchTerm) || (s.phone && s.phone.includes(searchTerm));
            const matchesGrade = filterGrade ? s.grade === filterGrade : true;
            const matchesClass = filterClass ? s.className === filterClass : true;
            return matchesSearch && matchesGrade && matchesClass;
        });
    }, [students, searchTerm, filterGrade, filterClass]);

    const openWhatsApp = (phone: string) => {
        if (!phone) return;
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('05')) clean = '966' + clean.substring(1);
        window.open(`https://wa.me/${clean}`, '_blank');
    };

    if (loading) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-indigo-600 mb-4" size={40} /><p className="text-slate-500 font-bold">جاري تحميل الدليل...</p></div>;

    return (
        <div className="space-y-6 pb-20 animate-fade-in relative no-print">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 p-8 rounded-3xl shadow-xl border border-indigo-800 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/10 transition-colors duration-700"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="bg-white/20 p-4 rounded-2xl text-white backdrop-blur-md border border-white/20 shadow-inner">
                        <Users size={32} />
                    </div>
                    <div className="text-white">
                        <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-md">دليل التواصل الطلابي</h1>
                        <p className="text-sm text-indigo-200 mt-1 font-medium">بحث وتواصل سريع مع أولياء الأمور</p>
                    </div>
                </div>
                <div className="hidden md:flex bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-inner shrink-0 relative z-10">
                    <div className="text-center">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">إجمالي الطلاب</p>
                        <p className="text-3xl font-extrabold text-white leading-none">{students.length}</p>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 relative overflow-visible z-20">
                <div className="relative flex-1 group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ابحث بالاسم، الهوية، أو رقم الجوال..."
                        className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 transition-all shadow-inner"
                    />
                </div>

                <div className="flex gap-4 md:w-auto w-full shrink-0">
                    <div className="relative flex-1 md:w-48">
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={filterGrade}
                            onChange={e => { setFilterGrade(e.target.value); setFilterClass(''); }}
                            className="w-full appearance-none pr-10 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-inner transition-all"
                        >
                            <option value="">كل الصفوف</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className="relative flex-1 md:w-32">
                        <School className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                            disabled={!filterGrade}
                            className="w-full appearance-none pr-10 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-inner transition-all"
                        >
                            <option value="">الشعبة</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {filteredStudents.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Search size={40} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">لا توجد نتائج مطابقة لبحثك</p>
                    <p className="text-slate-400 text-sm mt-2">جرب البحث بكلمات مختلفة أو تغيير الفلاتر</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredStudents.map(student => (
                        <div key={student.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 z-0"></div>

                            <div className="flex items-start gap-4 mb-4 relative z-10 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-bold text-xl group-hover:from-indigo-100 group-hover:to-blue-100 group-hover:text-indigo-700 transition-colors border border-slate-200 shadow-sm shrink-0">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="font-extrabold text-slate-900 truncate group-hover:text-indigo-700 transition-colors" title={student.name}>{student.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">ID: {student.studentId}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 shadow-sm"><School size={12} /> {student.grade}</span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">فصل {student.className}</span>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2 relative z-10">
                                {student.phone ? (
                                    <>
                                        <a href={`tel:${student.phone}`} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 border border-slate-200 font-bold text-xs" title="اتصال">
                                            <Phone size={16} /> اتصال
                                        </a>
                                        <button onClick={() => openWhatsApp(student.phone)} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 border border-emerald-100 font-bold text-xs" title="واتساب">
                                            <MessageCircle size={16} /> واتساب
                                        </button>
                                        <button onClick={() => setSelectedStudent(student)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-200" title="عرض الباركود">
                                            <QrCode size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="w-full text-center py-2 text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-slate-100 border-dashed">لا يوجد رقم هاتف</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Contact Modal (Replaces full profile modal for Teachers) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative transform transition-all scale-100">
                        {/* Modal Header */}
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => setSelectedStudent(null)} className="bg-white/80 backdrop-blur-md hover:bg-white p-2 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"><X size={20} /></button>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 pt-12 text-center relative border-b border-indigo-100">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="w-24 h-24 mx-auto rounded-3xl bg-white text-indigo-600 flex items-center justify-center text-4xl font-black shadow-xl border-4 border-white mb-4 relative z-10 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 relative z-10 mb-1 leading-tight px-4">{selectedStudent.name}</h2>
                            <p className="text-sm font-bold text-indigo-600 relative z-10 flex items-center justify-center gap-1"><School size={14} /> {selectedStudent.grade} - {selectedStudent.className}</p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">مسح الباركود للاتصال</p>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 inline-block">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tel:${selectedStudent.phone.replace(/^0+/, '+966')}&color=334155&bgcolor=ffffff`}
                                        alt="Call QR"
                                        className="w-40 h-40 mx-auto"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-700 font-mono font-bold text-xl mb-1">
                                    <Smartphone size={20} className="text-slate-400" />
                                    <span className="dir-ltr">{selectedStudent.phone || 'غير متوفر'}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">رقم التواصل المعتمد</p>
                            </div>

                            <div className="flex gap-3">
                                <a href={`tel:${selectedStudent.phone}`} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:-translate-y-1">
                                    <Phone size={20} /> اتصال
                                </a>
                                <button onClick={() => openWhatsApp(selectedStudent.phone)} className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] transition-all hover:-translate-y-1">
                                    <MessageCircle size={20} /> واتساب
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDirectory;
