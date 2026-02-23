import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { FileText, Search, ArrowLeft, ShieldCheck, Users, School, Megaphone, Calendar, ChevronLeft, Bell, Briefcase, Sparkles } from 'lucide-react';
import { getSchoolNews } from '../services/storage';
import { SchoolNews } from '../types';

const { Link } = ReactRouterDOM as any;

const Home: React.FC = () => {
    const [urgentNews, setUrgentNews] = useState<SchoolNews[]>([]);
    const [regularNews, setRegularNews] = useState<SchoolNews[]>([]);
    const [loading, setLoading] = useState(true);

    const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";
    const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const data = await getSchoolNews();
                setUrgentNews(data.filter(n => n.isUrgent));
                setRegularNews(data.filter(n => !n.isUrgent));
            } catch (e) {
                console.error("Failed to load news", e);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden relative">

            {/* 1. TOP ALERTS BAR */}
            {urgentNews.length > 0 && (
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white relative z-50 shadow-lg border-b border-red-500/50">
                    <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
                        {urgentNews.map(news => (
                            <div key={news.id} className="flex items-center gap-3 animate-pulse-slow">
                                <span className="bg-white/20 p-2 rounded-xl shrink-0 backdrop-blur-sm shadow-inner"><Bell size={18} className="animate-bounce" /></span>
                                <div className="flex-1 text-sm md:text-base font-medium">
                                    <span className="bg-white text-red-600 px-3 py-1 rounded-full font-bold ml-3 text-xs shadow-sm uppercase tracking-wider">عاجل</span>
                                    <span className="font-extrabold tracking-wide">{news.title}:</span> <span className="opacity-90 tracking-wide font-medium">{news.content}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. PREMIUM HERO SECTION */}
            <div className="relative bg-[#0f172a] text-white overflow-hidden rounded-b-[4rem] shadow-[0_20px_50px_rgba(15,23,42,0.5)] border-b border-white/10 isolate">
                {/* Animated Background Gradients */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f172a] via-blue-950 to-indigo-950"></div>

                <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[120px] opacity-15 animate-blob animation-delay-4000"></div>
                </div>

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 md:pt-24 md:pb-36 flex flex-col md:flex-row items-center justify-between gap-16">

                    <div className="text-center md:text-right max-w-2xl space-y-8 w-full animate-fade-in-up">
                        <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 text-sm font-bold text-blue-200 shadow-xl shadow-blue-900/20 w-fit mx-auto md:mx-0">
                            <Sparkles size={16} className="text-blue-400" />
                            <span>نظام الإدارة المدرسية الذكي</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
                            مرحباً بكم في <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 via-indigo-400 to-purple-400 animate-pulse-slow block mt-2">{SCHOOL_NAME}</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl mx-auto md:mx-0 font-medium">
                            منصة رقمية متكاملة تهدف إلى تعزيز التواصل بين المدرسة والمنزل، وتوفير بيئة تعليمية ذكية، منظمة ومبتكرة.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-6">
                            <Link to="/inquiry" className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-600/30">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                                <Search size={22} className="relative z-10" />
                                <span className="relative z-10 text-lg">بوابة ولي الأمر</span>
                                <ArrowLeft size={20} className="relative z-10 group-hover:-translate-x-2 transition-transform duration-300" />
                            </Link>

                            <Link to="/submit" className="group bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-md text-white border border-slate-600/50 px-8 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:border-slate-400 hover:shadow-xl">
                                <FileText size={22} className="text-slate-300 group-hover:text-white transition-colors" />
                                <span className="text-lg">تقديم عذر غياب</span>
                            </Link>
                        </div>
                    </div>

                    {/* Enhanced Hero Image / Logo */}
                    <div className="relative hidden md:flex justify-center flex-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <div className="relative z-10 w-96 h-96">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-[3rem] transform rotate-6 scale-105 blur-lg"></div>
                            <div className="relative w-full h-full glass-card rounded-[3rem] flex items-center justify-center p-8 group overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <img src={SCHOOL_LOGO} alt="Logo" className="w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-700 ease-out relative z-10" />
                            </div>
                        </div>

                        {/* Floating Status Badge */}
                        <div className="absolute -bottom-8 -left-8 glass-panel py-4 px-6 rounded-2xl flex items-center gap-4 animate-bounce hover:animate-none hover:scale-105 transition-transform duration-300 cursor-default">
                            <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
                                <ShieldCheck size={28} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">حالة النظام</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <p className="text-sm font-extrabold text-white">الخدمات تعمل بكفاءة</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MODERNIZED PORTALS GRID */}
            <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 -mt-10">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-2 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">بوابات الدخول السريع</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Parent Portal Card */}
                    <Link to="/inquiry" className="group flex flex-col bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-700 ease-out group-hover:scale-[1.5] opacity-70"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-20 h-20 bg-indigo-100/50 border border-indigo-200/50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 text-4xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                <Users size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">بوابة أولياء الأمور</h3>
                            <p className="text-slate-500 text-base leading-relaxed mb-auto font-medium">
                                تابع استئذانات وغياب أبنائك، اطلع على التقارير السلوكية، وتواصل مع إدارة المدرسة بفاعلية وسهولة.
                            </p>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center text-indigo-600 font-bold text-lg group-hover:text-indigo-700">
                                <span>دخول البوابة</span>
                                <span className="ml-auto bg-indigo-50 p-2 rounded-full group-hover:bg-indigo-100 transition-colors">
                                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Staff Portal Card */}
                    <Link to="/staff/login" className="group flex flex-col bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-700 ease-out group-hover:scale-[1.5] opacity-70"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-20 h-20 bg-teal-100/50 border border-teal-200/50 text-teal-600 rounded-3xl flex items-center justify-center mb-8 text-4xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                <Briefcase size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">بوابة المعلمين</h3>
                            <p className="text-slate-500 text-base leading-relaxed mb-auto font-medium">
                                رصد الحضور، إدارة السلوك، متابعة الإحالات، استئذان خروج الطلاب، والتواصل المباشر داخل النظام.
                            </p>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center text-teal-600 font-bold text-lg group-hover:text-teal-700">
                                <span>تسجيل الدخول</span>
                                <span className="ml-auto bg-teal-50 p-2 rounded-full group-hover:bg-teal-100 transition-colors">
                                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Admin Portal Card */}
                    <Link to="/admin/login" className="group flex flex-col bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-100 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden md:-mt-8">
                        {/* Notice the md:-mt-8 class above to offset the middle/last card slightly for a broken grid effect */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-50 to-sky-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-700 ease-out group-hover:scale-[1.5] opacity-70"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="w-20 h-20 bg-blue-100/50 border border-blue-200/50 text-blue-600 rounded-3xl flex items-center justify-center mb-8 text-4xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                <ShieldCheck size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">الإدارة المدرسية</h3>
                            <p className="text-slate-500 text-base leading-relaxed mb-auto font-medium">
                                لوحة تحكم مركزية وشاملة، تقارير وإحصائيات مفصلة، وإدارة كاملة للمستخدمين والصلاحيات.
                            </p>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center text-blue-600 font-bold text-lg group-hover:text-blue-700">
                                <span>لوحة التحكم</span>
                                <span className="ml-auto bg-blue-50 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* 4. ENHANCED SCHOOL NEWS SECTION */}
            {regularNews.length > 0 && (
                <div className="bg-white/40 backdrop-blur-3xl border-y border-slate-200/60 py-24 relative overflow-hidden">
                    {/* Subtle background decoration */}
                    <div className="absolute top-0 right-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 z-0"></div>

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-2xl shadow-inner">
                                    <Megaphone size={24} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">أحدث الأخبار والإعلانات</h2>
                                    <p className="text-slate-500 font-medium mt-1">ابق على اطلاع دائم بآخر مستجدات المدرسة</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {regularNews.slice(0, 3).map((news, index) => (
                                <div key={news.id} className="group bg-white p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col h-full border border-slate-100 hover:border-indigo-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                                            <Calendar size={12} />
                                            {new Date(news.createdAt).toLocaleDateString('ar-SA')}
                                        </span>
                                        {index === 0 && <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg">جديد</span>}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">{news.title}</h3>
                                    <p className="text-base text-slate-600 leading-relaxed line-clamp-3 mb-6 flex-1 font-medium">
                                        {news.content}
                                    </p>
                                    <div className="pt-5 mt-auto flex items-center justify-between border-t border-slate-50">
                                        <span className="text-sm font-bold text-slate-400">بواسطة: {news.author || 'الإدارة'}</span>
                                        <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors cursor-pointer">
                                            <ChevronLeft size={16} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Footer */}
            <footer className="bg-slate-900 text-slate-300 py-16 mt-auto border-t-[8px] border-indigo-600">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10">

                        {/* Brand Column */}
                        <div className="flex flex-col items-center md:items-start space-y-4 max-w-sm text-center md:text-right">
                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                                <img src={SCHOOL_LOGO} alt="Logo" className="w-14 h-14 object-contain filter drop-shadow-lg" />
                                <div className="flex flex-col">
                                    <span className="font-extrabold text-white text-lg tracking-wide">{SCHOOL_NAME}</span>
                                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">نظام الإدارة الذكي</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                نظام إلكتروني متطور يوفر بيئة تعليمية ذكية، ويُسهل إدارة العمليات المدرسية والتواصل الفعال.
                            </p>
                        </div>

                        {/* Navigation Links Column */}
                        <div className="flex flex-col items-center md:items-start space-y-4">
                            <h4 className="text-white font-bold text-lg mb-2">روابط سريعة</h4>
                            <div className="flex flex-col gap-3 text-base font-medium">
                                <Link to="/" className="hover:text-indigo-400 transition-colors flex items-center gap-2"><ChevronLeft size={14} className="text-slate-600" /> الرئيسية</Link>
                                <Link to="/inquiry" className="hover:text-indigo-400 transition-colors flex items-center gap-2"><ChevronLeft size={14} className="text-slate-600" /> بوابة الاستعلام</Link>
                                <Link to="/submit" className="hover:text-indigo-400 transition-colors flex items-center gap-2"><ChevronLeft size={14} className="text-slate-600" /> تقديم عذر غياب</Link>
                            </div>
                        </div>

                        {/* Systems Links Column */}
                        <div className="flex flex-col items-center md:items-start space-y-4">
                            <h4 className="text-white font-bold text-lg mb-2">دخول النظام</h4>
                            <div className="flex flex-col gap-3 text-base font-medium">
                                <Link to="/staff/login" className="hover:text-teal-400 transition-colors flex items-center gap-2"><Briefcase size={16} className="text-slate-500" /> دخول الموظفين</Link>
                                <Link to="/admin/login" className="hover:text-blue-400 transition-colors flex items-center gap-2"><ShieldCheck size={16} className="text-slate-500" /> بوابة الإدارة</Link>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="mt-16 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
                        <p>جميع الحقوق محفوظة © {new Date().getFullYear()} - {SCHOOL_NAME}</p>
                        <p className="flex items-center gap-2">صُنع بحب للتعليم <Sparkles size={14} className="text-amber-400" /></p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;