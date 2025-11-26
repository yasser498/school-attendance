
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  X, 
  Send, 
  BrainCircuit, 
  Sparkles,
  LayoutGrid,
  BarChart2,
  Search,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getRequests, getStudents, getAttendanceRecords, generateSmartContent, sendAdminInsight } from '../../services/storage';
import { RequestStatus, AttendanceStatus } from '../../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRequests: 0,
    pendingRequests: 0,
    todayAbsence: 0
  });
  const [loading, setLoading] = useState(true);
  
  // AI Analysis State
  const [masterAnalysis, setMasterAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, requests, attendance] = await Promise.all([
          getStudents(),
          getRequests(),
          getAttendanceRecords()
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todayRecord = attendance.filter(r => r.date === today);
        let todayAbsenceCount = 0;
        todayRecord.forEach(r => {
            todayAbsenceCount += r.records.filter(s => s.status === AttendanceStatus.ABSENT).length;
        });

        setStats({
          totalStudents: students.length,
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => r.status === RequestStatus.PENDING).length,
          todayAbsence: todayAbsenceCount
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const generateMasterAnalysis = async () => {
    setAnalyzing(true);
    try {
        const prompt = `
            بصفتك مستشاراً تربوياً ذكياً، قم بتحليل البيانات التالية للمدرسة اليوم:
            - عدد الطلاب الكلي: ${stats.totalStudents}
            - حالات الغياب اليوم: ${stats.todayAbsence}
            - طلبات الأعذار المعلقة: ${stats.pendingRequests}
            
            أعطني ملخصاً تنفيذياً قصيراً (لا يتجاوز 50 كلمة) يوضح الحالة العامة للانضباط اليوم، 
            وهل الأرقام طبيعية أم تستدعي القلق؟
        `;
        const analysis = await generateSmartContent(prompt);
        setMasterAnalysis(analysis);
    } catch (e) {
        alert("فشل في توليد التحليل");
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSendDirective = async (content: string, role: 'deputy' | 'counselor') => {
      try {
          await sendAdminInsight(role, content);
          alert("تم إرسال التوجيه بنجاح");
      } catch (e) {
          alert("فشل الإرسال");
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">مركز القيادة</h1>
          <p className="text-slate-500 mt-1">نظرة عامة على أداء المدرسة اليوم</p>
        </div>
        <button 
            onClick={generateMasterAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:shadow-lg transition-all font-bold text-sm disabled:opacity-70"
        >
            {analyzing ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} />}
            <span>تحليل الذكاء الاصطناعي</span>
        </button>
      </div>

      {masterAnalysis && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 animate-fade-in relative">
              <button 
                onClick={() => setMasterAnalysis(null)} 
                className="absolute top-4 left-4 bg-slate-50 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="إغلاق التحليل"
              >
                <X size={20}/>
              </button>
              <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-purple-500" size={24}/>
                  <h3 className="text-lg font-bold text-slate-800">التحليل الذكي للبيانات</h3>
              </div>
              <div className="prose prose-indigo max-w-none text-slate-700 leading-loose whitespace-pre-line font-medium mb-8">
                  {masterAnalysis}
              </div>
              <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-6">
                  <button onClick={() => handleSendDirective(masterAnalysis, 'counselor')} className="flex-1 bg-purple-50 text-purple-700 py-3 rounded-xl font-bold hover:bg-purple-100 border border-purple-200 flex items-center justify-center gap-2">
                      <Send size={18}/> إرسال للموجه الطلابي
                  </button>
                  <button onClick={() => handleSendDirective(masterAnalysis, 'deputy')} className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-2">
                      <Send size={18}/> إرسال للوكيل
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الطلاب" value={stats.totalStudents} icon={Users} color="indigo" />
        <StatCard title="غياب اليوم" value={stats.todayAbsence} icon={AlertTriangle} color="red" />
        <StatCard title="طلبات معلقة" value={stats.pendingRequests} icon={Clock} color="orange" />
        <StatCard title="طلبات مقبولة" value={stats.totalRequests - stats.pendingRequests} icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Links */}
        <Link to="/admin/requests" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-900">طلبات الأعذار</h3>
            <p className="text-sm text-slate-500 mt-2">مراجعة واعتماد طلبات الغياب</p>
        </Link>

        <Link to="/admin/attendance-reports" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all group">
            <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <BarChart2 size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 group-hover:text-emerald-900">تقارير الحضور</h3>
            <p className="text-sm text-slate-500 mt-2">سجل الغياب اليومي والفصلي</p>
        </Link>

        <Link to="/admin/students" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-300 hover:shadow-md transition-all group">
            <div className="bg-amber-50 w-12 h-12 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                <Search size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 group-hover:text-amber-900">دليل الطلاب</h3>
            <p className="text-sm text-slate-500 mt-2">إدارة بيانات الطلاب والتواصل</p>
        </Link>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                  <ShieldCheck className="text-emerald-400"/> منطقة الإدارة
              </h3>
              <p className="text-slate-300 max-w-lg">يمكنك إدارة حسابات المعلمين والمشرفين وإسناد الصلاحيات من هنا.</p>
          </div>
          <Link to="/admin/users" className="relative z-10 bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg">
              إدارة المستخدمين
          </Link>
      </div>
    </div>
  );
};

export default Dashboard;
