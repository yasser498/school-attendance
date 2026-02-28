-- الجداول الحديثة للعيادة المدرسية وإصدار الشهادات

-- 1. جدول العيادة المدرسية (Clinic Visits)
CREATE TABLE IF NOT EXISTS public.clinic_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL,
    student_name TEXT,
    grade TEXT,
    class_name TEXT,
    date TEXT NOT NULL,
    symptoms TEXT,
    action_taken TEXT,
    sent_home BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول إصدار الشهادات التلقائية (Certificates)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL,
    student_name TEXT,
    grade TEXT,
    class_name TEXT,
    month TEXT NOT NULL,
    type TEXT NOT NULL, -- 'attendance' (تميز في الحضور), 'excellence' (تفوق دراسي/سلوكي)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. إعطاء الصلاحيات للوصول إلى الجداول الجديدة (RLS Policies - إذا كنت تستخدمها)
-- في حال كنت لا تستخدم RLS (Row Level Security) يمكنك تخطي هذا الجزء
-- ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
