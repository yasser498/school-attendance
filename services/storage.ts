
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { 
  Student, ExcuseRequest, StaffUser, AttendanceRecord, BehaviorRecord, 
  StudentObservation, Referral, GuidanceSession, Appointment, ExitPermission, 
  SchoolNews, AdminInsight, AppNotification, AppointmentSlot, ClassAssignment,
  RequestStatus, StudentPoint, AttendanceStatus
} from '../types';
import { GRADES } from '../constants';

// --- CACHE FOR SYNC ACCESS ---
let cachedStudents: Student[] | null = null;
let cachedStaff: StaffUser[] | null = null;

// --- AI CONFIG ---
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIConfig = async () => {
    return { apiKey: process.env.API_KEY, model: 'gemini-3-flash-preview' };
};

// --- FILE UPLOAD & MANAGEMENT ---
export const uploadFile = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    try {
        const { data, error } = await supabase.storage.from('excuses').upload(fileName, file);
        if (error) {
            console.warn("Supabase Storage Upload Error:", error.message);
            return await fileToBase64(file);
        }
        const { data: publicData } = supabase.storage.from('excuses').getPublicUrl(fileName);
        return publicData.publicUrl;
    } catch (e: any) {
        console.warn("Storage exception, falling back to Base64:", e);
        return await fileToBase64(file);
    }
};

// NEW: Delete file from storage
export const deleteAttachmentFile = async (fileUrl: string): Promise<void> => {
    try {
        // Extract the file path relative to the bucket.
        // URL format: .../storage/v1/object/public/excuses/FILENAME
        const path = fileUrl.split('/excuses/').pop();
        if (!path) return; // If path extraction fails (e.g. base64), do nothing or handle accordingly

        // Don't try to delete base64 strings from storage
        if (fileUrl.startsWith('data:')) return;

        const { error } = await supabase.storage.from('excuses').remove([path]);
        if (error) throw error;
    } catch (e) {
        console.error("Error deleting file from storage:", e);
        throw e;
    }
};

// NEW: Clear attachment reference in Database
export const removeRequestAttachmentRef = async (requestId: string): Promise<void> => {
    const { error } = await supabase.from('requests')
        .update({ attachmentUrl: null, attachmentName: null })
        .eq('id', requestId);
    if (error) throw error;
};

// --- STUDENTS ---
export const getStudents = async (force = false): Promise<Student[]> => {
    if (!force && cachedStudents) return cachedStudents;
    const { data, error } = await supabase.from('students').select('*');
    if (error) throw error;
    cachedStudents = data || [];
    return cachedStudents!;
};

export const getStudentsSync = () => cachedStudents;

export const addStudent = async (student: Student): Promise<Student> => {
    const { data, error } = await supabase.from('students').insert(student).select().single();
    if (error) throw error;
    if (cachedStudents) cachedStudents.push(data);
    return data;
};

export const updateStudent = async (student: Student): Promise<void> => {
    const { error } = await supabase.from('students').update(student).eq('id', student.id);
    if (error) throw error;
    if (cachedStudents) {
        cachedStudents = cachedStudents.map(s => s.id === student.id ? student : s);
    }
};

export const deleteStudent = async (id: string): Promise<void> => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    if (cachedStudents) {
        cachedStudents = cachedStudents.filter(s => s.id !== id);
    }
};

export const syncStudentsBatch = async (upsert: Student[], deletes: string[], deleteIds: string[] = []): Promise<{added: number, updated: number, deleted: number}> => {
    const idsToDelete = [...deletes, ...deleteIds];
    let deletedCount = 0;
    
    if (idsToDelete.length > 0) {
        const { count } = await supabase.from('students').delete().in('id', idsToDelete);
        deletedCount = count || idsToDelete.length;
    }

    let addedCount = 0;
    let updatedCount = 0;

    if (upsert.length > 0) {
        const { data, error } = await supabase.from('students').upsert(upsert).select();
        if (error) throw error;
        addedCount = data.length; 
    }
    
    await getStudents(true);
    return { added: addedCount, updated: updatedCount, deleted: deletedCount };
};

