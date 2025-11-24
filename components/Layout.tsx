import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Search, ShieldCheck, LogOut, Menu, X, Users, ClipboardCheck, BarChart2, PieChart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role?: 'admin' | 'staff' | 'public';
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role = 'public', onLogout }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) => `
    flex items-center gap-2 px-4 py-3 rounded-lg transition-colors duration-200 font-medium shrink-0
    ${isActive(path) 
      ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
  `;

  const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";
  const SCHOOL_NAME = localStorage.getItem('school_name') || "متوسطة عماد الدين زنكي";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3 font-bold text-slate-800 text-lg">
          <img src={SCHOOL_LOGO} alt="Logo" className="w-10 h-10 object-contain" />
          <span className="text-blue-900">{SCHOOL_NAME}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:relative top-0 h-full w-72 bg-white border-l border-slate-200 shadow-lg z-20
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        right-0
      `}>
        {/* Header Section - Fixed */}
        <div className="p-6 border-b border-slate-100 hidden md:flex flex-col items-center text-center gap-3 shrink-0">
          <img src={SCHOOL_LOGO} alt="School Logo" className="w-24 h-24 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
          <div>
            <h1 className="font-extrabold text-blue-900 text-lg leading-tight">{SCHOOL_NAME}</h1>
            <p className="text-xs text-amber-600 font-semibold mt-1">نظام إدارة الغياب والأعذار</p>
          </div>
        </div>

        {/* Scrollable Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
          {role === 'public' && (
            <>
              <Link to="/" className={navLinkClass('/')} onClick={() => setIsMobileMenuOpen(false)}>
                <Home size={20} />
                <span>الرئيسية</span>
              </Link>
              <Link to="/submit" className={navLinkClass('/submit')} onClick={() => setIsMobileMenuOpen(false)}>
                <FileText size={20} />
                <span>تقديم عذر</span>
              </Link>
              <Link to="/inquiry" className={navLinkClass('/inquiry')} onClick={() => setIsMobileMenuOpen(false)}>
                <Search size={20} />
                <span>استعلام عن طالب</span>
              </Link>
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <Link to="/staff/login" className={navLinkClass('/staff/login')} onClick={() => setIsMobileMenuOpen(false)}>
                <Users size={20} />
                <span>دخول المعلمين</span>
              </Link>
              <Link to="/admin/login" className={navLinkClass('/admin/login')} onClick={() => setIsMobileMenuOpen(false)}>
                <ShieldCheck size={20} />
                <span>بوابة الإدارة</span>
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">لوحة التحكم</div>
              <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')} onClick={() => setIsMobileMenuOpen(false)}>
                <Home size={20} />
                <span>نظرة عامة</span>
              </Link>
              <Link to="/admin/attendance-stats" className={navLinkClass('/admin/attendance-stats')} onClick={() => setIsMobileMenuOpen(false)}>
                <PieChart size={20} />
                <span>الإحصائيات والتحليلات</span>
              </Link>
              <Link to="/admin/attendance-reports" className={navLinkClass('/admin/attendance-reports')} onClick={() => setIsMobileMenuOpen(false)}>
                <BarChart2 size={20} />
                <span>سجل الغياب اليومي</span>
              </Link>
              <Link to="/admin/requests" className={navLinkClass('/admin/requests')} onClick={() => setIsMobileMenuOpen(false)}>
                <FileText size={20} />
                <span>طلبات الأعذار</span>
              </Link>
              <Link to="/admin/students" className={navLinkClass('/admin/students')} onClick={() => setIsMobileMenuOpen(false)}>
                <Search size={20} />
                <span>الطلاب والبيانات</span>
              </Link>
              <Link to="/admin/users" className={navLinkClass('/admin/users')} onClick={() => setIsMobileMenuOpen(false)}>
                <Users size={20} />
                <span>إدارة المستخدمين</span>
              </Link>
              
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium shrink-0"
              >
                <LogOut size={20} />
                <span>تسجيل خروج</span>
              </button>
            </>
          )}

          {role === 'staff' && (
            <>
               <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">بوابة المعلم</div>
               <Link to="/staff/attendance" className={navLinkClass('/staff/attendance')} onClick={() => setIsMobileMenuOpen(false)}>
                <ClipboardCheck size={20} />
                <span>رصد الغياب والتأخر</span>
              </Link>
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium shrink-0"
              >
                <LogOut size={20} />
                <span>تسجيل خروج</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer Info - Fixed at Bottom */}
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100 shrink-0">
          <p>© 2024 نظام عذر المدرسي</p>
          <p className="text-amber-600 font-bold mt-1">{SCHOOL_NAME}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full bg-slate-50/50 relative">
        <div className="max-w-6xl mx-auto pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-10 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;