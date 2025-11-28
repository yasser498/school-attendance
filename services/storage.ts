
import { supabase } from '../supabaseClient';
import { Student, ExcuseRequest, RequestStatus, StaffUser, AttendanceRecord, AttendanceStatus, ClassAssignment, ResolvedAlert, BehaviorRecord, AdminInsight, Referral, StudentObservation } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- Caching System ---
const CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 Minutes

export const getFromCache = <T>(key: string): T | null => {
  const cached = CACHE[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  CACHE[key] = { data, timestamp: Date.now() };
};

export const invalidateCache = (key: string) => {
  delete CACHE[key];
};

// ... (AI Config and generateSmartContent remain unchanged - omitting for brevity as they are long and unchanged) ...
// (Assume generateSmartContent and getAIConfig are here)
export interface AIConfig {
  provider: 'google' | 'openai_compatible'; 
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export const getAIConfig = (): AIConfig => {
  const stored = localStorage.getItem('ozr_ai_config');
  if (stored) {
    const config = JSON.parse(stored);
    if (config.model === 'gemini-1.5-flash' || config.model === 'gemini-pro' || config.model === 'gemini-1.0-pro') {
        config.model = 'gemini-2.5-flash';
        localStorage.setItem('ozr_ai_config', JSON.stringify(config));
    }
    return config;
  }
  return {
    provider: 'google',
    apiKey: process.env.API_KEY || '',
    model: 'gemini-2.5-flash'
  };
};

export const generateSmartContent = async (prompt: string, systemInstruction?: string): Promise<string> => {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error("مفتاح الذكاء الاصطناعي مفقود. يرجى ضبط الإعدادات.");

  try {
    if (config.provider === 'google') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: { systemInstruction: systemInstruction }
      });
      return response.text || "لم يتم استلام رد من النموذج.";
    } else {
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
      const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: systemInstruction || 'You are a helpful assistant.' }, { role: 'user', content: prompt }], temperature: 0.7 })
      });
      if (!response.ok) { const err = await response.text(); throw new Error(`API Error: ${err}`); }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "لم يتم استلام رد.";
    }
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(`فشل التوليد: ${error.message}`);
  }
};

// --- MAPPING HELPERS ---

const mapStudentFromDB = (s: any): Student => ({ id: s.id, name: s.name, studentId: s.student_id, grade: s.grade, className: s.class_name, phone: s.phone || '' });
const mapStudentToDB = (s: Student) => ({ name: s.name, student_id: s.studentId, grade: s.grade, class_name: s.className, phone: s.phone });

const mapRequestFromDB = (r: any): ExcuseRequest => ({ id: r.id, studentId: r.student_id, studentName: r.student_name, grade: r.grade, className: r.class_name, date: r.date, reason: r.reason, details: r.details, attachmentName: r.attachment_name, attachmentUrl: r.attachment_url, status: r.status as RequestStatus, submissionDate: r.submission_date });
const mapRequestToDB = (r: ExcuseRequest) => ({ student_id: r.studentId, student_name: r.studentName, grade: r.grade, class_name: r.className, date: r.date, reason: r.reason, details: r.details, attachment_name: r.attachmentName, attachment_url: r.attachmentUrl, status: r.status, submission_date: r.submissionDate });

const mapStaffFromDB = (u: any): StaffUser => ({ id: u.id, name: u.name, passcode: u.passcode, assignments: u.assignments || [], permissions: u.permissions || ['attendance', 'requests', 'reports'] });
const mapStaffToDB = (u: StaffUser) => ({ name: u.name, passcode: u.passcode, assignments: u.assignments || [], permissions: u.permissions || [] });

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({ id: a.id, date: a.date, grade: a.grade, className: a.class_name, staffId: a.staff_id, records: a.records || [] });
const mapAttendanceToDB = (a: AttendanceRecord) => ({ date: a.date, grade: a.grade, class_name: a.className, staff_id: a.staffId, records: a.records });

const mapBehaviorFromDB = (b: any): BehaviorRecord => ({ 
  id: b.id, 
  studentId: b.student_id, 
  studentName: b.student_name, 
  grade: b.grade, 
  className: b.class_name, 
  date: b.date, 
  violationDegree: b.violation_degree, 
  violationName: b.violation_name, 
  articleNumber: b.article_number, 
  actionTaken: b.action_taken, 
  notes: b.notes, 
  staffId: b.staff_id, 
  createdAt: b.created_at,
  parentViewed: b.parent_viewed,
  parentFeedback: b.parent_feedback,
  parentViewedAt: b.parent_viewed_at
});
const mapBehaviorToDB = (b: BehaviorRecord) => ({ 
  student_id: b.studentId, 
  student_name: b.studentName, 
  grade: b.grade, 
  class_name: b.className, 
  date: b.date, 
  violation_degree: b.violationDegree, 
  violation_name: b.violationName, 
  article_number: b.articleNumber, 
  action_taken: b.actionTaken, 
  notes: b.notes, 
  staff_id: b.staffId,
  // Don't map parent fields for basic insert usually, but if needed for update:
  parent_viewed: b.parentViewed,
  parent_feedback: b.parentFeedback,
  parent_viewed_at: b.parentViewedAt
});

