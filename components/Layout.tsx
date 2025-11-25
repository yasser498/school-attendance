import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Search, ShieldCheck, LogOut, Menu, X, Users, ClipboardCheck, BarChart2, PieChart, MessageSquare } from 'lucide-react';

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
    flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors duration-200 font-medium shrink-0 text-sm md:text-base
    ${isActive(path) 
      ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
  `;

  const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";
  const SCHOOL_NAME = localStorage.getItem('school_name') || "متوسطة عماد الدين زنكي";

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm shrink-0 h-16">
        <div className="flex items-center gap-3 font-bold text-slate-800 text-sm">
          <img src={SCHOOL_LOGO} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-blue-900 truncate max-w-[200px]">{SCHOOL_NAME}</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-slate-600 p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:relative top-0 h-full w-72 bg-white border-l border-slate-200 shadow-2xl md:shadow-lg z-40
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        right-0
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden p-4 flex justify-end border-b border-slate-100">
           <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2">
             <X size={24} />
           </button>
        </div>

        {/* Header Section - Fixed */}
        <div className="p-6 border-b border-slate-100 hidden md:flex flex-col items-center text-center gap-3 shrink-0">
          <img src={SCHOOL_LOGO} alt="School Logo" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
          <div>
            <h1 className="font-extrabold text-blue-900 text-base md:text-lg leading-tight px-2">{SCHOOL_NAME}</h1>
            <p className="text-xs text-amber-600 font-semibold mt-1">نظام إدارة الغياب والأعذار</p>
          </div>
        </div>

        {/* Scrollable Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 pb-20 md:pb-4">
          {role === 'public' && (
            <>
              <Link to="/" className={navLinkClass('/')}>
                <Home size={20} />
                <span>الرئيسية</span>
              </Link>
              <Link to="/submit" className={navLinkClass('/submit')}>
                <FileText size={20} />
                <span>تقديم عذر</span>
              </Link>
              <Link to="/inquiry" className={navLinkClass('/inquiry')}>
                <Search size={20} />
                <span>استعلام عن طالب</span>
              </Link>
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <Link to="/staff/login" className={navLinkClass('/staff/login')}>
                <Users size={20} />
                <span>دخول المعلمين</span>
              </Link>
              <Link to="/admin/login" className={navLinkClass('/admin/login')}>
                <ShieldCheck size={20} />
                <span>بوابة الإدارة</span>
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mt-2">لوحة التحكم</div>
              <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                <Home size={20} />
                <span>نظرة عامة</span>
              </Link>
              <Link to="/admin/attendance-stats" className={navLinkClass('/admin/attendance-stats')}>
                <PieChart size={20} />
                <span>الإحصائيات والتحليلات</span>
              </Link>
              <Link to="/admin/attendance-reports" className={navLinkClass('/admin/attendance-reports')}>
                <BarChart2 size={20} />
                <span>سجل الغياب اليومي</span>
              </Link>
              <Link to="/admin/requests" className={navLinkClass('/admin/requests')}>
                <FileText size={20} />
                <span>طلبات الأعذار</span>
              </Link>
              <Link to="/admin/students" className={navLinkClass('/admin/students')}>
                <Search size={20} />
                <span>الطلاب والبيانات</span>
              </Link>
              <Link to="/admin/users" className={navLinkClass('/admin/users')}>
                <Users size={20} />
                <span>إدارة المستخدمين</span>
              </Link>
              
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium shrink-0"
              >
                <LogOut size={20} />
                <span>تسجيل خروج</span>
              </button>
            </>
          )}

          {role === 'staff' && (
            <>
               <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mt-2">بوابة المعلم</div>
               <Link to="/staff/attendance" className={navLinkClass('/staff/attendance')}>
                <ClipboardCheck size={20} />
                <span>رصد الغياب والتأخر</span>
              </Link>
              <Link to="/staff/requests" className={navLinkClass('/staff/requests')}>
                <MessageSquare size={20} />
                <span>طلبات الأعذار</span>
              </Link>
              <Link to="/staff/reports" className={navLinkClass('/staff/reports')}>
                <BarChart2 size={20} />
                <span>تقاريري</span>
              </Link>
              <div className="border-t border-slate-100 my-4 shrink-0"></div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium shrink-0"
              >
                <LogOut size={20} />
                <span>تسجيل خروج</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer Info - Fixed at Bottom */}
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100 shrink-0 hidden md:block">
          <p>© 2024 نظام عذر المدرسي</p>
          <p className="text-amber-600 font-bold mt-1 truncate px-2">{SCHOOL_NAME}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full bg-slate-50/50 relative w-full">
        <div className="max-w-6xl mx-auto pb-20 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;