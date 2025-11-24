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
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { Student, ExcuseRequest, RequestStatus, StaffUser, AttendanceRecord, AttendanceStatus } from "../types";

// Collection Names
const COLL_STUDENTS = 'students';
const COLL_REQUESTS = 'requests';
const COLL_STAFF = 'staff';
const COLL_ATTENDANCE = 'attendance';

// --- Students ---

export const getStudents = async (): Promise<Student[]> => {
  try {
    const snapshot = await getDocs(collection(db, COLL_STUDENTS));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};

export const saveStudents = async (students: Student[]) => {
  // NOTE: In Firestore, we typically add one by one. 
  // This function is kept for compatibility but should use batch operations for bulk updates.
  // For the Excel sync, we will use a specialized batch function below.
  console.warn("saveStudents: Use batch sync for large operations in Firestore");
};

export const syncStudentsBatch = async (
  toAdd: Student[], 
  toUpdate: Student[], 
  toDeleteIds: string[]
) => {
  const batch = writeBatch(db);

  // Add
  toAdd.forEach(s => {
    const ref = doc(collection(db, COLL_STUDENTS)); // Auto ID
    batch.set(ref, { ...s, id: ref.id });
  });

  // Update
  toUpdate.forEach(s => {
    const ref = doc(db, COLL_STUDENTS, s.id);
    batch.update(ref, { ...s });
  });

  // Delete
  toDeleteIds.forEach(id => {
    const ref = doc(db, COLL_STUDENTS, id);
    batch.delete(ref);
  });

  await batch.commit();
};

export const clearStudents = async () => {
  const snapshot = await getDocs(collection(db, COLL_STUDENTS));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
};

// --- Requests ---

export const getRequests = async (): Promise<ExcuseRequest[]> => {
  try {
    const snapshot = await getDocs(collection(db, COLL_REQUESTS));
    // Sort logic should ideally be server side, but client side is fine for now
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExcuseRequest));
    return data.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  } catch (error) {
    console.error("Error requests:", error);
    return [];
  }
};

export const addRequest = async (req: ExcuseRequest) => {
  // Remove ID as Firestore generates it, or use the one provided
  const { id, ...data } = req;
  const docRef = await addDoc(collection(db, COLL_REQUESTS), data);
  // We might want to update the doc with its generated ID if we use that
  await updateDoc(docRef, { id: docRef.id });
};

export const updateRequestStatus = async (id: string, status: RequestStatus) => {
  const ref = doc(db, COLL_REQUESTS, id);
  await updateDoc(ref, { status });
};

export const clearRequests = async () => {
  const snapshot = await getDocs(collection(db, COLL_REQUESTS));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

// --- Staff Management ---

export const getStaffUsers = async (): Promise<StaffUser[]> => {
  const snapshot = await getDocs(collection(db, COLL_STAFF));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffUser));
};

export const saveStaffUsers = async (users: StaffUser[]) => {
  // Sync logic similar to students is better, but for single adds:
  // This is a placeholder. See `addStaffUser` below.
};

export const addStaffUser = async (user: StaffUser) => {
  const { id, ...data } = user;
  const docRef = await addDoc(collection(db, COLL_STAFF), data);
  await updateDoc(docRef, { id: docRef.id });
};

export const deleteStaffUser = async (id: string) => {
  await deleteDoc(doc(db, COLL_STAFF, id));
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

export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(collection(db, COLL_ATTENDANCE));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
};

export const saveAttendanceRecord = async (record: AttendanceRecord) => {
  // Check if exists for date/grade/class
  const q = query(
    collection(db, COLL_ATTENDANCE), 
    where("date", "==", record.date),
    where("grade", "==", record.grade),
    where("className", "==", record.className)
  );
  
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Update existing
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, COLL_ATTENDANCE, docId), { ...record });
  } else {
    // Create new
    const { id, ...data } = record;
    const docRef = await addDoc(collection(db, COLL_ATTENDANCE), data);
    await updateDoc(docRef, { id: docRef.id });
  }
};

export const clearAttendance = async () => {
  const snapshot = await getDocs(collection(db, COLL_ATTENDANCE));
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};

// Helpers (Async versions)

export const getStudentAttendanceHistory = async (studentId: string): Promise<{ date: string, status: AttendanceStatus }[]> => {
  // This query is inefficient in NoSQL without a subcollection, but fine for small schools
  const allRecords = await getAttendanceRecords();
  const history: { date: string, status: AttendanceStatus }[] = [];

  allRecords.forEach(dayRecord => {
    const studentEntry = dayRecord.records.find(r => r.studentId === studentId);
    if (studentEntry) {
      history.push({
        date: dayRecord.date,
        status: studentEntry.status
      });
    }
  });

  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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