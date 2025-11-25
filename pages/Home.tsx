
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, ArrowLeft, ShieldCheck, Users } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in">
      <div className="text-center space-y-4 md:space-y-6 py-8 md:py-12">
        <h1 className="text-2xl md:text-5xl font-extrabold text-blue-900 leading-tight px-4">
          نظام عذر الإلكتروني
          <span className="block text-xl md:text-3xl text-amber-600 mt-2 md:mt-3 font-semibold">متوسطة عماد الدين زنكي</span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mt-4 leading-relaxed px-6">
          حياكم الله في البوابة الرسمية لإدارة شؤون الطلاب.
          <br className="hidden md:block" />
          يمكنكم تقديم الأعذار الطبية والطارئة ومتابعة حالة الغياب إلكترونياً بكل يسر وسهولة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto px-4">
        {/* Card 1: Submit Excuse */}
        <Link to="/submit" className="group bg-white p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 flex flex-col items-center text-center hover:border-blue-400 relative overflow-hidden ring-1 ring-slate-100 active:scale-95 md:active:scale-100">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 shadow-inner">
            <FileText size={32} className="md:w-9 md:h-9" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 md:mb-3 group-hover:text-blue-900 transition-colors">تقديم عذر جديد</h2>
          <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1 leading-relaxed">
            نموذج رسمي لتقديم سبب الغياب ورفع المرفقات والإثباتات المطلوبة.
          </p>
          <div className="flex items-center text-blue-900 font-bold group-hover:gap-3 transition-all bg-blue-50 px-6 py-2 rounded-full text-sm md:text-base">
            <span>ابدأ الخدمة</span>
            <ArrowLeft size={18} className="mr-1" />
          </div>
        </Link>

        {/* Card 2: Inquiry */}
        <Link to="/inquiry" className="group bg-white p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 transition-all duration-300 flex flex-col items-center text-center hover:border-amber-400 relative overflow-hidden ring-1 ring-slate-100 active:scale-95 md:active:scale-100">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <Search size={32} className="md:w-9 md:h-9" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 md:mb-3 group-hover:text-amber-700 transition-colors">الاستعلام عن حالة</h2>
          <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1 leading-relaxed">
            تابع حالة الأعذار المقدمة سابقاً أو تحقق من سجل الغياب باستخدام رقم الهوية.
          </p>
          <div className="flex items-center text-amber-700 font-bold group-hover:gap-3 transition-all bg-amber-50 px-6 py-2 rounded-full text-sm md:text-base">
            <span>استعلام الآن</span>
            <ArrowLeft size={18} className="mr-1" />
          </div>
        </Link>
      </div>

      <div className="mt-12 md:mt-16 bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 md:p-8 shadow-lg text-white max-w-4xl mx-auto mx-4 md:mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 text-center md:text-right">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20">
              <ShieldCheck size={28} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg md:text-xl mb-1">بوابات الدخول للموظفين</h3>
              <p className="text-blue-200 text-xs md:text-sm">اختر البوابة المناسبة للصلاحيات الممنوحة لك</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <Link 
              to="/staff/login" 
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm border border-white/20 flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Users size={16} /> دخول المعلمين
            </Link>
            <Link 
              to="/admin/login" 
              className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold text-sm shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 w-full md:w-auto"
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