-- الجداول الحديثة للمقصف المدرسي (Canteen Wallet) والموافقات الرقمية للأنشطة والرحلات (E-Slips)

-- 1. جدول الأنشطة والرحلات (Activities & Trips)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    target_grades TEXT[] DEFAULT '{}',
    cost INTEGER,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول الموافقات الرقمية (Activity Approvals)
CREATE TABLE IF NOT EXISTS public.activity_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT,
    grade TEXT,
    class_name TEXT,
    parent_civil_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'approved', 'rejected'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, student_id) -- لمنع تكرار موافقة/رفض نفس الطالب لنفس النشاط
);

-- 3. المحفظة الرقمية وحركة المقصف المدرسي (Wallet Transactions)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'recharge' (شحن), 'purchase' (شراء)
    amount INTEGER NOT NULL CHECK (amount > 0),
    description TEXT,
    created_by TEXT, -- موظف المقصف الذي نفذ العملية
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. إعطاء الصلاحيات للوصول إلى الجداول الجديدة (RLS Policies - إذا كنت تستخدمها)
-- في حال كنت لا تستخدم RLS (Row Level Security) يمكنك تخطي هذا الجزء
-- ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.activity_approvals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ملاحطة: لمنع حدوث مشاكل مستقبلاً، تأكد من تحديث دالة الـ getStudentWallet في الكود 
-- لتقوم بجلب البيانات من جدول wallet_transactions وجمعها (Recharge - Purchase) = المتبقي
