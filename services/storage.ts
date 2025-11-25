import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  deleteDoc,
  writeBatch,
  limit,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Student, ExcuseRequest, RequestStatus, StaffUser, AttendanceRecord, AttendanceStatus } from "../types";

// Collection Names
const COLL_STUDENTS = 'students';
const COLL_REQUESTS = 'requests';
const COLL_STAFF = 'staff';
const COLL_ATTENDANCE = 'attendance';

// --- Caching System ---
// Simple in-memory cache to prevent redundant fetches
const CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 Minutes Cache

// Helper to get data synchronously (Instant Load)
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

// Helper for delay to prevent rate limiting/blocking
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- DIAGNOSTIC TOOL ---
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const testRef = doc(db, 'system_diagnostics', 'connection_test');
    await setDoc(testRef, {
      lastChecked: new Date().toISOString(),
      status: 'online',
      platform: navigator.userAgent
    });
    
    // Verify by reading it back
    const docSnap = await getDoc(testRef);
    if (docSnap.exists()) {
      return { success: true, message: "تم الاتصال بقاعدة البيانات والكتابة والقراءة بنجاح! ✅" };
    } else {
      return { success: false, message: "تمت الكتابة لكن فشلت القراءة (Verify failed)." };
    }
  } catch (error: any) {
    console.error("Firebase Connection Test Error:", error);
    let msg = error.message;
    if (error.code === 'permission-denied') msg = "تم رفض الصلاحية (Permission Denied). تأكد من Rules.";
    if (error.code === 'unavailable') msg = "الخدمة غير متاحة (Offline). تأكد من الإنترنت.";
    if (error.code === 'not-found' || msg.includes('database')) msg = "قاعدة البيانات غير موجودة! تأكد من إنشاء Firestore Database في لوحة تحكم جوجل.";
    return { success: false, message: `فشل الاتصال: ${msg}` };
  }
};

// --- Students ---

export const getStudentsSync = (): Student[] | null => getFromCache<Student[]>('students');

export const getStudents = async (forceRefresh = false): Promise<Student[]> => {
  // 1. Try Cache First
  if (!forceRefresh) {
    const cached = getFromCache<Student[]>('students');
    if (cached) return cached;
  }

  try {
    // 2. Fetch from Firebase
    const snapshot = await getDocs(collection(db, COLL_STUDENTS));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
    
    // 3. Update Cache
    setCache('students', data);
    return data;
  } catch (error) {
    console.error("Error fetching students:", error);
    // Return empty array instead of crashing, but log error
    return [];
  }
};

