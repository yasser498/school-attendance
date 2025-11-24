import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, ArrowLeft, ShieldCheck, Users } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="space-y-10 animate-fade-in">
      <div className="text-center space-y-6 py-12">
        <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 leading-tight">
          نظام عذر الإلكتروني
          <span className="block text-2xl md:text-3xl text-amber-600 mt-3 font-semibold">متوسطة عماد الدين زنكي</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-4 leading-relaxed">
          حياكم الله في البوابة الرسمية لإدارة شؤون الطلاب.
          <br />
          يمكنكم تقديم الأعذار الطبية والطارئة ومتابعة حالة الغياب إلكترونياً بكل يسر وسهولة.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Card 1: Submit Excuse */}
        <Link to="/submit" className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 flex flex-col items-center text-center hover:border-blue-400 relative overflow-hidden ring-1 ring-slate-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 shadow-inner">
            <FileText size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-900 transition-colors">تقديم عذر جديد</h2>
          <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
            نموذج رسمي لتقديم سبب الغياب ورفع المرفقات والإثباتات المطلوبة.
          </p>
          <div className="flex items-center text-blue-900 font-bold group-hover:gap-3 transition-all bg-blue-50 px-6 py-2 rounded-full">
            <span>ابدأ الخدمة</span>
            <ArrowLeft size={18} className="mr-1" />
          </div>
        </Link>

        {/* Card 2: Inquiry */}
        <Link to="/inquiry" className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 flex flex-col items-center text-center hover:border-amber-400 relative overflow-hidden ring-1 ring-slate-100">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <Search size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-amber-700 transition-colors">الاستعلام عن حالة</h2>
          <p className="text-slate-500 mb-8 flex-1 leading-relaxed">
            تابع حالة الأعذار المقدمة سابقاً أو تحقق من سجل الغياب باستخدام رقم الهوية.
          </p>
          <div className="flex items-center text-amber-700 font-bold group-hover:gap-3 transition-all bg-amber-50 px-6 py-2 rounded-full">
            <span>استعلام الآن</span>
            <ArrowLeft size={18} className="mr-1" />
          </div>
        </Link>
      </div>

      <div className="mt-16 bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-8 shadow-lg text-white max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20">
              <ShieldCheck size={28} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-1">بوابات الدخول للموظفين</h3>
              <p className="text-blue-200 text-sm">اختر البوابة المناسبة للصلاحيات الممنوحة لك</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Link 
              to="/staff/login" 
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm border border-white/20 flex items-center gap-2"
            >
              <Users size={16} /> دخول المعلمين
            </Link>
            <Link 
              to="/admin/login" 
              className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold text-sm shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
            >
              <ShieldCheck size={16} /> دخول الإدارة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;