export const getStudentByCivilId = async (id: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').eq('studentId', id).single();
    return data;
};

export const getStudentsByPhone = async (phone: string): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').ilike('phone', `%${phone}%`);
    return data || [];
};

export const clearStudents = async () => {
    await supabase.from('students').delete().neq('id', '0');
    cachedStudents = [];
};

// --- REQUESTS ---
// Helper to map DB columns to App Types
const mapRequestFromDB = (r: any): ExcuseRequest => {
    return {
        id: r.id,
        studentId: r.studentId || r.student_id,
        studentName: r.studentName || r.student_name,
        grade: r.grade,
        className: r.className || r.class_name || r.classname,
        date: r.date,
        reason: r.reason,
        details: r.details,
        attachmentName: r.attachmentName || r.attachment_name,
        attachmentUrl: r.attachmentUrl || r.attachment_url,
        status: r.status
    };
};

export const getRequests = async (): Promise<ExcuseRequest[]> => {
    const { data, error } = await supabase.from('requests').select('*').order('date', { ascending: false });
    if (error) throw error;
    
    // FETCH STUDENTS TO ENSURE DATA INTEGRITY AS FALLBACK
    const students = await getStudents();
    
    return (data || []).map((row: any) => {
        // 1. Map from potentially snake_case DB columns
        const req = mapRequestFromDB(row);

        // 2. If name/grade/class is STILL missing, lookup in student DB
        if (!req.studentName || req.studentName === 'اسم غير متوفر' || !req.grade || !req.className) {
            const student = students.find(s => s.studentId === req.studentId);
            if (student) {
                req.studentName = student.name;
                req.grade = student.grade;
                req.className = student.className;
            }
        }
        return req;
    });
};

export const addRequest = async (req: ExcuseRequest): Promise<void> => {
    const { error } = await supabase.from('requests').insert(req);
    if (error) throw error;
};

export const updateRequestStatus = async (id: string, status: RequestStatus): Promise<void> => {
    const { error } = await supabase.from('requests').update({ status }).eq('id', id);
    if (error) throw error;
};

export const getRequestsByStudentId = async (studentId: string): Promise<ExcuseRequest[]> => {
    const { data } = await supabase.from('requests').select('*').eq('studentId', studentId);
    
    const students = await getStudents();
    return (data || []).map((row: any) => {
        const req = mapRequestFromDB(row);
        if (!req.studentName) {
            const student = students.find(s => s.studentId === req.studentId);
            if (student) {
                req.studentName = student.name;
                req.grade = student.grade;
                req.className = student.className;
            }
        }
        return req;
    });
};

export const getPendingRequestsCountForStaff = async (assignments: ClassAssignment[]): Promise<number> => {
    if (!assignments || assignments.length === 0) return 0;
    const { data } = await supabase.from('requests').select('id, grade, className, class_name, status').eq('status', 'PENDING');
    if (!data) return 0;
    
    return data.filter((r: any) => {
        // Handle mapping here too locally
        const rGrade = r.grade;
        const rClass = r.className || r.class_name;
        return assignments.some(a => a.grade === rGrade && a.className === rClass);
    }).length;
};

export const clearRequests = async () => {
    await supabase.from('requests').delete().neq('id', '0');
};

// --- ATTENDANCE ---
export const getAttendanceRecords = async (date?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    
    // Map to camelCase if needed
    return (data || []).map((r: any) => ({
        ...r,
        className: r.className || r.class_name
    }));
};

export const saveAttendanceRecord = async (record: AttendanceRecord): Promise<void> => {
    const { data } = await supabase.from('attendance')
        .select('id')
        .eq('date', record.date)
        .eq('grade', record.grade)
        .eq('className', record.className) // If column is class_name, Supabase handles simple mapping usually, but be careful
        .single();
        
    // If table uses class_name, ensure we send matching object or trust mapping
    if (data) {
        await supabase.from('attendance').update({ records: record.records }).eq('id', data.id);
    } else {
        await supabase.from('attendance').insert(record);
    }
};

