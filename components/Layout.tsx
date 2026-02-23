import React, { useEffect, useState, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Home, FileText, Search, ShieldCheck, LogOut, Menu, X, Users, ClipboardCheck, BarChart2, MessageSquare, BookUser, LayoutGrid, Briefcase, ChevronLeft, ChevronRight, Settings, Sparkles, UserCircle, ScanLine, LogOut as ExitIcon, Download, Share, BellRing, Loader2, Code, Zap } from 'lucide-react';
import { StaffUser, AppNotification } from '../types';
import { getPendingRequestsCountForStaff, getNotifications, getParentChildren, createNotification } from '../services/storage';
import ChatBot from './ChatBot';
import InstallPrompt from './InstallPrompt';
import { supabase } from '../supabaseClient';

const { Link, useLocation } = ReactRouterDOM as any;

interface LayoutProps {
  children: React.ReactNode;
  role?: 'admin' | 'staff' | 'public';
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role = 'public', onLogout }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop Collapse State
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);

  // Install Logic State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Notification Permission State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // Notification Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";
  const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة عماد الدين زنكي المتوسطة";

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Initialize Audio & Check Permissions
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Install Prompt Logic
  useEffect(() => {
    // Check if installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => setIsInstalled(true));
    }
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      alert("لتثبيت التطبيق على الآيفون:\n1. اضغط على زر المشاركة (Share) في أسفل المتصفح\n2. اختر 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen)");
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      });
    } else {
      // Fallback if prompt is lost or not supported
      alert("لتثبيت التطبيق، يرجى استخدام خيار 'إضافة إلى الشاشة الرئيسية' من إعدادات المتصفح.");
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("هذا المتصفح لا يدعم الإشعارات.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  // --- GLOBAL REALTIME NOTIFICATIONS (System Level) ---
  useEffect(() => {
    // Determine current User ID (Parent or Staff)
    const parentId = localStorage.getItem('ozr_parent_id');
    const staffSession = localStorage.getItem('ozr_staff_session');
    let userId = '';
    let childrenIds: string[] = [];

    // Helper to process a notification
    const handleNotification = (notif: AppNotification) => {
      // 1. Play Sound (if configured)
      if (audioRef.current) {
        audioRef.current.play().catch(() => { });
      }

      // 2. Trigger System Notification (The one that appears on lock screen / status bar)
      if (Notification.permission === 'granted') {
        // Use postMessage to Service Worker for consistency
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: notif.title,
            options: {
              body: notif.message,
              tag: 'school-alert-' + Date.now(),
              data: { url: window.location.origin }
            }
          });
        } else {
          // Fallback
          const options: NotificationOptions = {
            body: notif.message,
            icon: SCHOOL_LOGO,
            badge: SCHOOL_LOGO,
            tag: 'school-alert-' + Date.now(),
            // @ts-ignore
            renotify: true,
            requireInteraction: true,
            data: { url: window.location.origin },
            // @ts-ignore
            vibrate: [200, 100, 200]
          };
          new Notification(notif.title, options);
        }
      }

      // 3. Update Badge inside app if staff
      if (role === 'staff') {
        setNotificationCount(prev => prev + 1);
      }
    };

    const setupListener = async () => {
      if (parentId) {
        userId = parentId;
        const children = await getParentChildren(parentId);
        childrenIds = children.map(c => c.studentId);
      } else if (staffSession) {
        const user = JSON.parse(staffSession);
        userId = user.id;
      } else {
        return; // No user logged in
      }

      const watchedIds = [userId, ...childrenIds, 'ALL']; // Target User, Their Children, or Global

      // 1. REALTIME LISTENER
      const channel = supabase.channel('global_system_notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          async (payload) => {
            const newNotif = payload.new as AppNotification;
            if (watchedIds.includes(newNotif.targetUserId)) {
              handleNotification(newNotif);
            }
          }
        )
        .subscribe();

      // 2. POLLING FALLBACK (Every 15 seconds)
      // This ensures notifications arrive even if Realtime disconnects
      const pollInterval = setInterval(async () => {
        if (role === 'staff') {
          const notifs = await getNotifications(userId);
          const unread = notifs.filter((n: any) => !n.isRead).length;
          setNotificationCount(unread);
        }
      }, 15000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    };

    setupListener();
  }, [role]);

  // Fetch Pending Count & Notifications for Staff
  useEffect(() => {
    if (role === 'staff') {
      const fetchStaffData = async () => {
        const session = localStorage.getItem('ozr_staff_session');
        if (session) {
          const user: StaffUser = JSON.parse(session);

          setStaffPermissions(user.permissions || ['attendance', 'requests', 'reports']);

          if (!user.permissions || user.permissions.includes('requests')) {
            const count = await getPendingRequestsCountForStaff(user.assignments || []);
            setPendingCount(count);
          }

          const notifs = await getNotifications(user.id);
          const unread = notifs.filter((n: any) => !n.isRead).length;
          setNotificationCount(unread);
        }
      };
      fetchStaffData();

      const interval = setInterval(fetchStaffData, 60000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const hasPermission = (key: string) => staffPermissions.includes(key);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const showChatBot = ['/', '/staff/home', '/admin/dashboard'].includes(location.pathname);

  // Dynamic color helper
  const getColorClasses = (color: string, active: boolean) => {
    if (!active) return 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent';

    switch (color) {
      case 'indigo': return 'bg-indigo-50/80 text-indigo-700 border-indigo-100 placeholder:shadow-indigo-500/10 shadow-sm';
      case 'purple': return 'bg-purple-50/80 text-purple-700 border-purple-100 placeholder:shadow-purple-500/10 shadow-sm';
      case 'emerald': return 'bg-emerald-50/80 text-emerald-700 border-emerald-100 placeholder:shadow-emerald-500/10 shadow-sm';
      case 'teal': return 'bg-teal-50/80 text-teal-700 border-teal-100 placeholder:shadow-teal-500/10 shadow-sm';
      case 'amber': return 'bg-amber-50/80 text-amber-700 border-amber-100 placeholder:shadow-amber-500/10 shadow-sm';
      case 'orange': return 'bg-orange-50/80 text-orange-700 border-orange-100 placeholder:shadow-orange-500/10 shadow-sm';
      case 'pink': return 'bg-pink-50/80 text-pink-700 border-pink-100 placeholder:shadow-pink-500/10 shadow-sm';
      case 'red': return 'bg-red-50/80 text-red-700 border-red-100 placeholder:shadow-red-500/10 shadow-sm';
      default: return 'bg-blue-50/80 text-blue-700 border-blue-100 placeholder:shadow-blue-500/10 shadow-sm';
    }
  };

  const NavItem = ({ to, icon: Icon, label, badge, activeColor = 'blue' }: { to: string, icon: any, label: string, badge?: number, activeColor?: string }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`
          flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold relative group mb-1.5 overflow-hidden
          ${getColorClasses(activeColor, active)}
          ${isSidebarCollapsed ? 'justify-center px-2' : ''}
        `}
        title={isSidebarCollapsed ? label : ''}
      >
        {/* Active Background Glow */}
        {active && (
          <div className={`absolute inset-0 bg-gradient-to-r from-${activeColor}-500/10 to-transparent opacity-50`}></div>
        )}

        <Icon size={22} className={`relative z-10 shrink-0 transition-transform duration-300 ${active ? `text-${activeColor}-600 scale-110 drop-shadow-sm` : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'}`} />

        {!isSidebarCollapsed && (
          <span className="relative z-10 truncate text-[15px]">{label}</span>
        )}

        {/* Badge Logic */}
        {badge !== undefined && badge > 0 && (
          <span className={`
            absolute bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md border-2 border-white z-20
            ${isSidebarCollapsed
              ? 'top-2 right-2 w-4 h-4 text-[8px]'
              : 'left-4 top-1/2 -translate-y-1/2 px-2 py-0.5 min-w-[20px]'}
          `}>
            {badge}
          </span>
        )}

        {/* Active Indicator Bar */}
        {active && !isSidebarCollapsed && (
          <div className={`absolute right-0 top-3 bottom-3 w-1.5 bg-${activeColor}-500 rounded-l-full shadow-[0_0_10px_rgba(0,0,0,0.2)]`}></div>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    !isSidebarCollapsed ? (
      <div className="px-4 py-3 mt-4 mb-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-3">
        {label}
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>
    ) : <div className="my-3 border-t border-slate-200 mx-4"></div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row h-screen overflow-hidden font-sans relative selection:bg-blue-200 selection:text-blue-900">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 pointer-events-none animate-blob z-0"></div>
      <div className="absolute top-40 left-0 w-[600px] h-[600px] bg-indigo-100/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 pointer-events-none animate-blob animation-delay-2000 z-0"></div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 flex justify-between items-center sticky top-0 z-50 shrink-0 h-16 shadow-sm">
        <div className="flex items-center gap-3 font-bold text-slate-800 text-sm">
          <img src={SCHOOL_LOGO} alt="Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
          <span className="font-extrabold truncate max-w-[200px] text-slate-800 tracking-tight">{SCHOOL_NAME}</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-600 p-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors border border-slate-200/50"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:relative top-0 h-full bg-white/90 backdrop-blur-2xl border-l border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40
        transition-all duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0 w-[280px]' : 'translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'md:w-[90px]' : 'md:w-[280px]'}
        right-0
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden p-4 flex justify-end">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -left-3.5 top-14 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-md z-50 transition-all transform hover:scale-110"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        {/* Header Section */}
        <div className={`p-6 md:pt-10 hidden md:flex flex-col items-center text-center gap-4 shrink-0 transition-all ${isSidebarCollapsed ? 'py-6 px-2' : ''}`}>
          <div className="relative group cursor-pointer perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 blur-xl rounded-full group-hover:scale-110 group-hover:blur-2xl transition-all duration-500"></div>
            <div className={`relative bg-white rounded-3xl shadow-xl flex items-center justify-center p-2 border border-slate-100 transition-all duration-500 transform-style-3d group-hover:rotate-y-12 ${isSidebarCollapsed ? 'w-14 h-14 rounded-2xl' : 'w-24 h-24'}`}>
              <img src={SCHOOL_LOGO} alt="School Logo" className={`object-contain drop-shadow-md transition-all duration-500 ${isSidebarCollapsed ? 'w-10 h-10' : 'w-20 h-20 group-hover:scale-110'}`} />
            </div>
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-fade-in-up flex flex-col items-center">
              <h1 className="font-extrabold text-slate-800 text-lg leading-tight px-2 tracking-tight">{SCHOOL_NAME}</h1>
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-4 py-1.5 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">نظام الإدارة الذكي</span>
              </div>
            </div>
          )}
        </div>

        {/* Enable Notification Button (If Permission is default/prompt) */}
        {notifPermission !== 'granted' && (
          <div className={`px-5 mb-4 animate-pulse ${isSidebarCollapsed ? 'px-3' : ''}`}>
            <button
              onClick={requestNotificationPermission}
              className={`w-full bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-2xl p-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm ${isSidebarCollapsed ? 'flex-col p-2 text-[10px]' : ''}`}
            >
              <BellRing size={isSidebarCollapsed ? 18 : 16} strokeWidth={2.5} />
              {!isSidebarCollapsed && <span>تفعيل التنبيهات</span>}
            </button>
          </div>
        )}

        {/* Scrollable Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-slate-200 pb-20 md:pb-6 space-y-0.5">

          {role === 'public' && (
            <>
              <NavItem to="/" icon={Home} label="الرئيسية" activeColor="blue" />
              <SectionLabel label="خدمات المستفيدين" />
              <NavItem to="/inquiry" icon={UserCircle} label="بوابة الاستعلام" activeColor="purple" />
              <NavItem to="/submit" icon={FileText} label="تقديم المبررات" activeColor="emerald" />

              <SectionLabel label="مقدمي الخدمة" />
              <NavItem to="/staff/login" icon={Users} label="بوابة المنسوبين" activeColor="teal" />
              <NavItem to="/admin/login" icon={ShieldCheck} label="بوابة الإدارة" activeColor="indigo" />
            </>
          )}

          {role === 'admin' && (
            <>
              <NavItem to="/admin/dashboard" icon={LayoutGrid} label="مركز القيادة" activeColor="blue" />

              <SectionLabel label="العمليات والإجراءات" />
              <NavItem to="/admin/requests" icon={FileText} label="طلبات الأعذار" activeColor="amber" />
              <NavItem to="/admin/attendance-reports" icon={BarChart2} label="سجل الغياب اليومي" activeColor="emerald" />

              <SectionLabel label="التحليل والبيانات" />
              <NavItem to="/admin/attendance-stats" icon={Sparkles} label="تحليل الذكاء" activeColor="purple" />
              <NavItem to="/admin/students" icon={Search} label="الطلاب والبيانات" activeColor="indigo" />
              <NavItem to="/admin/users" icon={Users} label="إدارة المستخدمين" activeColor="teal" />

              <div className="my-6 border-t border-slate-100"></div>

              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200 font-bold shrink-0 group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title="تسجيل خروج"
              >
                <LogOut size={22} className="shrink-0 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                {!isSidebarCollapsed && <span>تسجيل خروج</span>}
              </button>
            </>
          )}

          {role === 'staff' && (
            <>
              <NavItem to="/staff/home" icon={Home} label="القائمة الرئيسية" activeColor="emerald" badge={notificationCount} />

              <SectionLabel label="المهام اليومية" />
              {hasPermission('gate_security') && (
                <NavItem to="/staff/gate" icon={ScanLine} label="ماسح البوابة" activeColor="teal" />
              )}
              {hasPermission('exit_perms') && (
                <NavItem to="/staff/exit-permissions" icon={ExitIcon} label="استئذان الطلاب" activeColor="orange" />
              )}
              {hasPermission('attendance') && (
                <NavItem to="/staff/attendance" icon={ClipboardCheck} label="رصد الغياب" activeColor="emerald" />
              )}
              {hasPermission('observations') && (
                <NavItem to="/staff/observations" icon={FileText} label="ملاحظات الطلاب" activeColor="pink" />
              )}
              {hasPermission('requests') && (
                <NavItem to="/staff/requests" icon={MessageSquare} label="طلبات الأعذار" badge={pendingCount} activeColor="amber" />
              )}

              {/* Only show 'Management' label if user has permissions for it */}
              {(hasPermission('students') || hasPermission('deputy')) && (
                <SectionLabel label="الإدارة والتوجيه" />
              )}

              {/* Counselor Role */}
              {hasPermission('students') && (
                <NavItem to="/staff/students" icon={BookUser} label="مكتب الموجه الطلابي" activeColor="purple" />
              )}

              {/* Deputy Role */}
              {hasPermission('deputy') && (
                <NavItem to="/staff/deputy" icon={Briefcase} label="مكتب وكيل الشؤون" activeColor="rose" />
              )}

              <SectionLabel label="الخدمات المساندة" />
              {/* Contact Directory (Teachers) */}
              {hasPermission('contact_directory') && !hasPermission('students') && (
                <NavItem to="/staff/directory" icon={BookUser} label="دليل التواصل" activeColor="indigo" />
              )}

              {hasPermission('reports') && (
                <NavItem to="/staff/reports" icon={BarChart2} label="تقارير الفصول" activeColor="blue" />
              )}

              <div className="my-6 border-t border-slate-100"></div>

              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200 font-bold shrink-0 group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title="تسجيل خروج"
              >
                <LogOut size={22} className="shrink-0 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                {!isSidebarCollapsed && <span>تسجيل خروج</span>}
              </button>
            </>
          )}

          {/* INSTALL APP BUTTON (Visible if not installed) */}
          {!isInstalled && (
            <>
              <div className="my-4 border-t border-slate-100 mx-4"></div>
              <button
                onClick={handleInstallClick}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 transition-all duration-200 font-bold shrink-0 group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title="تثبيت التطبيق"
              >
                <Download size={20} className="shrink-0 group-hover:-translate-y-1 transition-transform" strokeWidth={2.5} />
                {!isSidebarCollapsed && <span>تثبيت التطبيق</span>}
              </button>
            </>
          )}
        </nav>

        {/* Footer Info - Fixed at Bottom */}
        {!isSidebarCollapsed && (
          <div className="p-4 text-center text-[11px] text-slate-400 bg-slate-50/50 border-t border-slate-200/60 shrink-0 hidden md:flex flex-col items-center justify-center gap-1.5 backdrop-blur-md">
            <p className="font-extrabold tracking-widest uppercase">نظام عذر المدرسي v2.0</p>
            <div className="flex items-center justify-center gap-1.5 font-bold">
              <span>تطوير</span>
              <span className="text-slate-500">م. ياسر الهذلي</span>
              <Code size={12} className="text-blue-500" />
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full relative w-full custom-scrollbar z-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto pb-20 md:pb-12">
          {children}
        </div>
      </main>

      {/* Chat Bot Widget - Only on Main Screens */}
      {showChatBot && <ChatBot />}

      {/* Install App Prompt (Popup Banner) */}
      <InstallPrompt />

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;