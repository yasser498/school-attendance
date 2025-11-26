
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
    Sparkles, 
    BrainCircuit, 
    Send, 
    Loader2, 
    TrendingUp, 
    AlertCircle, 
    PieChart as PieIcon,
    BarChart2,
    Lightbulb
} from 'lucide-react';
import { getAttendanceRecords, generateSmartContent, sendAdminInsight } from '../../services/storage';
import { AttendanceStatus } from '../../types';

const AttendanceStats: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // AI States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [predictionReport, setPredictionReport] = useState<string | null>(null);
  const [processingAI, setProcessingAI] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const records = await getAttendanceRecords();
            
            // Calculate aggregations
            let totalRecords = 0;
            let present = 0;
            let absent = 0;
            let late = 0;
            const classMap: Record<string, { present: number, absent: number, late: number }> = {};
            const dayMap: Record<string, number> = {};

            records.forEach(r => {
                const dayName = new Date(r.date).toLocaleDateString('ar-SA', {weekday: 'long'});
                
                // Initialize class stats
                const classKey = `${r.grade} - ${r.className}`;
                if (!classMap[classKey]) classMap[classKey] = { present: 0, absent: 0, late: 0 };

                r.records.forEach(student => {
                    totalRecords++;
                    if (student.status === AttendanceStatus.PRESENT) {
                        present++;
                        classMap[classKey].present++;
                    } else if (student.status === AttendanceStatus.ABSENT) {
                        absent++;
                        classMap[classKey].absent++;
                        dayMap[dayName] = (dayMap[dayName] || 0) + 1;
                    } else if (student.status === AttendanceStatus.LATE) {
                        late++;
                        classMap[classKey].late++;
                    }
                });
            });

            // Prepare Chart Data
            const classData = Object.entries(classMap).map(([name, counts]) => ({
                name,
                absent: counts.absent,
                late: counts.late
            }));

            // Calculate busiest day
            const busiestDay = Object.entries(dayMap).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';

            setStats({
                totalRecords,
                present,
                absent,
                late,
                rates: {
                    present: totalRecords ? Math.round((present/totalRecords)*100) : 0,
                    absent: totalRecords ? Math.round((absent/totalRecords)*100) : 0,
                    late: totalRecords ? Math.round((late/totalRecords)*100) : 0,
                },
                classData,
                busiestDay
            });

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, []);

  const generateStrategy = async () => {
    if(!stats) return;
    setProcessingAI(true);
    try {
        const prompt = `
            بصفتك خبير استراتيجي تربوي، حلل بيانات المدرسة:
            - نسبة الغياب: ${stats.rates.absent}%
            - نسبة التأخر: ${stats.rates.late}%
            - اليوم الأكثر غياباً: ${stats.busiestDay}
            
            اقترح خطة استراتيجية من 3 نقاط لتحسين الانضباط بناءً على هذه الأرقام.
        `;
        const res = await generateSmartContent(prompt);
        setAiReport(res);
    } catch(e) { alert('فشل التوليد'); }
    finally { setProcessingAI(false); }
  };

  const predictRisks = async () => {
    if(!stats) return;
    setProcessingAI(true);
    try {
        const prompt = `
            بناءً على نسبة غياب ${stats.rates.absent}%، 
            تنبأ بالمخاطر المحتملة على التحصيل الدراسي للفصل القادم.
            وما هي الفئات (مثل طلاب الصفوف الأولية) الأكثر تضرراً؟
        `;
        const res = await generateSmartContent(prompt);
        setPredictionReport(res);
    } catch(e) { alert('فشل التوليد'); }
    finally { setProcessingAI(false); }
  };

  const handleSendReport = async (content: string, role: 'counselor' | 'deputy') => {
      try {
          await sendAdminInsight(role, content);
          alert('تم الإرسال');
      } catch (e) { alert('فشل الإرسال'); }
  };

  const pieData = stats ? [
      { name: 'حضور', value: stats.present, color: '#10b981' },
      { name: 'غياب', value: stats.absent, color: '#ef4444' },
      { name: 'تأخر', value: stats.late, color: '#f59e0b' },
  ] : [];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-900" size={40}/></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <TrendingUp className="text-purple-600"/> التحليل والإحصائيات
                </h1>
                <p className="text-slate-500 mt-1">لوحة المعلومات البيانية والتحليل بالذكاء الاصطناعي</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={generateStrategy} 
                    disabled={processingAI}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                >
                    {processingAI ? <Loader2 className="animate-spin" size={16}/> : <Lightbulb size={16} />} 
                    اقتراح استراتيجية
                </button>
                <button 
                    onClick={predictRisks} 
                    disabled={processingAI}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                >
                    {processingAI ? <Loader2 className="animate-spin" size={16}/> : <BrainCircuit size={16} />} 
                    تنبؤ المخاطر
                </button>
            </div>
        </div>

        {/* AI Reports Section */}
      <div className="space-y-6">
        {/* Strategy Report */}
        {aiReport && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in relative">
            <button 
                onClick={() => setAiReport(null)} 
                className="absolute top-4 left-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
            >
                <span className="sr-only">إغلاق</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
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
                <div className="mt-6 flex gap-4 border-t pt-4">
                    <button onClick={() => handleSendReport(aiReport, 'counselor')} className="text-sm font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-lg hover:bg-purple-100 flex items-center gap-2">
                        <Send size={14}/> إرسال للموجه الطلابي
                    </button>
                    <button onClick={() => handleSendReport(aiReport, 'deputy')} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2">
                        <Send size={14}/> إرسال للوكيل
                    </button>
                </div>
            </div>
            </div>
        )}

        {/* Prediction Report */}
        {predictionReport && (
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in relative">
            <button 
                onClick={() => setPredictionReport(null)} 
                className="absolute top-4 left-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
            >
                <span className="sr-only">إغلاق</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
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
                <div className="mt-6 flex gap-4">
                    <button onClick={() => handleSendReport(predictionReport, 'counselor')} className="text-sm font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-lg hover:bg-purple-100 flex items-center gap-2">
                        <Send size={14}/> إرسال للموجه الطلابي
                    </button>
                    <button onClick={() => handleSendReport(predictionReport, 'deputy')} className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2">
                        <Send size={14}/> إرسال للوكيل
                    </button>
                </div>
            </div>
            </div>
        )}
      </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">نسبة الحضور</p>
                <p className="text-4xl font-extrabold text-emerald-600">{stats.rates.present}%</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">نسبة الغياب</p>
                <p className="text-4xl font-extrabold text-red-600">{stats.rates.absent}%</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">نسبة التأخر</p>
                <p className="text-4xl font-extrabold text-amber-600">{stats.rates.late}%</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">اليوم الأكثر غياباً</p>
                <p className="text-2xl font-extrabold text-purple-900 mt-2">{stats.busiestDay}</p>
            </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
            {/* Distribution Pie */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PieIcon className="text-blue-900" size={18}/> توزيع الحالات
                </h3>
                <div className="flex-1 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Class Comparison Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart2 className="text-blue-900" size={18}/> مقارنة الفصول (غياب وتأخير)
                </h3>
                <div className="flex-1 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.classData} barGap={0} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Legend />
                            <Bar dataKey="absent" name="غياب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="late" name="تأخر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AttendanceStats;
