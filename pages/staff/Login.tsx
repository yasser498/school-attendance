
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Lock, ArrowRight, KeyRound, Loader2, Briefcase, Sparkles, ChevronLeft } from 'lucide-react';
import { authenticateStaff } from '../../services/storage';

const { useNavigate } = ReactRouterDOM as any;

const StaffLogin: React.FC = () => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";
  const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";

  // Check if already logged in
  useEffect(() => {
    const session = localStorage.getItem('ozr_staff_session');
    if (session) {
      navigate('/staff/home', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate slight network delay for better UX feel
      await new Promise(resolve => setTimeout(resolve, 600));
      // Trim passcode to remove accidental spaces
      const user = await authenticateStaff(passcode.trim());
      if (user) {
        localStorage.setItem('ozr_staff_session', JSON.stringify(user));
        navigate('/staff/home', { replace: true });
      } else {
        setError('رمز الدخول غير صحيح');
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden selection:bg-teal-200 selection:text-teal-900">

      {/* Premium Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">

        {/* Header Area */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="relative inline-block mb-8 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
            <div className="relative w-28 h-28 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl flex items-center justify-center p-5 border border-white rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <img src={SCHOOL_LOGO} alt="School Logo" className="w-full h-full object-contain filter drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">بوابة <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">المنسوبين</span></h1>
          <p className="text-slate-500 text-base font-medium mt-2 flex items-center justify-center gap-2">
            تسجيل دخول المعلمين والإداريين <Sparkles size={14} className="text-amber-400" />
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-12 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>

          <div className="flex items-center gap-4 mb-10 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-3xl border border-emerald-100/50 shadow-inner">
            <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-sm border border-emerald-50">
              <Briefcase size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-emerald-800 uppercase tracking-wide">منطقة آمنة</p>
              <p className="text-xs text-emerald-600/80 font-bold mt-0.5">يرجى استخدام الرمز الشخصي المسند إليك</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-extrabold text-slate-700 tracking-wide block text-center">أدخل الرمز السري</label>
              <div className="relative group">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value); setError(''); }}
                  className="w-full py-5 bg-white/50 border-2 border-slate-200/50 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-center text-4xl font-bold text-slate-800 tracking-[0.4em] font-mono placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-sans shadow-inner hover:border-slate-300"
                  placeholder="••••"
                  maxLength={20}
                  autoFocus
                  disabled={loading}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                  <KeyRound size={22} strokeWidth={2.5} />
                </div>
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-bold bg-red-50 py-3 px-4 rounded-xl animate-bounce-slow border border-red-100">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passcode}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-extrabold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <>تأكيد الدخول <ArrowRight size={22} className="group-hover:-translate-x-1 transition-transform" /></>}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <button onClick={() => navigate('/')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/50 text-slate-500 hover:text-teal-600 hover:bg-white text-sm font-bold transition-all group border border-slate-200 hover:border-teal-100 backdrop-blur-sm shadow-sm">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
