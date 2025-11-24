import { Student } from "./types";

export const ADMIN_PASSWORD = "1057275826";

export const GRADES = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"];
export const CLASSES = ["أ", "ب", "ج", "د", "هـ", "و"];

export const INITIAL_STUDENTS: Student[] = [
  { id: "1", name: "أحمد محمد علي", studentId: "111222333", grade: "الأول متوسط", className: "أ", phone: "0500000001" },
  { id: "2", name: "سارة خالد العمري", studentId: "444555666", grade: "الأول متوسط", className: "أ", phone: "0500000002" },
  { id: "3", name: "فيصل فهد السعيد", studentId: "777888999", grade: "الثاني متوسط", className: "ج", phone: "0500000003" },
  { id: "4", name: "نورة عبدالله", studentId: "123123123", grade: "الثالث متوسط", className: "ب", phone: "0500000004" },
];