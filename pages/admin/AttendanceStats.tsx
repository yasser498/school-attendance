
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Users, AlertTriangle, Clock, Calendar, Sparkles, Loader2, ArrowUpRight, BrainCircuit } from 'lucide-react';
import { getAttendanceRecords } from '../../services/storage';
import { AttendanceStatus, AttendanceRecord } from '../../types';
import { GoogleGenAI } from "@google/genai";

const AttendanceStats: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  
  // Risk Prediction State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionReport, setPredictionReport] = useState<string | null>(null);

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data Async
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAttendanceRecords();
        setAllRecords(data);
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Calculations ---

  const stats = useMemo(() => {
    let totalRecords = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    // By Class
    const classStats: Record<string, { total: number, present: number, absent: number, late: number }> = {};
    
    // By Grade (For Chart)
    const gradeStats: Record<string, { absent: number, late: number }> = {};

    // By Student (To find top violators)
    const studentStats: Record<string, { name: string, grade: string, className: string, absent: number, late: number }> = {};

    // By Day of Week
    const dayStats: Record<string, number> = {};

    allRecords.forEach(record => {
      const classKey = `${record.grade} - ${record.className}`;
      if (!classStats[classKey]) classStats[classKey] = { total: 0, present: 0, absent: 0, late: 0 };
      if (!gradeStats[record.grade]) gradeStats[record.grade] = { absent: 0, late: 0 };

      // Day analysis
      const dayName = new Date(record.date).toLocaleDateString('ar-SA', { weekday: 'long' });
      
      record.records.forEach(student => {
        totalRecords++;
        
        // Update Student Stats
        if (!studentStats[student.studentId]) {
          studentStats[student.studentId] = { 
            name: student.studentName, 
            grade: record.grade, 
            className: record.className, 
            absent: 0, 
            late: 0 
          };
        }

        if (student.status === AttendanceStatus.PRESENT) {
          totalPresent++;
          classStats[classKey].present++;
        } else if (student.status === AttendanceStatus.ABSENT) {
          totalAbsent++;
          classStats[classKey].absent++;
          gradeStats[record.grade].absent++;
          studentStats[student.studentId].absent++;
          dayStats[dayName] = (dayStats[dayName] || 0) + 1;
        } else if (student.status === AttendanceStatus.LATE) {
          totalLate++;
          classStats[classKey].late++;
          gradeStats[record.grade].late++;
          studentStats[student.studentId].late++;
        }
        
        classStats[classKey].total++;
      });
    });

    // Formatting for Charts/Tables
    const classTableData = Object.entries(classStats).map(([name, data]) => ({
      name,
      ...data,
      attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    })).sort((a, b) => b.absent - a.absent); // Sort by most absent

    const gradeChartData = Object.entries(gradeStats).map(([name, data]) => ({
      name,
      ...data
    }));

    const allStudentsStats = Object.values(studentStats).sort((a, b) => b.absent - a.absent);

    const topAbsentStudents = allStudentsStats
      .filter(s => s.absent > 0)
      .slice(0, 5);

    const topLateStudents = Object.values(studentStats)
      .sort((a, b) => b.late - a.late)
      .filter(s => s.late > 0)
      .slice(0, 5);

    const busiestAbsenceDay = Object.entries(dayStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'لا يوجد';

    return {
      totalRecords,
      totalPresent,
      totalAbsent,
      totalLate,
      attendanceRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      classTableData,
      gradeChartData,
      topAbsentStudents,
      topLateStudents,
      busiestAbsenceDay,
      allStudentsStats // Exposed for AI prediction
    };
  }, [allRecords]);

  // --- AI Analysis ---
  const generateStrategy = async () => {
    setIsGenerating(true);
    setAiReport(null);

    try {
      const key = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
      if (!key) throw new Error("Missing Key");

      const ai = new GoogleGenAI({ apiKey: key });
      
      const dataSummary = JSON.stringify({
        overallAttendanceRate: stats.attendanceRate,
        mostAbsentClass: stats.classTableData[0]?.name || 'None',
        mostAbsentDay: stats.busiestAbsenceDay,
        topViolatorsCount: stats.topAbsentStudents.length,
        totalAbsences: stats.totalAbsent,
        totalLates: stats.totalLate
      });

      const prompt = `
        بصفتك خبير استراتيجي في الإدارة المدرسية لـ "متوسطة عماد الدين زنكي".
        حلل بيانات الحضور التالية:
        ${dataSummary}

        المطلوب تقرير استراتيجي موجه للمدير يحتوي على:
        1. **تشخيص الحالة:** وصف دقيق لمستوى الانضباط العام.
        2. **نقاط الضعف:** تحديد الصفوف أو الأيام التي تحتاج لتدخل.
        3. **خطة علاجية:** اقترح 3 خطوات عملية لتقليل الغياب في الصف الأكثر غياباً.
        
        الأسلوب: رسمي، احترافي، ومختصر.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });

      setAiReport(response.text.trim());
    } catch (error) {
      setAiReport("عذراً، حدث خطأ أثناء التحليل. يرجى التأكد من إضافة المفتاح في الإعدادات.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AI Prediction ---
  const generateRiskPrediction = async () => {
    setIsPredicting(true);
    setPredictionReport(null);

    try {
      const key = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
      if (!key) throw new Error("Missing Key");

      const ai = new GoogleGenAI({ apiKey: key });
      
      // Filter relevant students (e.g. > 3 absences) to reduce token usage
      const atRiskStudents = stats.allStudentsStats
        .filter(s => s.absent > 2)
        .map(s => `- ${s.name} (${s.grade}): ${s.absent} أيام غياب`)
        .join('\n');

      if (!atRiskStudents) {
          setPredictionReport("سجل الطلاب ممتاز! لا يوجد طلاب لديهم عدد كبير من أيام الغياب (أكثر من يومين) لتحليل المخاطر.");
          setIsPredicting(false);
          return;
      }

      const prompt = `
        بصفتك نظام ذكي للتنبؤ بالمخاطر المدرسية (AI Risk Predictor).
        لديك القائمة التالية للطلاب الذين بدأوا يتغيبون:
        ${atRiskStudents}

        المطلوب تحليل تنبؤي دقيق:
        1. **تحديد الطلاب في دائرة الخطر:** من هم الطلاب الذين يقتربون من حد الحرمان أو الخطر؟
        2. **التنبؤ المستقبلي:** بناءً على هذا النمط، من تتوقع أن يتجاوز الحد المسموح الشهر القادم؟
        3. **الإجراء الاستباقي:** اقترح إجراءً وقائياً لكل فئة (مثلاً: استدعاء ولي أمر، توجيه طلابي).

        الرجاء تنسيق الرد بشكل نقاط واضحة وجدول إن أمكن.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });

      setPredictionReport(response.text.trim());
    } catch (error) {
      setPredictionReport("عذراً، حدث خطأ أثناء التنبؤ. يرجى التأكد من المفتاح.");
    } finally {
      setIsPredicting(false);
    }
  };

  const pieData = [
    { name: 'حضور', value: stats.totalPresent, color: '#10b981' },
    { name: 'غياب', value: stats.totalAbsent, color: '#ef4444' },
    { name: 'تأخر', value: stats.totalLate, color: '#f59e0b' },
  ];

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
           <Loader2 className="animate-spin text-blue-900 mb-4" size={48} />
           <p className="text-slate-500 font-bold">جاري حساب الإحصائيات...</p>
        </div>
     );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <TrendingUp className="text-amber-500" /> التحليلات والإحصائيات الذكية
          </h1>
          <p className="text-slate-500 mt-1">لوحة قيادة شاملة لمراقبة الانضباط المدرسي</p>
        </div>
        <div className="flex gap-3">
            <button 
            onClick={generateRiskPrediction}
            disabled={isPredicting}
            className="bg-white border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-70"
            >
            {isPredicting ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} />}
            <span>تنبؤ المخاطر (AI)</span>
            </button>
            <button 
            onClick={generateStrategy}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-900 to-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-70"
            >
            {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-amber-400" />}
            <span>استشارة المستشار الذكي</span>
            </button>
        </div>
      </div>

      {/* AI Reports Section */}
      <div className="space-y-6">
        {/* Strategy Report */}
        {aiReport && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in">
            <div className="bg-amber-500 p-1"></div>
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                        <Sparkles size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">التقرير الاستراتيجي (AI)</h2>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 leading-loose whitespace-pre-line font-medium">
                    {aiReport}
                </div>
            </div>
            </div>
        )}

        {/* Prediction Report */}
        {predictionReport && (
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in">
            <div className="bg-indigo-600 p-1"></div>
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                        <BrainCircuit size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">تقرير تنبؤ المخاطر (Risk Prediction)</h2>
                </div>
                <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100">
                    <div className="prose prose-indigo max-w-none text-slate-800 leading-loose whitespace-pre-line font-medium">
                        {predictionReport}
                    </div>
                </div>
            </div>
            </div>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute right-0 top-0 p-4 opacity-10"><PieChartIcon size={64} className="text-emerald-600"/></div>
           <p className="text-slate-500 font-bold text-xs uppercase mb-2">نسبة الحضور العامة</p>
           <h3 className="text-4xl font-extrabold text-emerald-600">{stats.attendanceRate}%</h3>
           <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <ArrowUpRight size={14} className="text-emerald-500 mr-1" /> مؤشر الانضباط
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute right-0 top-0 p-4 opacity-10"><Users size={64} className="text-red-600"/></div>
           <p className="text-slate-500 font-bold text-xs uppercase mb-2">إجمالي الغياب</p>
           <h3 className="text-4xl font-extrabold text-red-600">{stats.totalAbsent}</h3>
           <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              طالب
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute right-0 top-0 p-4 opacity-10"><Clock size={64} className="text-amber-600"/></div>
           <p className="text-slate-500 font-bold text-xs uppercase mb-2">إجمالي التأخير</p>
           <h3 className="text-4xl font-extrabold text-amber-600">{stats.totalLate}</h3>
           <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              طالب
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute right-0 top-0 p-4 opacity-10"><Calendar size={64} className="text-blue-600"/></div>
           <p className="text-slate-500 font-bold text-xs uppercase mb-2">اليوم الأكثر غياباً</p>
           <h3 className="text-2xl font-extrabold text-blue-900 mt-2">{stats.busiestAbsenceDay}</h3>
           <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <AlertTriangle size={14} className="text-red-500 mr-1" /> يحتاج متابعة
           </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
         {/* Chart 1: Distribution */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">توزيع حالات الحضور والغياب</h3>
            <div className="h-[300px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
               </ResponsiveContainer>
               {/* Center Text */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-5 text-center pointer-events-none">
                  <span className="block text-3xl font-bold text-slate-800">{stats.totalRecords}</span>
                  <span className="text-xs text-slate-400">سجل</span>
               </div>
            </div>
         </div>

         {/* Chart 2: Grade Stats */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">مؤشر الغياب والتأخر حسب الصفوف</h3>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.gradeChartData} barGap={0} barSize={40}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                     <YAxis axisLine={false} tickLine={false} />
                     <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                     <Legend />
                     <Bar dataKey="absent" name="غياب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                     <Bar dataKey="late" name="تأخر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Class Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">أداء الفصول (الأكثر غياباً إلى الأقل)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead className="bg-white text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <tr>
                     <th className="p-4">الفصل الدراسي</th>
                     <th className="p-4 text-center">نسبة الحضور</th>
                     <th className="p-4 text-center text-red-600">عدد الغياب</th>
                     <th className="p-4 text-center text-amber-600">عدد التأخير</th>
                     <th className="p-4 text-center">إجمالي الطلاب</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {stats.classTableData.map((cls, idx) => (
                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{cls.name}</td>
                        <td className="p-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-slate-700">{cls.attendanceRate}%</span>
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full ${cls.attendanceRate > 90 ? 'bg-emerald-500' : cls.attendanceRate > 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${cls.attendanceRate}%`}}></div>
                              </div>
                           </div>
                        </td>
                        <td className="p-4 text-center font-bold text-red-600 bg-red-50/50">{cls.absent}</td>
                        <td className="p-4 text-center font-bold text-amber-600">{cls.late}</td>
                        <td className="p-4 text-center text-slate-500">{cls.total}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Top Violators Lists */}
      <div className="grid md:grid-cols-2 gap-6">
         {/* Most Absent */}
         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
               <h3 className="font-bold text-red-800">قائمة الخطر: الأكثر غياباً</h3>
               <AlertTriangle size={18} className="text-red-500" />
            </div>
            <table className="w-full text-right">
               <thead className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                     <th className="p-4">الطالب</th>
                     <th className="p-4">الفصل</th>
                     <th className="p-4 text-center">أيام الغياب</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {stats.topAbsentStudents.map((s, idx) => (
                     <tr key={idx} className="hover:bg-red-50/20">
                        <td className="p-4 font-bold text-slate-800">{s.name}</td>
                        <td className="p-4 text-xs text-slate-500">{s.grade} - {s.className}</td>
                        <td className="p-4 text-center font-bold text-red-600">{s.absent}</td>
                     </tr>
                  ))}
                  {stats.topAbsentStudents.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400">سجل نظيف</td></tr>}
               </tbody>
            </table>
         </div>

         {/* Most Late */}
         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
               <h3 className="font-bold text-amber-800">الأكثر تأخراً</h3>
               <Clock size={18} className="text-amber-500" />
            </div>
            <table className="w-full text-right">
               <thead className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                     <th className="p-4">الطالب</th>
                     <th className="p-4">الفصل</th>
                     <th className="p-4 text-center">أيام التأخر</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {stats.topLateStudents.map((s, idx) => (
                     <tr key={idx} className="hover:bg-amber-50/20">
                        <td className="p-4 font-bold text-slate-800">{s.name}</td>
                        <td className="p-4 text-xs text-slate-500">{s.grade} - {s.className}</td>
                        <td className="p-4 text-center font-bold text-amber-600">{s.late}</td>
                     </tr>
                  ))}
                  {stats.topLateStudents.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400">سجل نظيف</td></tr>}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
