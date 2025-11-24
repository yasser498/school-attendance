import React, { useState, useEffect } from 'react';
import { Calendar, BarChart2, Users, AlertCircle, Clock, CheckCircle, Sparkles, Loader2, Printer } from 'lucide-react';
import { getDailyAttendanceReport } from '../../services/storage';
import { AttendanceStatus } from '../../types';
import { GoogleGenAI } from "@google/genai";

const AttendanceReports: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Initial empty state
  const [reportData, setReportData] = useState<{
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    details: any[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // AI Analysis State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Fetch report when date changes
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await getDailyAttendanceReport(selectedDate);
        setReportData(data);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setAiAnalysis(null);
  };

  const generateSmartAnalysis = async () => {
    if (!reportData) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stats = JSON.stringify({
        date: selectedDate,
        present: reportData.totalPresent,
        absent: reportData.totalAbsent,
        late: reportData.totalLate,
        absentStudents: reportData.details.filter(d => d.status === AttendanceStatus.ABSENT).map(d => `${d.studentName} (${d.grade} ${d.className})`),
        lateStudents: reportData.details.filter(d => d.status === AttendanceStatus.LATE).map(d => `${d.studentName} (${d.grade} ${d.className})`),
      });

      const prompt = `
        بصفتك مستشار إداري لمتوسطة عماد الدين زنكي.
        قم بتحليل تقرير الغياب اليومي التالي:
        ${stats}

        المطلوب:
        1. ملخص سريع لحالة الانضباط اليوم.
        2. تحديد أي صف دراسي أو فصل يبدو فيه الغياب مرتفعاً بشكل غير طبيعي.
        3. توصية واحدة للمدير.
        
        اكتب الرد بنقاط مختصرة وواضحة جداً.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAiAnalysis(response.text.trim());
    } catch (error) {
      setAiAnalysis("حدث خطأ أثناء الاتصال بالمحلل الذكي.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
         <Loader2 className="animate-spin text-blue-900 mb-4" size={48} />
         <p className="text-slate-500 font-bold">جاري جلب سجلات الحضور...</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #daily-report-print, #daily-report-print * { visibility: visible; }
            #daily-report-print { position: absolute; left: 0; top: 0; width: 100%; background: white; z-index: 9999; padding: 20px; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Print View */}
      <div id="daily-report-print" className="hidden">
         <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold">تقرير الغياب اليومي</h1>
            <h2 className="text-lg">متوسطة عماد الدين زنكي</h2>
            <p className="text-sm mt-2">التاريخ: {selectedDate}</p>
         </div>
         <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="border p-4 rounded bg-emerald-50">حضور: {reportData.totalPresent}</div>
            <div className="border p-4 rounded bg-red-50">غياب: {reportData.totalAbsent}</div>
            <div className="border p-4 rounded bg-amber-50">تأخر: {reportData.totalLate}</div>
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
               {reportData.details.map((d, idx) => (
                  <tr key={idx}>
                     <td className="border p-2">{d.studentName}</td>
                     <td className="border p-2">{d.grade}</td>
                     <td className="border p-2">{d.className}</td>
                     <td className="border p-2">{d.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}</td>
                  </tr>
               ))}
               {reportData.details.length === 0 && (
                  <tr><td colSpan={4} className="border p-4 text-center">الجميع حاضرون (ما شاء الله)</td></tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Screen View */}
      <div className="space-y-8 pb-12 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
               <BarChart2 className="text-amber-500" /> تقارير الغياب اليومي
            </h1>
            <p className="text-slate-500 mt-1">متابعة دقيقة لسجلات الحضور التي رصدها المعلمون</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-slate-800 font-bold"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             </div>
             <button onClick={handlePrint} className="bg-slate-800 text-white p-2.5 rounded-xl hover:bg-slate-700 transition-colors">
                <Printer size={20} />
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                 <CheckCircle size={32} />
              </div>
              <div>
                 <p className="text-sm font-bold text-slate-500 uppercase">حضور اليوم</p>
                 <p className="text-3xl font-bold text-emerald-900">{reportData.totalPresent}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="bg-red-100 p-4 rounded-full text-red-600">
                 <AlertCircle size={32} />
              </div>
              <div>
                 <p className="text-sm font-bold text-slate-500 uppercase">حالات الغياب</p>
                 <p className="text-3xl font-bold text-red-900">{reportData.totalAbsent}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="bg-amber-100 p-4 rounded-full text-amber-600">
                 <Clock size={32} />
              </div>
              <div>
                 <p className="text-sm font-bold text-slate-500 uppercase">حالات التأخر</p>
                 <p className="text-3xl font-bold text-amber-900">{reportData.totalLate}</p>
              </div>
           </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    <Sparkles className="text-amber-400" size={24} />
                    <h3 className="text-lg font-bold">التحليل الذكي للغياب اليومي</h3>
                 </div>
                 <button 
                   onClick={generateSmartAnalysis}
                   disabled={isGenerating}
                   className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                 >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    تحليل البيانات
                 </button>
              </div>
              
              {aiAnalysis ? (
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line border border-white/20 animate-fade-in">
                    {aiAnalysis}
                 </div>
              ) : (
                 <p className="text-blue-200 text-sm opacity-80">اضغط على زر التحليل للحصول على رؤية استراتيجية حول غياب هذا اليوم.</p>
              )}
           </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">قائمة الطلاب الغائبين والمتأخرين</h3>
           </div>
           
           {reportData.details.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                 <Users className="mx-auto mb-2 opacity-50" size={48} />
                 <p>سجل نظيف! جميع الطلاب حاضرون اليوم.</p>
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
      </div>
    </>
  );
};

export default AttendanceReports;