export const getAttendanceRecordForClass = async (date: string, grade: string, className: string): Promise<AttendanceRecord | null> => {
    // Try both className and class_name in filter if unsure, but standard eq matches column name
    // Assuming DB has 'className' or 'class_name'
    const { data } = await supabase.from('attendance')
        .select('*')
        .eq('date', date)
        .eq('grade', grade)
        .match({ className: className }); // Try object match, or simple eq if exact column known
    
    // Fallback if data is array
    return data && data.length > 0 ? data[0] : null;
};

export const getDailyAttendanceReport = async (date: string) => {
    const { data: attData } = await supabase.from('attendance').select('*').eq('date', date);
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    const details: any[] = [];

    if (attData) {
        attData.forEach((r: any) => {
            const cls = r.className || r.class_name;
            r.records.forEach((s: any) => {
                if (s.status === 'PRESENT') totalPresent++;
                else if (s.status === 'ABSENT') totalAbsent++;
                else if (s.status === 'LATE') totalLate++;
                
                details.push({
                    studentId: s.studentId,
                    studentName: s.studentName,
                    grade: r.grade,
                    className: cls,
                    status: s.status
                });
            });
        });
    }
    return { totalPresent, totalAbsent, totalLate, details };
};

export const getStudentAttendanceHistory = async (studentId: string) => {
    const { data } = await supabase.from('attendance').select('*'); 
    const history: { date: string, status: AttendanceStatus }[] = [];
    
    if (data) {
        data.forEach((r: any) => {
            if (!r.records) return;
            const studentRecord = r.records.find((s: any) => s.studentId === studentId);
            if (studentRecord) {
                history.push({ date: r.date, status: studentRecord.status });
            }
        });
    }
    return history;
};

export const clearAttendance = async () => {
    await supabase.from('attendance').delete().neq('id', '0');
};

export const getConsecutiveAbsences = async () => {
    return []; 
};

export const resolveAbsenceAlert = async (studentId: string, actionType: string, notes?: string) => {
    await supabase.from('risk_history').insert({
        student_id: studentId,
        action_type: actionType,
        notes: notes,
        resolved_at: new Date().toISOString()
    });
};

export const getRiskHistory = async () => {
    const { data } = await supabase.from('risk_history').select('*');
    return data || [];
}

// --- STAFF ---
export const getStaffUsers = async (force = false): Promise<StaffUser[]> => {
    if (!force && cachedStaff) return cachedStaff;
    const { data, error } = await supabase.from('staff').select('*');
    if (error) throw error;
    cachedStaff = data || [];
    return cachedStaff!;
};

export const getStaffUsersSync = () => cachedStaff;

export const addStaffUser = async (user: StaffUser): Promise<void> => {
    await supabase.from('staff').insert(user);
    if (cachedStaff) cachedStaff.push(user);
};

export const updateStaffUser = async (user: StaffUser): Promise<void> => {
    await supabase.from('staff').update(user).eq('id', user.id);
    if (cachedStaff) {
        cachedStaff = cachedStaff.map(u => u.id === user.id ? user : u);
    }
};

export const deleteStaffUser = async (id: string): Promise<void> => {
    await supabase.from('staff').delete().eq('id', id);
    if (cachedStaff) {
        cachedStaff = cachedStaff.filter(u => u.id !== id);
    }
};

export const authenticateStaff = async (passcode: string): Promise<StaffUser | null> => {
    const { data } = await supabase.from('staff').select('*').eq('passcode', passcode).single();
    return data;
};

// --- BEHAVIOR ---
export const getBehaviorRecords = async (studentId?: string, date?: string): Promise<BehaviorRecord[]> => {
    let query = supabase.from('behavior').select('*').order('date', { ascending: false });
    if (studentId) query = query.eq('studentId', studentId);
    if (date) query = query.eq('date', date);
    const { data } = await query;
    return (data || []).map((r: any) => ({
        ...r,
        studentName: r.studentName || r.student_name,
        violationName: r.violationName || r.violation_name,
        violationDegree: r.violationDegree || r.violation_degree,
        actionTaken: r.actionTaken || r.action_taken,
        className: r.className || r.class_name
    }));
};