const mapInsightFromDB = (i: any): AdminInsight => ({ id: i.id, targetRole: i.target_role, content: i.content, isRead: i.is_read, createdAt: i.created_at });

const mapReferralFromDB = (r: any): Referral => ({ id: r.id, studentId: r.student_id, studentName: r.student_name, grade: r.grade, className: r.class_name, referralDate: r.referral_date, reason: r.reason, status: r.status, referredBy: r.referred_by, notes: r.notes, createdAt: r.created_at });
const mapReferralToDB = (r: Referral) => ({ student_id: r.studentId, student_name: r.studentName, grade: r.grade, class_name: r.className, referral_date: r.referralDate, reason: r.reason, status: r.status, referred_by: r.referredBy, notes: r.notes });

const mapObservationFromDB = (o: any): StudentObservation => ({ 
  id: o.id, 
  studentId: o.student_id, 
  studentName: o.student_name, 
  grade: o.grade, 
  className: o.class_name, 
  date: o.date, 
  type: o.type, 
  content: o.content, 
  staffId: o.staff_id, 
  staffName: o.staff_name, 
  createdAt: o.created_at,
  parentViewed: o.parent_viewed,
  parentFeedback: o.parent_feedback,
  parentViewedAt: o.parent_viewed_at
});
const mapObservationToDB = (o: StudentObservation) => ({ 
  student_id: o.studentId, 
  student_name: o.studentName, 
  grade: o.grade, 
  class_name: o.className, 
  date: o.date, 
  type: o.type, 
  content: o.content, 
  staff_id: o.staffId, 
  staff_name: o.staffName,
  parent_viewed: o.parentViewed,
  parent_feedback: o.parentFeedback,
  parent_viewed_at: o.parentViewedAt
});

// ... (Connection Test & Upload remain unchanged) ...
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: `تم الاتصال بقاعدة بيانات Supabase بنجاح! (Status: Online)` };
  } catch (error: any) {
    console.error("Supabase Connection Test Error:", error);
    return { success: false, message: `فشل الاتصال: ${error.message || 'تأكد من مفاتيح الربط'}` };
  }
};

export const uploadFile = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// ... (Standard CRUD functions remain mostly unchanged, listing only updated/new ones below) ...

