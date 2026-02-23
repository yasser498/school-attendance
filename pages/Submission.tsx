import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Upload, CheckCircle, Calendar, User, FileText, Sparkles, AlertCircle, ChevronRight, Home, Paperclip, CalendarDays, Clock, ArrowRight, ArrowLeft, Loader2, School, Users, LineChart } from 'lucide-react';
import { getStudents, addRequest, uploadFile, generateSmartContent } from '../services/storage';
import { Student, ExcuseRequest, RequestStatus } from '../types';
import { GRADES } from '../constants';

const { useNavigate, useSearchParams } = ReactRouterDOM as any;

const Submission: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1); // 1: Form, 2: Success
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // AI State
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Lock states
    const [isStudentLocked, setIsStudentLocked] = useState(false);
    const [isDateLocked, setIsDateLocked] = useState(false);

    // Form State
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');

    // Date Logic
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [date, setDate] = useState(''); // Start Date
    const [endDate, setEndDate] = useState(''); // End Date

    const [file, setFile] = useState<File | null>(null);

    // Data
    const [students, setStudents] = useState<Student[]>([]);

    const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";

    useEffect(() => {
        const fetchData = async () => {
            const data = await getStudents();
            setStudents(data);
            setDataLoading(false);
        };
        fetchData();
    }, []);

    const availableClasses = useMemo(() => {
        if (!selectedGrade) return [];
        const classes = new Set(
            students
                .filter(s => s.grade === selectedGrade && s.className)
                .map(s => s.className)
        );
        return Array.from(classes).sort();
    }, [students, selectedGrade]);

    const availableStudents = useMemo(() => {
        return students.filter(
            (s) => s.grade === selectedGrade && s.className === selectedClass
        );
    }, [students, selectedGrade, selectedClass]);

    const selectedStudent = useMemo(() => {
        return students.find(s => s.id === selectedStudentId);
    }, [students, selectedStudentId]);

    // Auto-fill from URL
    useEffect(() => {
        if (dataLoading) return;

        const urlStudentId = searchParams.get('studentId');
        const urlDate = searchParams.get('date');

        if (urlStudentId) {
            const targetStudent = students.find(s => s.studentId === urlStudentId);
            if (targetStudent) {
                setSelectedGrade(targetStudent.grade);
                setSelectedClass(targetStudent.className);
                setSelectedStudentId(targetStudent.id);
                setIsStudentLocked(true);
            }
        }
        if (urlDate) {
            setDate(urlDate);
            setIsDateLocked(true);
            setIsMultiDay(false);
        }
    }, [searchParams, students, dataLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت.");
                e.target.value = '';
                return;
            }
            setFile(selectedFile);
        }
    };

    // AI Writing Assistant
    const handleSmartEnhance = async () => {
        if (!details.trim()) {
            alert("الرجاء كتابة تفاصيل العذر أولاً ليقوم المساعد الذكي بتحسينها.");
            return;
        }

        setIsEnhancing(true);
        try {
            const prompt = `
            بصفتك مساعداً لغوياً، قم بإعادة صياغة عذر الغياب التالي ليكون رسمياً، مهذباً، وواضحاً لتقديمه لإدارة المدرسة:
            "${details}"
            
            اكتب النص المعاد صياغته فقط بدون مقدمات.
          `;

            // Use Flash model for speed since this is a simple text task
            const enhancedText = await generateSmartContent(prompt, undefined, 'gemini-2.5-flash');
            setDetails(enhancedText.trim());
        } catch (e) {
            alert("تعذر الاتصال بالمساعد الذكي.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const getDatesInRange = (startDateStr: string, endDateStr: string) => {
        const dates = [];
        const current = new Date(startDateStr);
        const end = new Date(endDateStr);
        let count = 0;
        // Increased safety limit to 60 days
        while (current <= end && count < 60) {
            const day = current.getDay();
            // Exclude Friday (5) and Saturday (6)
            if (day !== 5 && day !== 6) {
                dates.push(new Date(current).toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
            count++;
        }
        return dates;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStudentId || !reason || !date || !file) return;

        // Single day weekend check
        if (!isMultiDay) {
            const d = new Date(date);
            const day = d.getDay();
            if (day === 5 || day === 6) {
                alert("لا يمكن تقديم عذر في عطلة نهاية الأسبوع (الجمعة والسبت).");
                return;
            }
        }

        if (isMultiDay && !endDate) { alert("يرجى تحديد تاريخ نهاية الغياب."); return; }
        if (isMultiDay && new Date(endDate) < new Date(date)) { alert("تاريخ النهاية يجب أن يكون بعد تاريخ البداية."); return; }

        let datesToSubmit: string[] = [];
        if (isMultiDay) {
            datesToSubmit = getDatesInRange(date, endDate);
            if (datesToSubmit.length === 0) {
                alert("الفترة المحددة تحتوي فقط على أيام عطلة نهاية أسبوع، أو التواريخ غير صحيحة.");
                return;
            }
        } else {
            datesToSubmit = [date];
        }

        setLoading(true);

        try {
            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
                // 1. Upload File
                let attachmentUrl = "";
                try {
                    attachmentUrl = await uploadFile(file);
                } catch (uploadError) {
                    console.error("Upload Error:", uploadError);
                    alert("فشل رفع المرفق. يرجى المحاولة مرة أخرى أو اختيار ملف أصغر.");
                    setLoading(false);
                    return;
                }

                if (!attachmentUrl) throw new Error("Upload failed (no URL)");

                // 2. Create Requests
                for (const d of datesToSubmit) {
                    const newRequest: ExcuseRequest = {
                        id: '',
                        studentId: student.studentId,
                        studentName: student.name,
                        grade: student.grade,
                        className: student.className,
                        date: d,
                        reason,
                        details: isMultiDay ? `${details} (عذر متصل من ${date} إلى ${endDate})` : details,
                        attachmentName: file.name,
                        attachmentUrl: attachmentUrl,
                        status: RequestStatus.PENDING,
                    };
                    await addRequest(newRequest);
                }
                setStep(2);
            } else {
                alert("خطأ في بيانات الطالب. يرجى التحديث والمحاولة مرة أخرى.");
            }
        } catch (e: any) {
            console.error("Submission Error:", e);
            alert(`حدث خطأ أثناء إرسال الطلب: ${e.message || 'تأكد من الاتصال بالإنترنت'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans pb-24 relative overflow-x-hidden">

            {/* Premium Header / Branding */}
            <div className="relative bg-[#0f172a] text-white pt-16 pb-28 md:pt-20 md:pb-32 overflow-hidden rounded-b-[3rem] md:rounded-b-[4rem] shadow-[0_20px_50px_rgba(15,23,42,0.3)] border-b border-white/10 isolate">
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f172a] via-blue-950 to-indigo-950"></div>

                <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
                </div>
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

                <div className="max-w-3xl mx-auto px-6 relative z-10 text-center animate-fade-in-up">
                    <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-amber-300 shadow-xl mb-6 mx-auto">
                        <Sparkles size={14} className="text-amber-400" />
                        <span className="tracking-wide">نظام الإدارة الذكي</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-md">
                        {SCHOOL_NAME}
                    </h1>
                    <p className="text-blue-200/90 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">
                        بوابة تقديم الأعذار الطبية والطارئة بشكل إلكتروني موثق وسريع
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 md:-mt-20 -mt-16 relative z-20">

                {step === 1 && (
                    <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">

                        {/* 1. Student Selection */}
                        <div className="p-6 md:p-10 border-b border-slate-100/50">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xl shadow-inner border border-blue-100">1</div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">بيانات الطالب</h2>
                            </div>

                            <div className="space-y-6">
                                {!isStudentLocked ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                <School size={16} className="text-slate-400" />
                                                الصف الدراسي
                                            </label>
                                            <div className="relative">
                                                <select required value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setSelectedClass(''); setSelectedStudentId(''); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none pr-12 cursor-pointer shadow-sm hover:bg-white">
                                                    <option value="">اختر الصف...</option>
                                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                                <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                <Users size={16} className="text-slate-400" />
                                                الفصل
                                            </label>
                                            <div className="relative">
                                                <select required disabled={!selectedGrade} value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudentId(''); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none pr-12 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white disabled:hover:bg-slate-50">
                                                    <option value="">اختر الفصل...</option>
                                                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 p-5 rounded-2xl border border-blue-100 flex items-center gap-4 shadow-sm">
                                        <div className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">تقديم عذر للطالب</p>
                                            <p className="font-extrabold text-slate-900 text-lg">{selectedStudent?.name}</p>
                                            <p className="text-sm text-slate-500 font-medium">{selectedStudent?.grade} - {selectedStudent?.className}</p>
                                        </div>
                                    </div>
                                )}

                                {!isStudentLocked && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            اسم الطالب
                                        </label>
                                        <div className="relative">
                                            <select required disabled={!selectedClass} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none pr-12 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white disabled:hover:bg-slate-50">
                                                <option value="">اختر الطالب من القائمة...</option>
                                                {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Absence Details */}
                        <div className="p-6 md:p-10 border-b border-slate-100/50">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 flex items-center justify-center font-extrabold text-xl shadow-inner border border-purple-100">2</div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">تفاصيل الغياب</h2>
                            </div>

                            <div className="space-y-6">
                                {/* Toggle Multi-day */}
                                {!isDateLocked && (
                                    <div className="bg-slate-100/70 p-1.5 rounded-2xl flex items-center relative shadow-inner">
                                        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out ${isMultiDay ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}></div>
                                        <button type="button" onClick={() => setIsMultiDay(true)} className={`flex-1 relative z-10 text-sm font-bold py-3 text-center transition-colors ${isMultiDay ? 'text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                            عدة أيام متصلة
                                        </button>
                                        <button type="button" onClick={() => setIsMultiDay(false)} className={`flex-1 relative z-10 text-sm font-bold py-3 text-center transition-colors ${!isMultiDay ? 'text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                            يوم واحد فقط
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600">تاريخ الغياب (البداية)</label>
                                        <div className="relative">
                                            <input type="date" required value={date} disabled={isDateLocked} onChange={(e) => setDate(e.target.value)} className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer" />
                                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        </div>
                                    </div>
                                    {isMultiDay && (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-sm font-bold text-slate-600">تاريخ النهاية (إلى)</label>
                                            <div className="relative">
                                                <input type="date" required min={date} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all shadow-sm cursor-pointer" />
                                                <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1"><AlertCircle size={12} /> مستثنى أيام العطلة الأسبوعية</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">سبب الغياب</label>
                                    <div className="relative">
                                        <select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all appearance-none pr-12 cursor-pointer shadow-sm hover:bg-white">
                                            <option value="">اختر السبب المقنع...</option>
                                            <option value="عذر مرضي">عذر مرضي (يجب إرفاق تقرير طبي)</option>
                                            <option value="ظروف عائلية">ظروف عائلية طارئة</option>
                                            <option value="موعد مستشفى">موعد مستشفى أو مراجعة طبية</option>
                                            <option value="حالة طارئة">حالة طارئة أخرى</option>
                                            <option value="أخرى">أخرى (يرجى التوضيح)</option>
                                        </select>
                                        <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-2">
                                        <label className="text-sm font-bold text-slate-600">تفاصيل إضافية للسبب (اختياري)</label>
                                        <button
                                            type="button"
                                            onClick={handleSmartEnhance}
                                            disabled={isEnhancing || !details}
                                            className="text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 hover:shadow-md transition-all disabled:opacity-50 disabled:hover:shadow-none border border-purple-200/50"
                                        >
                                            {isEnhancing ? <Loader2 size={14} className="animate-spin text-purple-600" /> : <Sparkles size={14} className="text-purple-600" />}
                                            تحسين الصياغة بالذكاء الاصطناعي
                                        </button>
                                    </div>
                                    <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all resize-none shadow-sm hover:bg-white" placeholder="اكتب تفاصيل إضافية لتوضيح العذر لإدارة المدرسة..."></textarea>
                                </div>
                            </div>
                        </div>

                        {/* 3. Attachments */}
                        <div className="p-6 md:p-10 border-b border-slate-100/50">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-xl shadow-inner border border-emerald-100">3</div>
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">المرفقات الإثباتية</h2>
                            </div>

                            <div className={`border-2 border-dashed rounded-[2rem] p-10 text-center transition-all duration-300 cursor-pointer relative group ${file ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-inner'}`}>
                                <input type="file" id="file-upload" required accept=".jpg,.jpeg,.png,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />

                                {file ? (
                                    <div className="flex flex-col items-center animate-fade-in relative z-0">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-emerald-500 border border-emerald-100"><CheckCircle size={40} /></div>
                                        <p className="font-bold text-emerald-900 text-lg mb-1 truncate max-w-full px-4">{file.name}</p>
                                        <p className="text-sm font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg mt-2 inline-flex items-center gap-2"><Paperclip size={14} /> اضغط لتغيير الملف</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors relative z-0">
                                        <div className="w-20 h-20 bg-slate-100 group-hover:bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all">
                                            <Upload size={36} className="text-slate-400 group-hover:text-blue-500" />
                                        </div>
                                        <p className="font-extrabold text-slate-700 text-lg group-hover:text-blue-700 mb-1">اضغط هنا لرفع المرفق</p>
                                        <p className="text-sm font-medium opacity-80 mt-1">يمكنك رفع صورة طبية أو تقرير بصيغة JPG, PNG, PDF</p>
                                        <p className="text-xs mt-2 bg-slate-100 px-3 py-1 rounded-lg">الحد الأقصى 5 ميجابايت</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-6 md:p-10 bg-slate-50/50 flex justify-end items-center gap-4">
                            <button type="button" onClick={() => navigate(-1)} className="px-6 py-4 font-bold text-slate-500 hover:text-slate-800 transition-colors">إلغاء</button>
                            <button type="submit" disabled={loading} className="flex-1 md:flex-none md:w-64 bg-slate-900 overflow-hidden relative group text-white py-4 px-8 rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                                {loading ? (
                                    <span className="flex items-center gap-2 relative z-10">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        جاري المعالجة والرفع...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2 relative z-10 w-full">إرسال الطلب <ArrowLeft size={20} className="group-hover:-translate-x-2 transition-transform" /></span>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Success View */}
                {step === 2 && (
                    <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/50 p-10 text-center animate-fade-in-up max-w-lg mx-auto overflow-hidden relative z-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full opacity-50 z-0 mr-[-2rem] mt-[-2rem]"></div>

                        <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner relative z-10">
                            <CheckCircle size={56} />
                        </div>

                        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight relative z-10">اكتمل إرسال الطلب!</h2>
                        <p className="text-slate-500 text-lg mb-10 max-w-sm mx-auto font-medium relative z-10">تم استلام العذر بنجاح ومرفق معه المستندات. سيتم مراجعته من قبل الإدارة وإشعارك بالتحديثات.</p>

                        <div className="space-y-4 relative z-10">
                            <button onClick={() => navigate('/inquiry')} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                                <LineChart size={20} /> متابعة حالة الطلب
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => navigate('/')} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    <Home size={18} /> الرئيسية
                                </button>
                                <button onClick={() => window.location.reload()} className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors">
                                    عذر جديد
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Submission;