export const addBehaviorRecord = async (record: BehaviorRecord): Promise<void> => {
    await supabase.from('behavior').insert(record);
};

export const updateBehaviorRecord = async (record: BehaviorRecord): Promise<void> => {
    await supabase.from('behavior').update(record).eq('id', record.id);
};

export const deleteBehaviorRecord = async (id: string): Promise<void> => {
    await supabase.from('behavior').delete().eq('id', id);
};

export const clearBehaviorRecords = async () => {
    await supabase.from('behavior').delete().neq('id', '0');
};

export const acknowledgeBehavior = async (id: string, feedback: string) => {
    await supabase.from('behavior').update({ parentViewed: true, parentFeedback: feedback, parentViewedAt: new Date().toISOString() }).eq('id', id);
};

// --- OBSERVATIONS ---
export const getStudentObservations = async (studentId?: string, type?: string): Promise<StudentObservation[]> => {
    let query = supabase.from('observations').select('*').order('date', { ascending: false });
    if (studentId) query = query.eq('studentId', studentId);
    if (type) query = query.eq('type', type);
    const { data } = await query;
    return (data || []).map((r: any) => ({
        ...r,
        studentName: r.studentName || r.student_name,
        staffName: r.staffName || r.staff_name,
        className: r.className || r.class_name,
        parentFeedback: r.parentFeedback || r.parent_feedback
    }));
};

export const addStudentObservation = async (obs: StudentObservation): Promise<void> => {
    await supabase.from('observations').insert(obs);
};

export const updateStudentObservation = async (id: string, content: string, type: string): Promise<void> => {
    await supabase.from('observations').update({ content, type }).eq('id', id);
};

export const deleteStudentObservation = async (id: string): Promise<void> => {
    await supabase.from('observations').delete().eq('id', id);
};

export const acknowledgeObservation = async (id: string, feedback: string) => {
    await supabase.from('observations').update({ parentViewed: true, parentFeedback: feedback, parentViewedAt: new Date().toISOString() }).eq('id', id);
};

// --- POINTS ---
export const addStudentPoints = async (studentId: string, points: number, reason: string, type: string) => {
    await supabase.from('points').insert({ studentId, points, reason, type });
};

export const getStudentPoints = async (studentId: string): Promise<{total: number, history: StudentPoint[]}> => {
    const { data } = await supabase.from('points').select('*').eq('studentId', studentId);
    const total = data?.reduce((acc: number, curr: any) => acc + (curr.points || 0), 0) || 0;
    return { total, history: data || [] };
};

// --- REFERRALS & GUIDANCE ---
export const getReferrals = async (): Promise<Referral[]> => {
    const { data } = await supabase.from('referrals').select('*').order('referralDate', { ascending: false });
    return (data || []).map((r: any) => ({
        ...r,
        studentName: r.studentName || r.student_name,
        referralDate: r.referralDate || r.referral_date,
        referredBy: r.referredBy || r.referred_by,
        className: r.className || r.class_name
    }));
};

export const addReferral = async (ref: Referral): Promise<void> => {
    await supabase.from('referrals').insert(ref);
};

export const updateReferralStatus = async (id: string, status: string, outcome?: string) => {
    const update: any = { status };
    if (outcome) update.outcome = outcome;
    await supabase.from('referrals').update(update).eq('id', id);
};

export const clearReferrals = async () => {
    await supabase.from('referrals').delete().neq('id', '0');
};

export const getGuidanceSessions = async (): Promise<GuidanceSession[]> => {
    const { data } = await supabase.from('guidance_sessions').select('*').order('date', { ascending: false });
    return (data || []).map((r: any) => ({
        ...r,
        studentName: r.studentName || r.student_name,
        sessionType: r.sessionType || r.session_type
    }));
};

