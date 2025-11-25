import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Submission from './pages/Submission';
import Inquiry from './pages/Inquiry';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Requests from './pages/admin/Requests';
import Students from './pages/admin/Students';
import Users from './pages/admin/Users'; // Admin Users Management
import AttendanceReports from './pages/admin/AttendanceReports'; // New Attendance Reports
import AttendanceStats from './pages/admin/AttendanceStats'; // New Attendance Stats Page
import StaffLogin from './pages/staff/Login'; // Staff Login
import Attendance from './pages/staff/Attendance'; // Staff Attendance
import StaffReports from './pages/staff/Reports'; // Staff Reports
import StaffRequests from './pages/staff/Requests'; // Staff Requests

// Protected Route for Admin
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const session = localStorage.getItem('ozr_admin_session');
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

// Protected Route for Staff
const ProtectedStaffRoute = ({ children }: { children?: React.ReactNode }) => {
  const session = localStorage.getItem('ozr_staff_session');
  if (!session) {
    return <Navigate to="/staff/login" replace />;
  }
  return <>{children}</>;
};

// Wrapper to handle Layout logic based on route
const AppContent = () => {
  const location = useLocation();
  
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isStaffRoute = location.pathname.startsWith('/staff') && location.pathname !== '/staff/login';
  
  // Pages that don't need layout wrapper (Login pages usually)
  const isLoginPage = location.pathname === '/admin/login' || location.pathname === '/staff/login';

  const handleLogout = () => {
    if (isAdminRoute) {
      localStorage.removeItem('ozr_admin_session');
    } else {
      localStorage.removeItem('ozr_staff_session');
    }
    window.location.href = '#/'; // Force redirect
  };

  if (isLoginPage) {
    return (
      <Routes>
         <Route path="/admin/login" element={<Login />} />
         <Route path="/staff/login" element={<StaffLogin />} />
      </Routes>
    );
  }

  // Determine role for Layout
  let role: 'admin' | 'staff' | 'public' = 'public';
  if (isAdminRoute) role = 'admin';
  if (isStaffRoute) role = 'staff';

  return (
    <Layout role={role} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<Submission />} />
        <Route path="/inquiry" element={<Inquiry />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/attendance-stats" element={<ProtectedRoute><AttendanceStats /></ProtectedRoute>} />
        <Route path="/admin/attendance-reports" element={<ProtectedRoute><AttendanceReports /></ProtectedRoute>} />
        <Route path="/admin/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        
        {/* Staff Routes */}
        <Route path="/staff/attendance" element={<ProtectedStaffRoute><Attendance /></ProtectedStaffRoute>} />
        <Route path="/staff/reports" element={<ProtectedStaffRoute><StaffReports /></ProtectedStaffRoute>} />
        <Route path="/staff/requests" element={<ProtectedStaffRoute><StaffRequests /></ProtectedStaffRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;