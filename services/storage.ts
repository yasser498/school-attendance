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
  limit
} from 'firebase/firestore';
import { Student, ExcuseRequest, RequestStatus, StaffUser, AttendanceRecord, AttendanceStatus } from "../types";

// Collection Names
const COLL_STUDENTS = 'students';
const COLL_REQUESTS = 'requests';
const COLL_STAFF = 'staff';
const COLL_ATTENDANCE = 'attendance';

// --- Caching System ---
const CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 Minutes

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

// --- Students ---

export const getStudentsSync = (): Student[] | null => getFromCache<Student[]>('students');

export const getStudents = async (forceRefresh = false): Promise<Student[]> => {
  if (!forceRefresh) {
    const cached = getFromCache<Student[]>('students');
    if (cached) return cached;
  }

  try {
    const snapshot = await getDocs(collection(db, COLL_STUDENTS));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
    setCache('students', data);
    return data;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

export const getStudentByCivilId = async (civilId: string): Promise<Student | null> => {
  try {
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

// Optimized Single Add
export const addStudent = async (student: Student): Promise<Student> => {
  const { id, ...data } = student;
  const docRef = await addDoc(collection(db, COLL_STUDENTS), data);
  const newStudent = { ...student, id: docRef.id };
  
  // Update Cache Optimistically
  const cached = getFromCache<Student[]>('students');
  if (cached) {
    setCache('students', [...cached, newStudent]);
  }
  
  return newStudent;
};

// Optimized Single Delete
export const deleteStudent = async (id: string) => {
  await deleteDoc(doc(db, COLL_STUDENTS, id));
  
  // Update Cache Optimistically
  const cached = getFromCache<Student[]>('students');
  if (cached) {
    setCache('students', cached.filter(s => s.id !== id));
  }
};

// Batch Sync (For Excel Uploads)
export const syncStudentsBatch = async (
  toAdd: Student[], 
  toUpdate: Student[], 
  toDeleteIds: string[]
) => {
  const BATCH_SIZE = 250;

  const processChunk = async (operations: any[], type: 'add' | 'update' | 'delete') => {
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const chunk = operations.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(item => {
        if (type === 'add') {
          const s = item as Student;
          const ref = doc(collection(db, COLL_STUDENTS));
          batch.set(ref, { ...s, id: ref.id });
        } else if (type === 'update') {
          const s = item as Student;
          const ref = doc(db, COLL_STUDENTS, s.id);
          batch.update(ref, { ...s });
        } else if (type === 'delete') {
          const id = item as string;
          const ref = doc(db, COLL_STUDENTS, id);
          batch.delete(ref);
        }
      });

      await batch.commit();
    }
  };

  await processChunk(toAdd, 'add');
  await processChunk(toUpdate, 'update');
  await processChunk(toDeleteIds, 'delete');

  // Invalidate cache for bulk operations as complex merging is risky
  invalidateCache('students'); 
};

export const clearStudents = async () => {
  const snapshot = await getDocs(collection(db, COLL_STUDENTS));
  const BATCH_SIZE = 250;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
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
    const sorted = data.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
    setCache('requests', sorted);
    return sorted;
  } catch (error) {
    console.error("Error requests:", error);
    return [];
  }
};

export const getRequestsByStudentId = async (studentId: string): Promise<ExcuseRequest[]> => {
  // Try to find in cache first for speed
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    return cached.filter(r => r.studentId === studentId);
  }
  
  try {
    const q = query(collection(db, COLL_REQUESTS), where("studentId", "==", studentId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExcuseRequest));
    return data.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  } catch (error) {
    console.error("Error fetching requests by student:", error);
    return [];
  }
};

export const addRequest = async (req: ExcuseRequest) => {
  const { id, ...data } = req;
  const docRef = await addDoc(collection(db, COLL_REQUESTS), data);
  const newReq = { ...req, id: docRef.id };
  
  // Optimistic Cache Update
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    setCache('requests', [newReq, ...cached]);
  } else {
    // If no cache, allow next fetch to populate
    invalidateCache('requests');
  }
};

export const updateRequestStatus = async (id: string, status: RequestStatus) => {
  const ref = doc(db, COLL_REQUESTS, id);
  await updateDoc(ref, { status });
  
  // Optimistic Cache Update
  const cached = getFromCache<ExcuseRequest[]>('requests');
  if (cached) {
    const updated = cached.map(r => r.id === id ? { ...r, status } : r);
    setCache('requests', updated);
  }
};

export const clearRequests = async () => {
  const snapshot = await getDocs(collection(db, COLL_REQUESTS));
  const BATCH_SIZE = 250;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
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
  const docRef = await addDoc(collection(db, COLL_STAFF), data);
  invalidateCache('staff');
};

export const deleteStaffUser = async (id: string) => {
  await deleteDoc(doc(db, COLL_STAFF, id));
  invalidateCache('staff');
};

export const authenticateStaff = async (passcode: string): Promise<StaffUser | null> => {
  const q = query(collection(db, COLL_STAFF), where("passcode", "==", passcode));
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
  const q = query(
    collection(db, COLL_ATTENDANCE), 
    where("date", "==", record.date),
    where("grade", "==", record.grade),
    where("className", "==", record.className)
  );
  
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, COLL_ATTENDANCE, docId), { ...record });
  } else {
    const { id, ...data } = record;
    const docRef = await addDoc(collection(db, COLL_ATTENDANCE), data);
    await updateDoc(docRef, { id: docRef.id });
  }
  invalidateCache('attendance');
};

export const clearAttendance = async () => {
  const snapshot = await getDocs(collection(db, COLL_ATTENDANCE));
  const BATCH_SIZE = 250;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
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