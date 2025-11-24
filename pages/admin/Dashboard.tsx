import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, Clock, CheckCircle, Sparkles, Calendar, AlertTriangle, Loader2, BrainCircuit, Activity, Filter, PieChart as PieChartIcon, Search, Settings, ChevronDown, ChevronUp, Printer, BarChart3, ListFilter, ArrowRight, Users, Settings2, Trash2, Database, Key } from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getRequests, getStudents, clearRequests, clearAttendance, clearStudents } from '../../services/storage';
import { RequestStatus, ExcuseRequest, Student } from '../../types';
import { GRADES, CLASSES } from '../../constants';
import { GoogleGenAI } from "@google/genai";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'maintenance'>('overview');
  const [requests, setRequests] = useState<ExcuseRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(`بصفتك محلل بيانات ذكي لـ "متوسطة عماد الدين زنكي".
المطلوب: توليد "تقرير التصنيف الذكي" يحتوي على قسمين رئيسيين:

1. **تصنيف الأسباب الذكي (AI Reason Classification):**
   - لا تذكر الأرقام فقط، بل صنف الأسباب إلى (صحية، اجتماعية، طارئة).
   - حلل السبب الأكثر شيوعاً ولماذا قد يتكرر.

2. **تحليل حالة الطلبات (Status Intelligence):**
   - حلل نسبة القبول مقابل الرفض.
   - قدم استنتاجاً ذكياً حول سبب حالات الرفض أو القبول.

النمط: نقاط استراتيجية مختصرة جداً وموجهة لمدير المدرسة. اللغة عربية رسمية.`);
  
  // Custom Report AI State
  const [isGeneratingReportAi, setIsGeneratingReportAi] = useState(false);
  const [reportAiAnalysis, setReportAiAnalysis] = useState<string | null>(null);
  
  // API Key State
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [reqs, studs] = await Promise.all([getRequests(), getStudents()]);
        setRequests(reqs);
        setStudents(studs);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveApiKey = () => {
    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        alert("تم حفظ مفتاح API بنجاح في المتصفح.");
    }
  };

  const getGeminiClient = () => {
    // Priority: LocalStorage (User Input) -> Env Var
    const key = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
    if (!key) {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: key });
  };

  // Advanced Statistics Calculation
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === RequestStatus.PENDING).length;
    const approved = requests.filter(r => r.status === RequestStatus.APPROVED).length;
    const rejected = requests.filter(r => r.status === RequestStatus.REJECTED).length;
    
    // Calculate Top Reason
    const reasonCounts: Record<string, number> = {};
    requests.forEach(r => { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });
    const topReason = Object.keys(reasonCounts).reduce((a, b) => reasonCounts[a] > reasonCounts[b] ? a : b, 'لا يوجد');

    // Calculate Busiest Day
    const dayCounts: Record<string, number> = {};
    requests.forEach(r => { 
      const date = new Date(r.date);
      const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1; 
    });
    const busiestDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, 'لا يوجد');

    return {
      total,
      pending,
      approved,
      rejected,
      studentsCount: students.length,
      topReason,
      busiestDay,
      reasonCounts,
      dayCounts
    };
  }, [requests, students]);

  const statusData = [
    { name: 'قيد الانتظار', value: stats.pending },
    { name: 'مقبول', value: stats.approved },
    { name: 'مرفوض', value: stats.rejected },
  ];

  const gradeData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      counts[r.grade] = (counts[r.grade] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [requests]);

  // --- Custom Reports State ---
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportGrade, setReportGrade] = useState('');
  const [reportClass, setReportClass] = useState('');

  const filteredReportData = useMemo(() => {
    return requests.filter(req => {
      const rDate = new Date(req.date);
      const sDate = reportStartDate ? new Date(reportStartDate) : null;
      const eDate = reportEndDate ? new Date(reportEndDate) : null;

      if (sDate) sDate.setHours(0,0,0,0);
      if (eDate) eDate.setHours(23,59,59,999);
      rDate.setHours(12,0,0,0);

      const isDateInRange = (!sDate || rDate >= sDate) && (!eDate || rDate <= eDate);
      const isGradeMatch = !reportGrade || req.grade === reportGrade;
      const isClassMatch = !reportClass || req.className === reportClass;

      return isDateInRange && isGradeMatch && isClassMatch;
    });
  }, [requests, reportStartDate, reportEndDate, reportGrade, reportClass]);

  const reportStats = useMemo(() => {
     const total = filteredReportData.length;
     const approved = filteredReportData.filter(r => r.status === RequestStatus.APPROVED).length;
     const rejected = filteredReportData.filter(r => r.status === RequestStatus.REJECTED).length;
     const pending = filteredReportData.filter(r => r.status === RequestStatus.PENDING).length;

     const reasonCounts: Record<string, number> = {};
     filteredReportData.forEach(r => reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1);
     const reasonData = Object.keys(reasonCounts).map(key => ({ name: key, value: reasonCounts[key] }));

     return { total, approved, rejected, pending, reasonData };
  }, [filteredReportData]);

  // Main Dashboard AI Report
  const generateAiReport = async () => {
    setIsGenerating(true);
    setAiReport(null);
    try {
      const ai = getGeminiClient();
      
      const dataSummary = JSON.stringify({
        totalRequests: stats.total,
        statusBreakdown: { approved: stats.approved, rejected: stats.rejected, pending: stats.pending },
        reasonCounts: stats.reasonCounts,
        busiestDay: stats.busiestDay,
        topReason: stats.topReason,
        requestsByGrade: gradeData,
      });

      const prompt = `
        ${customPrompt}

        البيانات للإشارة إليها (JSON):
        ${dataSummary}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAiReport(response.text.trim());
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
         setAiReport("لم يتم العثور على مفتاح الذكاء الاصطناعي. يرجى إضافته في تبويب الإعدادات.");
      } else {
         setAiReport("عذراً، حدث خطأ أثناء الاتصال بالمحلل الذكي. يرجى التحقق من الاتصال والمفتاح.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered Report AI Analysis
  const generateFilteredReportAi = async () => {
    if (filteredReportData.length === 0) return;
    setIsGeneratingReportAi(true);
    setReportAiAnalysis(null);
    
    try {
      const ai = getGeminiClient();

      const filterContext = `
        نطاق التاريخ: ${reportStartDate || 'من البداية'} إلى ${reportEndDate || 'حتى الآن'}
        الصف المحدد: ${reportGrade || 'الكل'}
        الفصل المحدد: ${reportClass || 'الكل'}
      `;

      const statsSummary = JSON.stringify({
        total: reportStats.total,
        approved: reportStats.approved,
        rejected: reportStats.rejected,
        pending: reportStats.pending,
        reasons: reportStats.reasonData
      });

      const prompt = `
        بصفتك مستشار إداري لمتوسطة عماد الدين زنكي.
        قم بتحليل هذا "التقرير المخصص" للبيانات المفلترة التالية:
        ${filterContext}

        الإحصائيات المستخرجة:
        ${statsSummary}

        المطلوب تحليل معمق وذكي (Deep Insights) يركز على النقاط التالية:
        1. **تحليل الاتجاهات (Trends):** لماذا تظهر هذه الأرقام بهذا الشكل في الفترة الزمنية المحددة أو لهذا الصف؟ هل هناك نمط متصاعد أو متناقص؟
        2. **اكتشاف القيم المتطرفة (Outliers):** هل توجد نسبة رفض عالية بشكل ملفت؟ أو سبب غياب غير معتاد يتكرر؟ هل هناك فئة معينة تعاني أكثر من غيرها؟
        3. **رؤية استشرافية:** بناءً على هذه البيانات، ماذا تتوقع للأسبوع القادم؟
        4. **توصية إدارية:** خطوة عملية واحدة مباشرة للمدير للتعامل مع هذه النتائج.
        
        الرد يكون باللغة العربية، منسق، ومباشر، ويبرز المعلومات الهامة.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setReportAiAnalysis(response.text.trim());
    } catch (error) {
      setReportAiAnalysis("حدث خطأ أثناء تحليل التقرير المخصص (تأكد من مفتاح API في الإعدادات).");
    } finally {
      setIsGeneratingReportAi(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDeleteData = (type: 'requests' | 'attendance' | 'students') => {
    const messages = {
        requests: 'هل أنت متأكد من حذف جميع طلبات الأعذار؟ لا يمكن التراجع عن هذا الإجراء.',
        attendance: 'هل أنت متأكد من حذف جميع سجلات الحضور والغياب؟ لا يمكن التراجع عن هذا الإجراء.',
        students: 'تحذير شديد: هل أنت متأكد من حذف جميع بيانات الطلاب؟ سيؤدي هذا لفقدان سجلاتهم.'
    };

    if (window.confirm(messages[type])) {
        if (type === 'requests') clearRequests();
        if (type === 'attendance') clearAttendance();
        if (type === 'students') clearStudents();
        setTimeout(() => window.location.reload(), 1000);
    }
  };

  const inputClasses = "w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all text-sm";
  const labelClasses = "block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide";

  if (dataLoading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-blue-900 mb-4" size={48} />
          <p className="text-slate-500 font-bold">جاري تحميل البيانات...</p>
       </div>
    );
  }

  return (
    <>
    {/* Style for Print Layout */}
    <style>
      {`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; z-index: 9999; }
          .no-print { display: none !important; }
        }
      `}
    </style>

    {/* Printable Report Section (Hidden on screen) */}
    <div id="printable-report" className="hidden print:block p-8 bg-white text-slate-900">
       <div className="flex justify-between items-end border-b-4 border-blue-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">تقرير الغياب والأعذار</h1>
            <p className="text-xl text-amber-600 font-bold">متوسطة عماد الدين زنكي</p>
          </div>
          <div className="text-left text-sm text-slate-500">
             <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
             <p>المستخدم: مدير النظام</p>
          </div>
       </div>

       {/* Filter Context Print */}
       <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 flex flex-wrap gap-8 text-sm">
          <div>
            <span className="block text-slate-400 font-bold mb-1 text-xs uppercase">الفترة الزمنية</span>
            <span className="font-bold text-slate-900 text-lg">
              {reportStartDate ? reportStartDate : 'من البداية'} - {reportEndDate ? reportEndDate : 'إلى الآن'}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold mb-1 text-xs uppercase">الصف الدراسي</span>
            <span className="font-bold text-slate-900 text-lg">{reportGrade || 'جميع الصفوف'}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold mb-1 text-xs uppercase">الفصل</span>
            <span className="font-bold text-slate-900 text-lg">{reportClass || 'الكل'}</span>
          </div>
       </div>

       {/* Stats Grid for Print */}
       <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border border-slate-300 p-4 rounded-lg text-center">
            <span className="block text-sm text-slate-500 font-bold">إجمالي الطلبات</span>
            <span className="block text-3xl font-bold text-blue-900">{reportStats.total}</span>
          </div>
          <div className="border border-slate-300 p-4 rounded-lg text-center">
            <span className="block text-sm text-slate-500 font-bold">مقبولة</span>
            <span className="block text-3xl font-bold text-emerald-600">{reportStats.approved}</span>
          </div>
          <div className="border border-slate-300 p-4 rounded-lg text-center">
            <span className="block text-sm text-slate-500 font-bold">مرفوضة</span>
            <span className="block text-3xl font-bold text-red-600">{reportStats.rejected}</span>
          </div>
          <div className="border border-slate-300 p-4 rounded-lg text-center">
            <span className="block text-sm text-slate-500 font-bold">قيد الانتظار</span>
            <span className="block text-3xl font-bold text-amber-600">{reportStats.pending}</span>
          </div>
       </div>

       {/* Detailed Table for Print */}
       <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">سجل الطلبات التفصيلي</h3>
       <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
               <th className="p-3 border border-slate-200">م</th>
               <th className="p-3 border border-slate-200">اسم الطالب</th>
               <th className="p-3 border border-slate-200">الصف</th>
               <th className="p-3 border border-slate-200">التاريخ</th>
               <th className="p-3 border border-slate-200">السبب</th>
               <th className="p-3 border border-slate-200">الحالة</th>
            </tr>
          </thead>
          <tbody>
             {filteredReportData.map((req, idx) => (
                <tr key={req.id} className="border-b border-slate-200">
                   <td className="p-3 border border-slate-200 text-center">{idx + 1}</td>
                   <td className="p-3 border border-slate-200 font-bold">{req.studentName}</td>
                   <td className="p-3 border border-slate-200">{req.grade} - {req.className}</td>
                   <td className="p-3 border border-slate-200">{req.date}</td>
                   <td className="p-3 border border-slate-200">{req.reason}</td>
                   <td className="p-3 border border-slate-200">
                      {req.status === RequestStatus.APPROVED ? 'مقبول' : 
                       req.status === RequestStatus.REJECTED ? 'مرفوض' : 'قيد المراجعة'}
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>

    {/* Main Dashboard Content */}
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">لوحة القيادة المركزية</h1>
          <p className="text-slate-500 mt-1">تحليل ذكي لبيانات الغياب والأعذار</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الطلبات" value={stats.total} icon={FileText} color="indigo" />
        <StatCard title="قيد المراجعة" value={stats.pending} icon={Clock} color="orange" />
        <StatCard title="نسبة القبول" value={`${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`} icon={CheckCircle} color="green" />
        <StatCard title="الطلاب المسجلين" value={stats.studentsCount} icon={Users} color="indigo" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 inline-flex shadow-sm gap-1 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === 'overview'
              ? 'bg-blue-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={18} />
            <span>نظرة عامة والتحليل الذكي</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === 'reports'
              ? 'bg-blue-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ListFilter size={18} />
            <span>منشئ التقارير المخصصة</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === 'maintenance'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={18} />
            <span>الصيانة والإعدادات</span>
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: OVERVIEW & AI ----------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* AI Intelligence Section */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-3 bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:opacity-15 transition-opacity"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20">
                          <BrainCircuit size={32} className="text-amber-400" />
                      </div>
                      <div>
                          <h2 className="text-xl font-bold mb-1">المحلل الذكي للأسباب والحالات</h2>
                          <p className="text-blue-200 text-sm max-w-xl leading-relaxed">
                            يقوم الذكاء الاصطناعي بدراسة أنماط الغياب وتصنيف الأسباب وتحليل قرارات الرفض والقبول لتقديم رؤية استراتيجية.
                          </p>
                      </div>
                    </div>
                    
                    {/* Prompt Settings Toggle */}
                    <button 
                      onClick={() => setShowPromptSettings(!showPromptSettings)}
                      className="flex items-center gap-2 text-xs text-blue-200 hover:text-white transition-colors mt-2"
                    >
                      <Settings size={14} />
                      <span>{showPromptSettings ? 'إخفاء إعدادات التوجيه' : 'تخصيص توجيه المحلل الذكي'}</span>
                      {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Prompt Editor */}
                    {showPromptSettings && (
                      <div className="mt-4 animate-fade-in">
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="w-full h-32 bg-black/20 border border-white/20 rounded-xl p-3 text-sm text-white placeholder:text-blue-300/50 focus:outline-none focus:border-amber-400/50 transition-colors resize-none"
                          placeholder="اكتب التوجيهات للمحلل الذكي هنا..."
                        />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={generateAiReport}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap self-start md:self-center"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20} />}
                    <span>{isGenerating ? 'جاري التحليل...' : 'بدء التصنيف الذكي'}</span>
                  </button>
              </div>

              {/* AI Output Area */}
              {aiReport && (
                <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 animate-fade-in relative">
                  <div className="absolute top-0 left-0 bg-amber-500 text-xs font-bold px-3 py-1 rounded-br-lg rounded-tl-lg">تقرير AI</div>
                  <div className="whitespace-pre-line leading-loose text-blue-50 text-sm md:text-base">
                    {aiReport}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* ... Charts code (Same as before) ... */}
            {/* Reason Classification */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-blue-900" size={20} />
                  <h3 className="font-bold text-slate-800 text-lg">الأسباب الأكثر شيوعاً</h3>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 mb-4">
                  {Object.entries(stats.reasonCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 4).map(([reason, count], index) => (
                    <div key={reason} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center text-center">
                      <span className="font-bold text-slate-700 text-sm mb-1">{reason}</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{count} طلب</span>
                    </div>
                  ))}
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-auto">
                  <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-sm">
                    <AlertTriangle size={16} />
                    <span>تحليل الذروة</span>
                  </div>
                  <p className="text-sm text-amber-900 opacity-80 leading-relaxed">
                    اليوم الأكثر غياباً هو <span className="font-bold text-amber-950">{stats.busiestDay}</span>، والسبب الرئيسي السائد هو <span className="font-bold text-amber-950">{stats.topReason}</span>.
                  </p>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <PieChartIcon className="text-blue-900" size={20} /> توزيع حالة الطلبات
              </h3>
              <div className="h-[280px] relative">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#f59e0b" /> {/* Pending */}
                        <Cell fill="#10b981" /> {/* Approved */}
                        <Cell fill="#ef4444" /> {/* Rejected */}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="text-center">
                      <PieChartIcon size={32} className="mx-auto mb-2 opacity-50"/>
                      <p>لا توجد بيانات</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: REPORTS ----------------- */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in space-y-6">
           {/* ... Reports Filters and Content (Same as before) ... */}
           {/* (Content hidden for brevity, assumes logic handles it) */}
           <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
             {/* ... */}
             <div className="p-6 md:p-8">
               {/* Filters */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <label className={labelClasses}>من تاريخ</label>
                    <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>إلى تاريخ</label>
                    <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>الصف</label>
                    <select value={reportGrade} onChange={e => setReportGrade(e.target.value)} className={inputClasses}>
                        <option value="">كل الصفوف</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>الفصل</label>
                    <select value={reportClass} onChange={e => setReportClass(e.target.value)} className={inputClasses}>
                        <option value="">كل الفصول</option>
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
              </div>
              
              {filteredReportData.length > 0 ? (
                <div className="space-y-8 animate-fade-in">
                    {/* Summary Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
                          <p className="text-xs text-blue-600 font-bold mb-1 uppercase">العدد الكلي</p>
                          <p className="text-3xl font-bold text-blue-900">{reportStats.total}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                          <p className="text-xs text-emerald-600 font-bold mb-1 uppercase">تم القبول</p>
                          <p className="text-3xl font-bold text-emerald-900">{reportStats.approved}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
                          <p className="text-xs text-red-600 font-bold mb-1 uppercase">تم الرفض</p>
                          <p className="text-3xl font-bold text-red-900">{reportStats.rejected}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                          <p className="text-xs text-amber-600 font-bold mb-1 uppercase">قيد الانتظار</p>
                          <p className="text-3xl font-bold text-amber-900">{reportStats.pending}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="text-sm text-slate-500 font-medium">
                        تم العثور على {reportStats.total} نتيجة مطابقة
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={generateFilteredReportAi}
                          disabled={isGeneratingReportAi}
                          className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isGeneratingReportAi ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                          <span>تحليل بالذكاء الاصطناعي</span>
                        </button>
                        <button
                          onClick={handlePrintReport}
                          className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          <Printer size={18} />
                          <span>طباعة التقرير</span>
                        </button>
                      </div>
                    </div>

                    {reportAiAnalysis && (
                      <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 shadow-sm relative overflow-hidden animate-fade-in">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 opacity-10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
                         <h3 className="flex items-center gap-2 font-bold text-amber-900 mb-4 relative z-10">
                            <Sparkles size={20} className="text-amber-600" />
                            رؤية الذكاء الاصطناعي للتقرير المخصص
                         </h3>
                         <div className="text-slate-800 text-sm leading-loose whitespace-pre-line relative z-10 font-medium">
                            {reportAiAnalysis}
                         </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                    <p>لا توجد بيانات تطابق شروط التصفية</p>
                </div>
              )}
             </div>
           </div>
        </div>
      )}

      {/* ----------------- TAB 3: MAINTENANCE ----------------- */}
      {activeTab === 'maintenance' && (
        <div className="animate-fade-in space-y-6">
            {/* API Key Settings */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div className="bg-amber-50 p-3 rounded-xl text-amber-600 border border-amber-100">
                        <Key size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">إعدادات الذكاء الاصطناعي (Gemini AI)</h2>
                        <p className="text-slate-500 text-sm">أدخل مفتاح API الخاص بك لتفعيل التقارير الذكية</p>
                    </div>
                </div>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className={labelClasses}>Gemini API Key</label>
                        <input 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            className={inputClasses}
                            placeholder="AIzaSy..."
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            يمكنك الحصول على المفتاح مجاناً من <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a>.
                            يتم حفظ المفتاح في متصفحك فقط.
                        </p>
                    </div>
                    <button 
                        onClick={saveApiKey}
                        className="bg-blue-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition-colors mb-[2px]"
                    >
                        حفظ المفتاح
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div className="bg-red-50 p-3 rounded-xl text-red-600 border border-red-100">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">إدارة البيانات والصيانة</h2>
                        <p className="text-slate-500 text-sm">عمليات حساسة لحذف وتصفير بيانات النظام</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h4 className="font-bold text-red-900 text-sm mb-1">منطقة خطر</h4>
                            <p className="text-xs text-red-800 leading-relaxed">
                                الإجراءات التالية لا يمكن التراجع عنها. تأكد تماماً قبل حذف أي بيانات.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-red-300 transition-colors">
                            <div className="flex items-center gap-3 mb-3 text-slate-800">
                                <FileText size={20} className="text-slate-400" />
                                <h3 className="font-bold">طلبات الأعذار</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">حذف جميع طلبات الأعذار المقدمة من أولياء الأمور.</p>
                            <button 
                                onClick={() => handleDeleteData('requests')}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 py-3 rounded-lg font-bold transition-all"
                            >
                                <Trash2 size={18} />
                                حذف السجلات
                            </button>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-red-300 transition-colors">
                            <div className="flex items-center gap-3 mb-3 text-slate-800">
                                <Clock size={20} className="text-slate-400" />
                                <h3 className="font-bold">سجلات الحضور</h3>
                            </div>
                            <p className="text-sm text-slate-500 mb-6 min-h-[40px]">حذف أرشيف الحضور والغياب اليومي.</p>
                            <button 
                                onClick={() => handleDeleteData('attendance')}
                                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 py-3 rounded-lg font-bold transition-all"
                            >
                                <Trash2 size={18} />
                                حذف السجلات
                            </button>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-xl hover:border-red-300 transition-colors md:col-span-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2 text-red-900">
                                        <Users size={20} className="text-red-500" />
                                        <h3 className="font-bold text-lg">بيانات الطلاب</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 max-w-xl">
                                        حذف قاعدة بيانات الطلاب بالكامل. <span className="font-bold text-red-500">تحذير:</span> سيؤدي هذا إلى فقدان جميع الروابط.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleDeleteData('students')}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 py-3 px-8 rounded-lg font-bold transition-all shadow-lg shadow-red-900/10"
                                >
                                    <Trash2 size={18} />
                                    حذف جميع الطلاب
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Dashboard;