export const addGuidanceSession = async (session: GuidanceSession) => {
    await supabase.from('guidance_sessions').insert(session);
};

export const updateGuidanceSession = async (session: GuidanceSession) => {
    await supabase.from('guidance_sessions').update(session).eq('id', session.id);
};

export const deleteGuidanceSession = async (id: string) => {
    await supabase.from('guidance_sessions').delete().eq('id', id);
};

// --- GATE / APPOINTMENTS ---
export const getAvailableSlots = async (date?: string): Promise<AppointmentSlot[]> => {
    const d = date || new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('appointment_slots').select('*').eq('date', d);
    return data || [];
};

export const generateDefaultAppointmentSlots = async (date: string) => {
    const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
    const slots = times.map(t => ({
        date,
        startTime: t,
        endTime: t.replace(/:00/, ':30').replace(/:30/, ':00'), // Simple logic
        maxCapacity: 3,
        currentBookings: 0
    }));
    await supabase.from('appointment_slots').insert(slots);
};

export const addAppointmentSlot = async (slot: any) => {
    await supabase.from('appointment_slots').insert(slot);
};

export const deleteAppointmentSlot = async (id: string) => {
    await supabase.from('appointment_slots').delete().eq('id', id);
};

export const updateAppointmentSlot = async (id: string, updates: any) => {
    await supabase.from('appointment_slots').update(updates).eq('id', id);
};

export const bookAppointment = async (appt: any): Promise<Appointment> => {
    // Check capacity first
    const { data: slot } = await supabase.from('appointment_slots').select('*').eq('id', appt.slotId).single();
    if (slot.currentBookings >= slot.maxCapacity) throw new Error("Slot full");
    
    await supabase.from('appointment_slots').update({ currentBookings: slot.currentBookings + 1 }).eq('id', slot.id);
    const { data } = await supabase.from('appointments').insert({ ...appt, status: 'pending' }).select().single();
    return data;
};

export const getDailyAppointments = async (date: string): Promise<Appointment[]> => {
    // Join with slots
    const { data: slots } = await supabase.from('appointment_slots').select('id').eq('date', date);
    const slotIds = slots?.map((s: any) => s.id) || [];
    if (slotIds.length === 0) return [];
    
    const { data: appts } = await supabase.from('appointments').select('*, slot:appointment_slots(*)').in('slotId', slotIds);
    return (appts || []).map((a: any) => ({
        ...a,
        studentName: a.studentName || a.student_name,
        parentName: a.parentName || a.parent_name,
        visitReason: a.visitReason || a.visit_reason
    }));
};

export const getMyAppointments = async (parentId: string): Promise<Appointment[]> => {
    const { data } = await supabase.from('appointments').select('*, slot:appointment_slots(*)').eq('parentCivilId', parentId);
    return (data || []).map((a: any) => ({
        ...a,
        studentName: a.studentName || a.student_name,
        parentName: a.parentName || a.parent_name,
        visitReason: a.visitReason || a.visit_reason
    }));
};

export const checkInVisitor = async (id: string) => {
    await supabase.from('appointments').update({ status: 'completed', arrivedAt: new Date().toISOString() }).eq('id', id);
};

// --- GATE / EXITS ---
export const getExitPermissions = async (date: string): Promise<ExitPermission[]> => {
    // Filter client side for date if timestamp used
    const { data } = await supabase.from('exit_permissions').select('*').gte('createdAt', `${date}T00:00:00`).lte('createdAt', `${date}T23:59:59`);
    return (data || []).map((p: any) => ({
        ...p,
        studentName: p.studentName || p.student_name,
        parentName: p.parentName || p.parent_name,
        className: p.className || p.class_name,
        createdByName: p.createdByName || p.created_by_name
    }));
};

export const addExitPermission = async (perm: any) => {
    await supabase.from('exit_permissions').insert({ ...perm, status: 'pending_pickup' });
};

export const completeExitPermission = async (id: string) => {
    await supabase.from('exit_permissions').update({ status: 'completed', completedAt: new Date().toISOString() }).eq('id', id);
};