// Behavior Records
export const addBehaviorRecord = async (record: BehaviorRecord) => {
  const { error } = await supabase.from('behavior_records').insert(mapBehaviorToDB(record));
  if (error) throw new Error(error.message);
};
export const updateBehaviorRecord = async (record: BehaviorRecord) => {
  const { error } = await supabase.from('behavior_records').update(mapBehaviorToDB(record)).eq('id', record.id);
  if (error) throw new Error(error.message);
};
export const deleteBehaviorRecord = async (id: string) => {
  const { error } = await supabase.from('behavior_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
export const getBehaviorRecords = async (studentId?: string) => {
  let query = supabase.from('behavior_records').select('*').order('created_at', { ascending: false });
  if (studentId) { query = query.eq('student_id', studentId); }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapBehaviorFromDB);
};
export const clearBehaviorRecords = async () => {
  const { error } = await supabase.from('behavior_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
};

// NEW: Acknowledge Behavior (Parent)
export const acknowledgeBehavior = async (id: string, feedback?: string) => {
    const updateData = {
        parent_viewed: true,
        parent_viewed_at: new Date().toISOString(),
        parent_feedback: feedback || null
    };
    const { error } = await supabase.from('behavior_records').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
};

// Student Observations
export const addStudentObservation = async (obs: StudentObservation) => {
  const { error } = await supabase.from('observations').insert(mapObservationToDB(obs));
  if (error) throw new Error(error.message);
};
export const getStudentObservations = async (studentId?: string) => {
  let query = supabase.from('observations').select('*').order('created_at', { ascending: false });
  if (studentId) { query = query.eq('student_id', studentId); }
  const { data, error } = await query;
  if (error) {
      if (error.code === '42P01') { console.warn("Observations table not found."); return []; }
      throw new Error(error.message);
  }
  return data.map(mapObservationFromDB);
};
export const updateStudentObservation = async (id: string, content: string, type: string) => {
  const { error } = await supabase.from('observations').update({ content, type }).eq('id', id);
  if (error) throw new Error(error.message);
};
export const deleteStudentObservation = async (id: string) => {
  const { error } = await supabase.from('observations').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
export const clearStudentObservations = async () => {
  const { error } = await supabase.from('observations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
};

// NEW: Acknowledge Observation (Parent)
export const acknowledgeObservation = async (id: string, feedback?: string) => {
    const updateData = {
        parent_viewed: true,
        parent_viewed_at: new Date().toISOString(),
        parent_feedback: feedback || null
    };
    const { error } = await supabase.from('observations').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
};

// ... (Rest of existing functions: getStudents, getRequests, getAttendance etc.)
// Assumed to be present as per previous files provided in context
export const getStudents = async (forceRefresh = false): Promise<Student[]> => {
    if (!forceRefresh) { const cached = getFromCache<Student[]>('students'); if (cached) return cached; }
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw new Error(error.message);
    const students = data.map(mapStudentFromDB);
    setCache('students', students);
    return students;
};
export const getStudentsSync = (): Student[] | null => getFromCache<Student[]>('students');
export const getStudentByCivilId = async (civilId: string): Promise<Student | null> => {
    const { data, error } = await supabase.from('students').select('*').eq('student_id', civilId).maybeSingle();
    if (error || !data) return null;
    return mapStudentFromDB(data);
};
export const findStudentsByDetails = async (grade: string, className: string, namePart: string): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').eq('grade', grade).eq('class_name', className).ilike('name', `%${namePart}%`);
    if (error || !data) return [];
    return data.map(mapStudentFromDB);
};
export const getAvailableClassesForGrade = async (grade: string): Promise<string[]> => {
    const students = await getStudents();
    const classes = new Set<string>();
    students.forEach(s => { if (s.grade === grade && s.className) classes.add(s.className); });
    return Array.from(classes).sort();
};
export const addStudent = async (student: Student): Promise<Student> => {
    const { data, error } = await supabase.from('students').insert(mapStudentToDB(student)).select().single();
    if (error) throw new Error(error.message);
    const newStudent = mapStudentFromDB(data);
    const cached = getFromCache<Student[]>('students');
    if (cached) setCache('students', [...cached, newStudent]); else invalidateCache('students');
    return newStudent;
};
export const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    invalidateCache('students');
};
export const syncStudentsBatch = async (toAdd: Student[], toUpdate: Student[], toDeleteIds: string[]) => {
    if (toDeleteIds.length > 0) { const { error } = await supabase.from('students').delete().in('id', toDeleteIds); if (error) throw error; }
    const upsertData = [...toAdd, ...toUpdate].map(mapStudentToDB);
    if (upsertData.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < upsertData.length; i += CHUNK_SIZE) {
            const chunk = upsertData.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('students').upsert(chunk, { onConflict: 'student_id' });
            if (error) throw error;
        }
    }
    invalidateCache('students');
};
export const clearStudents = async () => {
    const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    invalidateCache('students');
};
export const getRequests = async (forceRefresh = false): Promise<ExcuseRequest[]> => {
    if (!forceRefresh) { const cached = getFromCache<ExcuseRequest[]>('requests'); if (cached) return cached; }
    const { data, error } = await supabase.from('requests').select('*').order('submission_date', { ascending: false });
    if (error) throw new Error(error.message);
    const requests = data.map(mapRequestFromDB);
    setCache('requests', requests);
    return requests;
};
export const getRequestsByStudentId = async (studentId: string): Promise<ExcuseRequest[]> => {
    const { data, error } = await supabase.from('requests').select('*').eq('student_id', studentId).order('submission_date', { ascending: false });
    if (error) return [];
    return data.map(mapRequestFromDB);
};
export const getPendingRequestsCountForStaff = async (assignments: ClassAssignment[]): Promise<number> => {
    if (!assignments || assignments.length === 0) return 0;
    let query = supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING');
    if (assignments.length > 0) {
        const orConditions = assignments.map(a => `and(grade.eq.${a.grade},class_name.eq.${a.className})`).join(',');
        query = query.or(orConditions);
    }
    const { count, error } = await query;
    if (error) { console.error("Error counting pending requests:", error); return 0; }
    return count || 0;
};
export const addRequest = async (req: ExcuseRequest) => {
    const { error } = await supabase.from('requests').insert(mapRequestToDB(req));
    if (error) throw error;
    invalidateCache('requests');
};
export const updateRequestStatus = async (id: string, status: RequestStatus) => {
    if (status === RequestStatus.APPROVED || status === RequestStatus.REJECTED) {
        const { data: reqData } = await supabase.from('requests').select('attachment_url').eq('id', id).single();
        if (reqData?.attachment_url) {
            const urlParts = reqData.attachment_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from('attachments').remove([fileName]);
            await supabase.from('requests').update({ status, attachment_url: null }).eq('id', id);
            invalidateCache('requests');
            return;
        }
    }
    const { error } = await supabase.from('requests').update({ status }).eq('id', id);
    if (error) throw error;
    invalidateCache('requests');
};
export const clearRequests = async () => {
    const { error } = await supabase.from('requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    invalidateCache('requests');
};
export const getStaffUsersSync = (): StaffUser[] | null => getFromCache<StaffUser[]>('staff');
export const getStaffUsers = async (forceRefresh = false): Promise<StaffUser[]> => {
    if (!forceRefresh) { const cached = getFromCache<StaffUser[]>('staff'); if (cached) return cached; }
    const { data, error } = await supabase.from('staff').select('*');
    if (error) throw error;
    const staff = data.map(mapStaffFromDB);
    setCache('staff', staff);
    return staff;
};
export const addStaffUser = async (user: StaffUser) => {
    const { error } = await supabase.from('staff').insert(mapStaffToDB(user));
    if (error) throw new Error(error.message);
    invalidateCache('staff');
};
export const updateStaffUser = async (user: StaffUser) => {
    const { error } = await supabase.from('staff').update(mapStaffToDB(user)).eq('id', user.id);
    if (error) throw new Error(error.message);
    invalidateCache('staff');
};
export const deleteStaffUser = async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw new Error(error.message);
    invalidateCache('staff');
};
export const authenticateStaff = async (passcode: string): Promise<StaffUser | null> => {
    const { data, error } = await supabase.from('staff').select('*').eq('passcode', passcode).maybeSingle();
    if (error || !data) return null;
    return mapStaffFromDB(data);
};
export const getAttendanceRecords = async (forceRefresh = false): Promise<AttendanceRecord[]> => {
    if (!forceRefresh) { const cached = getFromCache<AttendanceRecord[]>('attendance'); if (cached) return cached; }
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) throw error;
    const records = data.map(mapAttendanceFromDB);
    setCache('attendance', records);
    return records;
};
export const getAttendanceRecordForClass = async (date: string, grade: string, className: string): Promise<AttendanceRecord | null> => {
    const { data, error } = await supabase.from('attendance').select('*').eq('date', date).eq('grade', grade).eq('class_name', className).maybeSingle();
    if (error || !data) return null;
    return mapAttendanceFromDB(data);
};
export const saveAttendanceRecord = async (record: AttendanceRecord) => {
    const { data: existing } = await supabase.from('attendance').select('id').eq('date', record.date).eq('grade', record.grade).eq('class_name', record.className).maybeSingle();
    if (existing) {
        await supabase.from('attendance').update({ records: record.records, staff_id: record.staffId }).eq('id', existing.id);
    } else {
        await supabase.from('attendance').insert(mapAttendanceToDB(record));
    }
    invalidateCache('attendance');
};
export const clearAttendance = async () => {
    const { error } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    invalidateCache('attendance');
};
export const getStudentAttendanceHistory = async (studentId: string, grade: string, className: string): Promise<{ date: string, status: AttendanceStatus }[]> => {
    const { data, error } = await supabase.from('attendance').select('date, records').eq('grade', grade).eq('class_name', className);
    if (error || !data) return [];
    const history: { date: string, status: AttendanceStatus }[] = [];
    data.forEach((row: any) => {
        const recordList = row.records as any[];
        const studentEntry = recordList.find((r: any) => r.studentId === studentId);
        if (studentEntry) { history.push({ date: row.date, status: studentEntry.status as AttendanceStatus }); }
    });
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
export const getDailyAttendanceReport = async (date: string) => {
    const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
    if (error) return { totalPresent: 0, totalAbsent: 0, totalLate: 0, details: [] };
    const dayRecords = data.map(mapAttendanceFromDB);
    let allStudents: Student[] = [];
    try { allStudents = await getStudents(); } catch (e) { console.warn("Could not fetch students for backfilling IDs"); }
    let totalPresent = 0; let totalAbsent = 0; let totalLate = 0; const details: any[] = [];
    dayRecords.forEach(record => {
        record.records.forEach(student => {
            if (student.status === AttendanceStatus.PRESENT) totalPresent++;
            if (student.status === AttendanceStatus.ABSENT) totalAbsent++;
            if (student.status === AttendanceStatus.LATE) totalLate++;
            if (student.status !== AttendanceStatus.PRESENT) {
                let finalStudentId = student.studentId;
                if (!finalStudentId && allStudents.length > 0) { const found = allStudents.find(s => s.name === student.studentName); if (found) finalStudentId = found.studentId; }
                details.push({ studentId: finalStudentId, studentName: student.studentName, grade: record.grade, className: record.className, status: student.status });
            }
        });
    });
    return { totalPresent, totalAbsent, totalLate, details };
};
export const sendAdminInsight = async (role: 'deputy' | 'counselor', content: string) => {
    const { error } = await supabase.from('admin_insights').insert({ target_role: role, content: content });
    if (error) throw new Error(error.message);
};
export const getAdminInsights = async (role: 'deputy' | 'counselor') => {
    const { data, error } = await supabase.from('admin_insights').select('*').eq('target_role', role).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(mapInsightFromDB);
};
export const clearAdminInsights = async () => {
    const { error } = await supabase.from('admin_insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(error.message);
};
export const addReferral = async (referral: Referral) => {
    const { error } = await supabase.from('referrals').insert(mapReferralToDB(referral));
    if (error) throw new Error(error.message);
};
export const getReferrals = async (studentId?: string) => {
    let query = supabase.from('referrals').select('*').order('referral_date', { ascending: false });
    if (studentId) { query = query.eq('student_id', studentId); }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(mapReferralFromDB);
};
export const updateReferralStatus = async (id: string, status: 'pending' | 'in_progress' | 'resolved') => {
    const { error } = await supabase.from('referrals').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
};
export const clearReferrals = async () => {
    const { error } = await supabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(error.message);
};
// --- ALERT RESOLUTION SYSTEM ---
const RESOLVED_ALERTS_KEY = 'ozr_resolved_alerts';
export const resolveAbsenceAlert = async (studentId: string, actionType: string) => {
  const existing = JSON.parse(localStorage.getItem(RESOLVED_ALERTS_KEY) || '[]');
  const today = new Date().toISOString().split('T')[0];
  const newAlert: ResolvedAlert = { studentId, dateResolved: today, actionType };
  const filtered = existing.filter((a: ResolvedAlert) => a.studentId !== studentId);
  localStorage.setItem(RESOLVED_ALERTS_KEY, JSON.stringify([...filtered, newAlert]));
  if (actionType === 'counselor') {
      try {
          const student = await getStudentByCivilId(studentId);
          if (student) {
              const referral: Referral = { id: '', studentId: student.studentId, studentName: student.name, grade: student.grade, className: student.className, referralDate: today, reason: 'غياب متصل (تحويل تلقائي من النظام)', status: 'pending', referredBy: 'admin' };
              await addReferral(referral);
          }
      } catch (e) { console.error("Failed to sync referral to DB", e); }
  }
};
export const getResolvedAlerts = (): ResolvedAlert[] => { return JSON.parse(localStorage.getItem(RESOLVED_ALERTS_KEY) || '[]'); };
export const getConsecutiveAbsences = async () => {
  const allRecords = await getAttendanceRecords();
  const students = await getStudents();
  const studentRecords: Record<string, { date: string, status: AttendanceStatus }[]> = {};
  allRecords.forEach(rec => {
    rec.records.forEach(sRecord => {
      let sid = sRecord.studentId;
      if (!sid) { const found = students.find(s => s.name === sRecord.studentName); if (found) sid = found.studentId; }
      if (sid) { if (!studentRecords[sid]) studentRecords[sid] = []; studentRecords[sid].push({ date: rec.date, status: sRecord.status }); }
    });
  });
  const alerts: { studentId: string, studentName: string, days: number, lastDate: string }[] = [];
  const resolved = getResolvedAlerts();
  Object.entries(studentRecords).forEach(([sid, records]) => {
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const isResolved = resolved.some(r => r.studentId === sid && r.dateResolved === new Date().toISOString().split('T')[0]);
    if (isResolved) return;
    if (records.length >= 2) {
      if (records[0].status === AttendanceStatus.ABSENT && records[1].status === AttendanceStatus.ABSENT) {
        const student = students.find(s => s.studentId === sid);
        if (student) { alerts.push({ studentId: sid, studentName: student.name, days: 2, lastDate: records[0].date }); }
      }
    }
  });
  return alerts;
};