export const getStudentByCivilId = async (civilId: string): Promise<Student | null> => {
  try {
    // Optimized: Query only 1 document
    const q = query(collection(db, COLL_STUDENTS), where("studentId", "==", civilId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as Student;
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    return null;
  }
};

// Helper to get Distinct Classes dynamically from Students Data
export const getAvailableClassesForGrade = async (grade: string): Promise<string[]> => {
  const students = await getStudents(); // Uses cache if available
  const classes = new Set<string>();
  
  students.forEach(s => {
    if (s.grade === grade && s.className) {
      classes.add(s.className);
    }
  });
  
  return Array.from(classes).sort();
};

export const addStudent = async (student: Student): Promise<Student> => {
  const { id, ...data } = student;
  // Firestore Add
  const docRef = await addDoc(collection(db, COLL_STUDENTS), data);
  const newStudent = { ...student, id: docRef.id };
  
  // Update Cache Optimistically
  const cached = getFromCache<Student[]>('students');
  if (cached) {
    setCache('students', [...cached, newStudent]);
  } else {
    // If no cache exists, just invalidate to force fetch next time
    invalidateCache('students');
  }
  
  return newStudent;
};

export const deleteStudent = async (id: string) => {
  await deleteDoc(doc(db, COLL_STUDENTS, id));
  
  // Update Cache Optimistically
  const cached = getFromCache<Student[]>('students');
  if (cached) {
    setCache('students', cached.filter(s => s.id !== id));
  }
};

// Batch Sync (For Excel Uploads) - Optimized for Reliability & Anti-Blocking
export const syncStudentsBatch = async (
  toAdd: Student[], 
  toUpdate: Student[], 
  toDeleteIds: string[]
) => {
  // Firebase limits batches to 500 operations. 
  // We use 150 to be extremely safe against browser throttling and network blocking.
  const BATCH_SIZE = 150;

  const processChunk = async (operations: any[], type: 'add' | 'update' | 'delete') => {
    
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      // Add delay between batches to prevent "ERR_BLOCKED_BY_CLIENT"
      if (i > 0) {
        await delay(500); // Wait 500ms
      }

      const chunk = operations.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(item => {
        try {
          if (type === 'add') {
            const s = item as Student;
            const ref = doc(collection(db, COLL_STUDENTS));
            batch.set(ref, { 
              name: s.name || '',
              studentId: s.studentId || '',
              grade: s.grade || '',
              className: s.className || '',
              phone: s.phone || '',
              id: ref.id
            });
          } else if (type === 'update') {
            const s = item as Student;
            const ref = doc(db, COLL_STUDENTS, s.id);
            batch.update(ref, { 
               name: s.name,
               studentId: s.studentId,
               grade: s.grade,
               className: s.className,
               phone: s.phone
            });
          } else if (type === 'delete') {
            const id = item as string;
            const ref = doc(db, COLL_STUDENTS, id);
            batch.delete(ref);
          }
        } catch (err) {
          console.error(`Error preparing batch for ${type}:`, err);
        }
      });

      try {
        await batch.commit();
        console.log(`Successfully processed batch of ${chunk.length} ${type} operations.`);
      } catch (error: any) {
        console.error("Batch commit failed:", error);
        // If permission denied, throw immediately
        if (error.code === 'permission-denied') {
          throw new Error("لا تملك صلاحية الحفظ. تأكد من إعدادات Firestore Rules.");
        }
        throw error; // Re-throw to stop process and alert user
      }
    }
  };

  // Run sequentially
  if (toAdd.length > 0) await processChunk(toAdd, 'add');
  if (toUpdate.length > 0) await processChunk(toUpdate, 'update');
  if (toDeleteIds.length > 0) await processChunk(toDeleteIds, 'delete');

  // Invalidate cache so next fetch gets fresh data
  invalidateCache('students'); 
};

export const clearStudents = async () => {
  const snapshot = await getDocs(collection(db, COLL_STUDENTS));
  const BATCH_SIZE = 150; // Safer batch size
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    if (i > 0) await delay(300);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  
  setCache('students', []);
};

// --- Requests ---

export const getRequestsSync = (): ExcuseRequest[] | null => getFromCache<ExcuseRequest[]>('requests');

export const getRequests = async (forceRefresh = false): Promise<ExcuseRequest[]> => {
  if (!forceRefresh) {
    const cached = getFromCache<ExcuseRequest[]>('requests');
    if (cached) return cached;
  }

  try {
    const snapshot = await getDocs(collection(db, COLL_REQUESTS));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExcuseRequest));
    // Sort client-side to reduce index requirements
    const sorted = data.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
    setCache('requests', sorted);
    return sorted;
  } catch (error) {
    console.error("Error requests:", error);
    return [];
  }
};

export const getRequestsByStudentId = async (studentId: string): Promise<ExcuseRequest[]> => {
  // Try cache first
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    return cached.filter(r => r.studentId === studentId);
  }
  
  // Fallback to direct query
  const q = query(collection(db, COLL_REQUESTS), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExcuseRequest));
  return data.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
};

export const addRequest = async (req: ExcuseRequest) => {
  const { id, ...data } = req;
  const docRef = await addDoc(collection(db, COLL_REQUESTS), data);
  const newReq = { ...req, id: docRef.id };
  
  // Update Cache
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    setCache('requests', [newReq, ...cached]);
  } else {
    invalidateCache('requests');
  }
};

export const updateRequestStatus = async (id: string, status: RequestStatus) => {
  const ref = doc(db, COLL_REQUESTS, id);
  await updateDoc(ref, { status });
  
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    const updated = cached.map(r => r.id === id ? { ...r, status } : r);
    setCache('requests', updated);
  }
};

