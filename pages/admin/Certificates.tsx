import React, { useState, useEffect } from 'react';
import { getStudents, getCertificates, addCertificate } from '../../services/storage';
import { Student, Certificate } from '../../types';
import { Award, Printer, Search, CheckCircle, Loader2, Calendar, Download } from 'lucide-react';

const Certificates: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('شوال');

    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await getStudents();
            setStudents(data);
            const certs = await getCertificates();
            setCertificates(certs);
            setLoading(false);
        };
        load();
    }, []);

    const handleGenerate = async (student: Student, type: 'attendance' | 'excellence') => {
        setGenerating(true);
        const cert: Certificate = {
            id: crypto.randomUUID(),
            studentId: student.studentId,
            studentName: student.name,
            grade: student.grade,
            className: student.className,
            month: selectedMonth,
            type: type,
            createdAt: new Date().toISOString()
        };

        try {
            await addCertificate(cert);
            setCertificates([cert, ...certificates]);
            alert(`تم إصدار الشهادة للطالب ${student.name} بنجاح! يمكن لولي الأمر رؤيتها الآن في بوابة الاستعلام.`);
        } catch (e) {
            console.error(e);
            alert("فشل إصدار الشهادة.");
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = (cert: Certificate) => {
        const printWindow = window.open('', '', 'width=1000,height=700');
        if (!printWindow) return alert('اسمح بالنوافذ المنبثقة');

        const managerName = localStorage.getItem('school_manager_name') || 'مدير المدرسة';
        const schoolName = localStorage.getItem('school_name') || 'مدرسة عماد الدين زنكي المتوسطة';

        const title = cert.type === 'attendance' ? 'شهادة شكر وانتظام' : 'شهادة تفوق وتميز';
        const compliment = cert.type === 'attendance' ? 'على انضباطه وعدم غيابه طوال شهر' : 'على تفوقه العلمي والعملي خلال شهر';

        const html = `
      <html dir="rtl">
        <head>
          <title>طباعة شهادة - ${cert.studentName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
            body { 
                font-family: 'Amiri', serif; 
                margin: 0; padding: 40px; 
                display: flex; justify-content: center; align-items: center; 
                background: #fff;
            }
            .certificate {
                width: 1000px; height: 700px;
                border: 20px solid transparent;
                border-image: repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 10px, transparent 10px, transparent 20px) 20;
                padding: 40px; text-align: center;
                position: relative;
                box-sizing: border-box;
                background: radial-gradient(circle, #ffffff 60%, #f0fdf4 100%);
            }
            .certificate::before {
                content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px;
                border: 2px solid #16a34a; z-index: -1;
            }
            .logo { font-size: 50px; margin-bottom: 10px; color: #1e3a8a; }
            .header-text { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 40px; }
            .title { font-size: 48px; color: #16a34a; font-weight: bold; margin-bottom: 30px; }
            .content { font-size: 28px; line-height: 2; color: #333; }
            .student-name { font-size: 36px; font-weight: bold; color: #b91c1c; margin: 10px 0; text-decoration: underline; }
            .footer { margin-top: 80px; display: flex; justify-content: space-around; font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .stamp { width: 120px; height: 120px; border: 4px dashed #b91c1c; border-radius: 50%; display: flex; 
                     align-items: center; justify-content: center; color: #b91c1c; font-size: 18px; transform: rotate(-15deg); margin: 0 auto; opacity: 0.6; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header-text">${schoolName}</div>
            <div class="logo">🏆</div>
            <div class="title">${title}</div>
            <div class="content">
              تتقدم إدارة المدرسة بوافر الشكر والتقدير للطالب النجم
              <div class="student-name">${cert.studentName}</div>
              المقيد بالصف ( ${cert.grade} )
              <br/>
              وذلك ${compliment} ( ${cert.month} ).
              <br/>
              سائلين الله له دوام التوفيق والنجاح.
            </div>
            <div class="footer">
              <div>
                التاريخ: ${new Date(cert.createdAt).toLocaleDateString('ar-SA')}
              </div>
              <div style="flex:1">
                 <div class="stamp">اعتماد المدرسة</div>
              </div>
              <div>
                مدير المدرسة
                <br/>
                ${managerName}
              </div>
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
    };


    const filteredStudents = students.filter(s =>
        s.name.includes(searchTerm) || s.studentId.includes(searchTerm)
    );

    return (
        <div className="space-y-6 pb-12 animate-fade-in">

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-30"></div>

                <div className="relative z-10 flex-1 text-center md:text-right">
                    <h1 className="text-3xl font-extrabold flex items-center justify-center md:justify-start gap-3 mb-2">
                        <Award size={32} className="text-yellow-400" />
                        شهادات الشكر والانضباط
                    </h1>
                    <p className="text-emerald-100 font-medium">أصدر شهادات تقديرية للطلاب الملتزمين بالحضور والتفوق وتصديرها إلكترونياً لأولياء الأمور مباشرة.</p>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-3 relative z-10 w-full md:w-auto">
                    <Calendar className="text-emerald-200" />
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-white font-bold outline-none border-b border-white/30 focus:border-white w-full md:w-48 appearance-none pb-1"
                    >
                        {['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'].map(m => (
                            <option key={m} value={m} className="text-slate-800">شهر {m}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Students search and quick generate */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Search size={20} className="text-blue-500" /> البحث عن طالب للإصدار</h2>

                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الهوية..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none mb-4 text-sm font-bold"
                    />

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-500" /></div>
                        ) : filteredStudents.slice(0, 15).map(student => (
                            <div key={student.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-teal-200 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800">{student.name}</h3>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1">{student.grade} - {student.studentId}</div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => handleGenerate(student, 'attendance')}
                                        disabled={generating}
                                        className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1"
                                    >
                                        <CheckCircle size={14} /> المواظبة
                                    </button>
                                    <button
                                        onClick={() => handleGenerate(student, 'excellence')}
                                        disabled={generating}
                                        className="flex-1 md:flex-none px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1"
                                    >
                                        <Award size={14} /> التفوق
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Issued Certificates */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Award size={20} className="text-orange-500" /> السجل للإصدارات الأخيرة</h2>
                        <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full text-xs">{certificates.length} شهادة</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {certificates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                <Award size={48} className="mb-2" />
                                <p className="font-bold text-sm">لم يتم إصدار أي شهادة حتى الآن.</p>
                            </div>
                        ) : (
                            certificates.map((cert) => (
                                <div key={cert.id} className="relative p-4 rounded-2xl border border-slate-100 bg-gradient-to-l from-white to-slate-50 flex justify-between items-center group overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-1.5 h-full ${cert.type === 'attendance' ? 'bg-emerald-400' : 'bg-purple-400'}`}></div>
                                    <div className="pr-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cert.type === 'attendance' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {cert.type === 'attendance' ? 'انتظام ومواظبة' : 'تفوق وتميز'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10} /> شهر {cert.month}</span>
                                        </div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">{cert.studentName}</h3>
                                        <span className="text-[10px] text-slate-500">{new Date(cert.createdAt).toLocaleDateString('ar-SA')}</span>
                                    </div>

                                    <button
                                        onClick={() => handlePrint(cert)}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:shadow-md transition-all shadow-sm group-hover:bg-blue-50"
                                        title="طباعة الشهادة كـ PDF"
                                    >
                                        <Printer size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Certificates;