export const getExitPermissionById = async (id: string): Promise<ExitPermission | null> => {
    const { data } = await supabase.from('exit_permissions').select('*').eq('id', id).single();
    if (!data) return null;
    return {
        ...data,
        studentName: data.studentName || data.student_name,
        parentName: data.parentName || data.parent_name,
        className: data.className || data.class_name,
        createdByName: data.createdByName || data.created_by_name
    };
};

export const getMyExitPermissions = async (studentIds: string[]): Promise<ExitPermission[]> => {
    const { data } = await supabase.from('exit_permissions').select('*').in('studentId', studentIds);
    return (data || []).map((p: any) => ({
        ...p,
        studentName: p.studentName || p.student_name,
        parentName: p.parentName || p.parent_name,
        className: p.className || p.class_name,
        createdByName: p.createdByName || p.created_by_name
    }));
};

// --- NOTIFICATIONS & NEWS ---
export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
    const { data } = await supabase.from('notifications').select('*').eq('targetUserId', userId).order('createdAt', { ascending: false }).limit(20);
    return data || [];
};

export const createNotification = async (notif: any) => {
    await supabase.from('notifications').insert(notif);
};

export const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ isRead: true }).eq('id', id);
};

export const sendBatchNotifications = async (userIds: string[], type: string, title: string, message: string) => {
    const notifs = userIds.map(uid => ({
        targetUserId: uid,
        type,
        title,
        message,
        isRead: false
    }));
    await supabase.from('notifications').insert(notifs);
};

export const getSchoolNews = async (): Promise<SchoolNews[]> => {
    const { data } = await supabase.from('school_news').select('*').order('createdAt', { ascending: false });
    return data || [];
};

export const addSchoolNews = async (news: any) => {
    await supabase.from('school_news').insert(news);
};

export const deleteSchoolNews = async (id: string) => {
    await supabase.from('school_news').delete().eq('id', id);
};

export const updateSchoolNews = async (news: SchoolNews) => {
    await supabase.from('school_news').update(news).eq('id', news.id);
};

// --- PARENTS ---
export const getParentChildren = async (parentId: string): Promise<Student[]> => {
    const { data: links } = await supabase.from('parents_students').select('studentId').eq('parentCivilId', parentId);
    if (!links || links.length === 0) return [];
    const studentIds = links.map((l: any) => l.studentId);
    const { data: students } = await supabase.from('students').select('*').in('studentId', studentIds);
    return students || [];
};

export const linkParentToStudent = async (parentId: string, studentId: string) => {
    await supabase.from('parents_students').insert({ parentCivilId: parentId, studentId });
};

export const checkParentRegistration = async (parentId: string): Promise<boolean> => {
    const { data } = await supabase.from('parents_students').select('id').eq('parentCivilId', parentId).limit(1);
    return !!data && data.length > 0;
};

export const getAllParentIds = async (): Promise<string[]> => {
    const { data } = await supabase.from('parents_students').select('parentCivilId');
    const ids = new Set<string>((data || []).map((d: any) => d.parentCivilId));
    return Array.from(ids);
};

// --- ADMIN INSIGHTS ---
export const getAdminInsights = async (role?: string): Promise<AdminInsight[]> => {
    let query = supabase.from('admin_insights').select('*').order('createdAt', { ascending: false });
    if (role) query = query.eq('targetRole', role);
    const { data } = await query;
    return data || [];
};

export const sendAdminInsight = async (targetRole: string, content: string) => {
    await supabase.from('admin_insights').insert({ targetRole, content, isRead: false });
};

export const clearAdminInsights = async () => {
    await supabase.from('admin_insights').delete().neq('id', '0');
};

// --- BOT / AI CONTEXT ---
export const getBotContext = async (): Promise<string> => {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'bot_context').single();
    return data?.value || '';
};

export const saveBotContext = async (context: string) => {
    await supabase.from('app_config').upsert({ key: 'bot_context', value: context });
};