export const clearRequests = async () => {
  const snapshot = await getDocs(collection(db, COLL_REQUESTS));
  const BATCH_SIZE = 150;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    if (i > 0) await delay(300);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  setCache('requests', []);
};

// --- Staff Management ---

export const getStaffUsersSync = (): StaffUser[] | null => getFromCache<StaffUser[]>('staff');

export const getStaffUsers = async (forceRefresh = false): Promise<StaffUser[]> => {
  if (!forceRefresh) {
     const cached = getFromCache<StaffUser[]>('staff');
     if (cached) return cached;
  }
  const snapshot = await getDocs(collection(db, COLL_STAFF));
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffUser));
  setCache('staff', data);
  return data;
};

export const addStaffUser = async (user: StaffUser) => {
  const { id, ...data } = user;
  await addDoc(collection(db, COLL_STAFF), data);
  invalidateCache('staff');
};

export const deleteStaffUser = async (id: string) => {
  await deleteDoc(doc(db, COLL_STAFF, id));
  invalidateCache('staff');
};

export const authenticateStaff = async (passcode: string): Promise<StaffUser | null> => {
  // Query only needed fields to be faster
  const q = query(collection(db, COLL_STAFF), where("passcode", "==", passcode), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as StaffUser;
  }
  return null;
};

// --- Attendance Management ---

export const getAttendanceRecordsSync = (): AttendanceRecord[] | null => getFromCache<AttendanceRecord[]>('attendance');

export const getAttendanceRecords = async (forceRefresh = false): Promise<AttendanceRecord[]> => {
  if (!forceRefresh) {
    const cached = getFromCache<AttendanceRecord[]>('attendance');
    if (cached) return cached;
  }

  const snapshot = await getDocs(collection(db, COLL_ATTENDANCE));
  const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  setCache('attendance', data);
  return data;
};

export const saveAttendanceRecord = async (record: AttendanceRecord) => {
  // Check if record exists for this date/grade/class
  const q = query(
    collection(db, COLL_ATTENDANCE), 
    where("date", "==", record.date),
    where("grade", "==", record.grade),
    where("className", "==", record.className),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, COLL_ATTENDANCE, docId), { ...record });
  } else {
    const { id, ...data } = record;
    const docRef = await addDoc(collection(db, COLL_ATTENDANCE), data);
  }
  invalidateCache('attendance');
};

export const clearAttendance = async () => {
  const snapshot = await getDocs(collection(db, COLL_ATTENDANCE));
  const BATCH_SIZE = 150;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    if (i > 0) await delay(300);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  setCache('attendance', []);
};

// Helpers

export const getStudentAttendanceHistory = async (studentId: string, grade: string, className: string): Promise<{ date: string, status: AttendanceStatus }[]> => {
  try {
    // Only fetch records for the student's specific class to reduce read costs
    const q = query(
      collection(db, COLL_ATTENDANCE), 
      where("grade", "==", grade), 
      where("className", "==", className)
    );
    
    const snapshot = await getDocs(q);
    const history: { date: string, status: AttendanceStatus }[] = [];

    snapshot.forEach(doc => {
      const data = doc.data() as AttendanceRecord;
      const studentEntry = data.records.find(r => r.studentId === studentId);
      if (studentEntry) {
        history.push({
          date: data.date,
          status: studentEntry.status
        });
      }
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return [];
  }
};

export const getDailyAttendanceReport = async (date: string) => {
  const q = query(collection(db, COLL_ATTENDANCE), where("date", "==", date));
  const snapshot = await getDocs(q);
  const dayRecords = snapshot.docs.map(d => d.data() as AttendanceRecord);
  
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  const details: { studentName: string, grade: string, className: string, status: AttendanceStatus }[] = [];

  dayRecords.forEach(record => {
    record.records.forEach(student => {
      if (student.status === AttendanceStatus.PRESENT) totalPresent++;
      if (student.status === AttendanceStatus.ABSENT) totalAbsent++;
      if (student.status === AttendanceStatus.LATE) totalLate++;
      
      if (student.status !== AttendanceStatus.PRESENT) {
        details.push({
          studentName: student.studentName,
          grade: record.grade,
          className: record.className,
          status: student.status
        });
      }
    });
  });

  return { totalPresent, totalAbsent, totalLate, details };
};