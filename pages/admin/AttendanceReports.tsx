
import React, { useState, useEffect } from 'react';
import { Calendar, Printer, Loader2, Sparkles, Send, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { getDailyAttendanceReport, generateSmartContent, sendAdminInsight } from '../../services/storage';
import { AttendanceStatus } from '../../types';

const AttendanceReports: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<{
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    details: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await getDailyAttendanceReport(selectedDate);
        setReportData(data);
        setAiAnalysis(null); // Reset AI analysis on date change
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  const analyzeReport = async () => {
      if (!reportData) return;
      setAnalyzing(true);
      try {
          const prompt = `
            حلل تقرير الحضور لهذا اليوم (${selectedDate}):
            - حضور: ${reportData.totalPresent}
            - غياب: ${reportData.totalAbsent}
            - تأخر: ${reportData.totalLate}
            
            هل هذه النسب مقبولة؟ وما هي التوصيات لتحسين الانضباط غداً؟
            أجب باختصار في نقاط.
          `;
          const result = await generateSmartContent(prompt);
          setAiAnalysis(result);
      } catch (e) {
          alert("فشل التحليل");
      } finally {
          setAnalyzing(false);
      }
  };

  const handleSendAnalysis = async (target: 'counselor' | 'deputy') => {
      if (!aiAnalysis) return;
      try {
          await sendAdminInsight(target, aiAnalysis);
          alert("تم الإرسال بنجاح");
      } catch (e) {
          alert("فشل الإرسال");
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
        
        {/* Print Style */}
        <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}
        </style>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <div>
                <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-600"/> سجل الغياب اليومي
                </h1>
                <p className="text-slate-500 mt-1">عرض وطباعة كشوفات الغياب لليوم المحدد</p>
            </div>
            <div className="flex gap-2">
                <div className="relative">
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-slate-800 font-bold"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <button onClick={handlePrint} className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 transition-colors">
                    <Printer size={20} />
                </button>
            </div>
        </div>

        {loading || !reportData ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <Loader2 className="animate-spin mx-auto mb-4 text-blue-900" size={32} />
                <p className="text-slate-500 font-bold">جاري تحميل التقرير...</p>
            </div>
        ) : (
            <div id="print-area" className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                
                {/* Header for Print */}
                <div className="text-center mb-8 border-b-2 border-slate-900 pb-6 hidden print:block">
                     <h2 className="text-2xl font-bold">تقرير الغياب اليومي</h2>
                     <p className="text-lg mt-2">التاريخ: {selectedDate}</p>
                </div>

                {/* AI Section (No Print) */}
                <div className="mb-8 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 no-print">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold">
                            <Sparkles size={20} className="text-amber-500"/>
                            تحليل الذكاء الاصطناعي
                        </div>
                        {!aiAnalysis && (
                            <button 
                                onClick={analyzeReport} 
                                disabled={analyzing}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50 disabled:opacity-50"
                            >
                                {analyzing ? 'جاري التحليل...' : 'تحليل التقرير'}
                            </button>
                        )}
                    </div>

                    {aiAnalysis ? (
                        <div className="animate-fade-in relative">
                            <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line border border-white/50 mb-4 text-slate-800 font-medium">
                                {aiAnalysis}
                            </div>
                            <button 
                                onClick={() => setAiAnalysis(null)} 
                                className="absolute top-2 left-2 text-slate-400 hover:text-red-500 p-1 rounded-full transition-colors"
                            >
                                <span className="sr-only">إغلاق</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => handleSendAnalysis('counselor')} className="text-xs font-bold text-purple-700 bg-white px-3 py-2 rounded-lg hover:bg-purple-50 border border-purple-100 flex items-center gap-2 shadow-sm">
                                    <Send size={14}/> إرسال للموجه الطلابي
                                </button>
                                <button onClick={() => handleSendAnalysis('deputy')} className="text-xs font-bold text-blue-700 bg-white px-3 py-2 rounded-lg hover:bg-blue-50 border border-blue-100 flex items-center gap-2 shadow-sm">
                                    <Send size={14}/> إرسال للوكيل
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-indigo-900/60">اضغط على زر "تحليل التقرير" للحصول على رؤى ذكية حول بيانات اليوم.</p>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <span className="block text-3xl font-bold text-emerald-700 mb-1">{reportData.totalPresent}</span>
                        <span className="text-xs font-bold text-emerald-600 uppercase">حضور</span>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <span className="block text-3xl font-bold text-red-700 mb-1">{reportData.totalAbsent}</span>
                        <span className="text-xs font-bold text-red-600 uppercase">غياب</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <span className="block text-3xl font-bold text-amber-700 mb-1">{reportData.totalLate}</span>
                        <span className="text-xs font-bold text-amber-600 uppercase">تأخر</span>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-4">اسم الطالب</th>
                                <th className="p-4">الصف</th>
                                <th className="p-4">الفصل</th>
                                <th className="p-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.details.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                                        سجل نظيف! لا يوجد غياب أو تأخر مسجل اليوم.
                                    </td>
                                </tr>
                            ) : (
                                reportData.details.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-800">{item.studentName}</td>
                                        <td className="p-4 text-slate-600">{item.grade}</td>
                                        <td className="p-4 text-slate-600">{item.className}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                item.status === AttendanceStatus.ABSENT 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {item.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400 hidden print:block">
                     تم استخراج هذا التقرير آلياً من نظام عذر الإلكتروني
                </div>
            </div>
        )}
    </div>
  );
};

export default AttendanceReports;
