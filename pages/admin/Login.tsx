
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, Loader2, KeyRound, Sparkles, ChevronLeft } from 'lucide-react';
import { ADMIN_PASSWORD } from '../../constants';

const { useNavigate } = ReactRouterDOM as any;

const Login: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";
    const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";

    // Check if already logged in
    useEffect(() => {
        const session = localStorage.getItem('ozr_admin_session');
        if (session) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate network delay for UX
        setTimeout(() => {
            if (password === ADMIN_PASSWORD) {
                localStorage.setItem('ozr_admin_session', 'true');
                navigate('/admin/dashboard', { replace: true });
            } else {
                setError('رمز الدخول غير صحيح');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-200 selection:text-blue-900 relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[650px] animate-fade-in border border-slate-100/50 relative z-10">

                {/* Left Side: Visual Identity (Premium Dark) */}
                <div className="md:w-[45%] bg-[#0f172a] relative p-12 flex flex-col justify-between text-white overflow-hidden isolate">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/60 via-[#0f172a] to-[#0f172a]"></div>

                    <div className="absolute top-0 left-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
                        <div className="aspect-square w-96 bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] opacity-30 animate-pulse-slow rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-6 animate-fade-in-up">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl glass-panel">
                            <ShieldCheck size={36} className="text-blue-400" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-extrabold mb-4 tracking-tight leading-tight">بوابة الإدارة <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">المركزية</span></h2>
                            <p className="text-slate-400 text-base leading-relaxed font-medium">
                                مركز التحكم الشامل لنظام الإدارة الذكي. وصول آمن وموثوق لإدارة البيانات، التقارير، والصلاحيات.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mt-16 md:mt-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center gap-5 bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                            <div className="bg-white p-2 rounded-2xl shadow-inner">
                                <img src={SCHOOL_LOGO} alt="School Logo" className="w-12 h-12 object-contain" />
                            </div>
                            <div>
                                <p className="font-extrabold text-base text-white tracking-wide">{SCHOOL_NAME}</p>
                                <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mt-1 flex items-center gap-1">
                                    <Sparkles size={12} /> نظام الإدارة الذكي
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="md:w-[55%] p-10 md:p-20 flex flex-col justify-center bg-white relative">
                    <div className="max-w-md mx-auto w-full">

                        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-6">
                                <Lock size={24} />
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">تسجيل الدخول</h1>
                            <p className="text-slate-500 font-medium text-base">يرجى إدخال رمز الحماية الإداري للمتابعة إلى لوحة التحكم.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="space-y-3">
                                <label className="text-sm font-extrabold text-slate-700 tracking-wide block">رمز الدخول</label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        className="w-full pl-6 pr-14 py-5 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all text-xl font-bold text-slate-800 font-mono tracking-[0.5em] text-center shadow-inner hover:border-slate-300"
                                        placeholder="••••••••"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                        <KeyRound size={20} strokeWidth={2.5} />
                                    </div>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-3 text-red-600 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 animate-fade-in">
                                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                                        {error}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-extrabold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <>الدخول للنظام <ArrowRight size={22} className="group-hover:-translate-x-1 transition-transform" /></>}
                            </button>
                        </form>

                        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <button onClick={() => navigate('/')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-sm font-bold transition-all group border border-slate-200 hover:border-blue-100">
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                العودة للرئيسية
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;