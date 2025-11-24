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