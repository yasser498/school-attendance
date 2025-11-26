import { supabase } from '../supabaseClient';
import { EnhancedStudent, AutomaticReferralLog } from '../types';

export class AbsenceMonitorService {
  /**
   * حساب الغياب بدون عذر لطالب معين
   */
  static async calculateUnexcusedAbsences(studentId: string): Promise<number> {
    try {
      // جلب سجلات الغياب من آخر 3 أشهر
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('records', studentId) // تحقق من البنية الفعلية
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      if (error) throw error;

      // جلب الأعذار المقبولة
      const { data: excuses } = await supabase
        .from('requests')
        .select('date')
        .eq('studentId', studentId)
        .eq('status', 'APPROVED')
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      const excusedDates = new Set((excuses || []).map(e => e.date));
      
      // حساب الغياب بدون عذر
      let count = 0;
      (attendance || []).forEach(record => {
        const records = JSON.parse(record.records || '[]');
        records.forEach((r: any) => {
          if (r.studentId === studentId && r.status === 'ABSENT' && !excusedDates.has(record.date)) {
            count++;
          }
        });
      });

      return count;
    } catch (error) {
      console.error('Error calculating absences:', error);
      return 0;
    }
  }

  /**
   * فحص جميع الطلاب وإنشاء إحالات تلقائية
   */
  static async checkAllStudentsAndCreateReferrals(): Promise<void> {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*');

      if (!students) return;

      for (const student of students) {
        await this.processStudent(student);
      }
    } catch (error) {
      console.error('Error checking students:', error);
    }
  }

  /**
   * معالجة طالب واحد
   */
  private static async processStudent(student: any): Promise<void> {
    const unexcusedCount = await this.calculateUnexcusedAbsences(student.studentId);

    // تحديث بيانات الطالب
    await supabase
      .from('students')
      .update({
        absence_count_unexcused: unexcusedCount,
        last_absence_date: new Date().toISOString()
      })
      .eq('studentId', student.studentId);

    // إنشاء إحالة عند 3 أيام
    if (unexcusedCount === 3) {
      await this.createAutoReferral(student, 3, 'deputy');
    }

    // إنشاء إحالة عند 5 أيام
    if (unexcusedCount >= 5) {
      await this.createAutoReferral(student, unexcusedCount, 'counselor');
    }
  }

  /**
   * إنشاء إحالة تلقائية
   */
  private static async createAutoReferral(
    student: any,
    absenceCount: number,
    level: 'deputy' | 'counselor'
  ): Promise<void> {
    const message = level === 'deputy'
      ? 'تجاوز الطالب 3 أيام غياب بدون عذر - يُحال إلى وكيل شؤون الطلاب'
      : 'تجاوز الطالب 5 أيام غياب بدون عذر - يُحال إلى الموجه الطلابي لاستدعاء ولي الأمر';

    // التحقق من عدم وجود إحالة مماثلة
    const { data: existing } = await supabase
      .from('automatic_referral_log')
      .select('*')
      .eq('student_id', student.studentId)
      .eq('absence_count', absenceCount)
      .eq('processed', false)
      .single();

    if (existing) return;

    // إنشاء إحالة جديدة
    await supabase.from('automatic_referral_log').insert({
      student_id: student.studentId,
      student_name: student.name,
      absence_count: absenceCount,
      referral_level: level,
      notes: message,
      processed: false
    });

    // تحديث حالة الطالب
    await supabase
      .from('students')
      .update({ referral_status: level })
      .eq('studentId', student.studentId);
  }
}
