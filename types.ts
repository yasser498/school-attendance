
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Student {
  id: string;
  name: string;
  studentId: string; // Civil ID / National ID
  grade: string;
  className: string;
  phone: string;
}

export interface ExcuseRequest {
  id: string;
  studentId: string; // Links to Student.studentId
  studentName: string; // Denormalized for easier display
  grade: string;
  className: string;
  date: string;
  reason: string;
  details?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  status: RequestStatus;
  submissionDate: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
}

// --- New Types for Attendance System ---

export interface ClassAssignment {
  grade: string;
  className: string;
}

export interface StaffUser {
  id: string;
  name: string;
  passcode: string; // Changed: Passcode only
  assignments: ClassAssignment[]; // Changed: Support multiple classes
  permissions?: string[]; // New: List of allowed feature keys
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE'
}

export interface AttendanceRecord {
  id: string;
  date: string;
  grade: string;
  className: string;
  staffId: string;
  records: {
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
  }[];
}

export interface ResolvedAlert {
  studentId: string;
  dateResolved: string;
  actionType: string; // 'call', 'counselor', 'warning'
}

// --- Behavior System Types ---

export interface BehaviorRecord {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
  date: string;
  violationDegree: string; // First, Second, Third...
  violationName: string;
  articleNumber: string;
  actionTaken: string;
  notes?: string;
  staffId?: string;
  createdAt?: string;
}

export interface AdminInsight {
  id: string;
  targetRole: 'deputy' | 'counselor';
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Referral {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
  referralDate: string;
  reason: string;
  status: 'pending' | 'in_progress' | 'resolved';
  referredBy: string;
  notes?: string;
  createdAt?: string;
}
// ========== إضافات جديدة لـ types.ts ==========

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_logo_url?: string;
  principal_name?: string;
  deputy_name?: string;
  counselor_name?: string;
  academic_year: string;
  semester: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnhancedStudent extends Student {
  absence_count_unexcused?: number;
  absence_count_total?: number;
  last_absence_date?: string;
  referral_status?: 'none' | 'deputy' | 'counselor' | 'guardian_called';
}

export interface AutomaticReferralLog {
  id: string;
  student_id: string;
  student_name: string;
  absence_count: number;
  referral_level: 'deputy' | 'counselor';
  created_at: string;
  processed: boolean;
  processed_at?: string;
  notes?: string;
}

export interface EnhancedDashboardStats extends DashboardStats {
  totalAbsences: number;
  unexcusedAbsences: number;
  studentsAtRisk: number; // 3+ غياب
  criticalCases: number; // 5+ غياب
  pendingReferrals: number;
  resolvedReferrals: number;
  averageAbsenceRate: number;
}

export interface ReportSignature {
  role: 'principal' | 'deputy' | 'counselor';
  name: string;
  date: string;
}