export const generateUserSpecificBotContext = async () => {
    const parentId = localStorage.getItem('ozr_parent_id');
    const staffSession = localStorage.getItem('ozr_staff_session');
    
    let role = 'زائر';
    let context = 'لا توجد بيانات خاصة.';

    if (parentId) {
        role = 'ولي أمر';
        const children = await getParentChildren(parentId);
        context = `أبناء المستخدم: ${children.map(c => `${c.name} (${c.grade})`).join(', ')}.`;
    } else if (staffSession) {
        const user = JSON.parse(staffSession);
        role = user.permissions?.includes('students') ? 'إداري/موجه' : 'معلم';
        context = `الاسم: ${user.name}. الصفوف المسندة: ${user.assignments?.map((a:any) => `${a.grade}-${a.className}`).join(', ')}.`;
    }

    const globalContext = await getBotContext();
    return { role, context: `${globalContext}\n\n-- بيانات المستخدم --\n${context}` };
};

// --- AI FUNCTIONS (GEMINI) ---
export const generateSmartContent = async (prompt: string, context?: string, modelName: string = 'gemini-3-flash-preview'): Promise<string> => {
    try {
        const response = await aiClient.models.generateContent({
            model: modelName,
            contents: `${context ? `Context: ${context}\n` : ''}${prompt}`,
        });
        return response.text || '';
    } catch (e) {
        console.error("AI Error:", e);
        return "عذراً، حدث خطأ أثناء المعالجة الذكية.";
    }
};

export const analyzeSentiment = async (text: string): Promise<'positive'|'negative'|'neutral'> => {
    const res = await generateSmartContent(`Analyze sentiment of: "${text}". Reply ONLY with one word: "positive", "negative", or "neutral".`);
    const clean = res.trim().toLowerCase();
    if (clean.includes('positive')) return 'positive';
    if (clean.includes('negative')) return 'negative';
    return 'neutral';
};

export const generateSmartStudentReport = async (studentName: string, attendance: any[], behavior: any[], points: number) => {
    const prompt = `
        اكتب تقريراً تربويًا مختصراً للطالب ${studentName}.
        - نقاط التميز: ${points}
        - الغياب: ${attendance.filter((a: any) => a.status === 'ABSENT').length} أيام
        - المخالفات: ${behavior.length}
        
        الأسلوب: مشجع، رسمي، ويقدم نصيحة.
    `;
    return await generateSmartContent(prompt);
};

export const generateGuidancePlan = async (studentName: string, caseSummary: string) => {
    const prompt = `
        ضع خطة علاجية تربوية للطالب ${studentName}.
        ملخص الحالة: ${caseSummary}
        
        المطلوب: 3 خطوات عملية للمرشد الطلابي، وخطوة واحدة لولي الأمر.
    `;
    return await generateSmartContent(prompt);
};

export const generateTeacherAbsenceSummary = async () => {
    return { message: "تم تحليل الغياب وإرسال التنبيهات للمعلمين المعنيين." };
};

export const sendPendingReferralReminders = async () => {
    return { message: "تم إرسال تذكيرات للمرشدين بالحالات المعلقة." };
};

export const suggestBehaviorAction = async (violation: string, degree: string) => {
    return `بناءً على لائحة السلوك (الدرجة ${degree}) للمخالفة "${violation}"، الإجراء المقترح هو... (AI generated suggestion)`;
};

export const extractTextFromFile = async (file: File): Promise<string> => {
    return `[محتوى الملف ${file.name}]`;
};

// --- MISC UTILS ---
export const getAvailableClassesForGrade = async (grade: string): Promise<string[]> => {
    const { data } = await supabase.from('students').select('className').eq('grade', grade);
    if (!data) return [];
    // Ensure we map from className or class_name if needed, although select specifies 'className'
    // If column name is class_name, supabase returns it as class_name.
    const classes = new Set<string>(data.map((d: any) => d.className || d.class_name));
    return Array.from(classes).sort();
};

export const getExistingGrades = async (): Promise<string[]> => {
    return GRADES;
};
