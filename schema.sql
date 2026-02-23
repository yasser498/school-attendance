-- Create Extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    "studentId" TEXT UNIQUE NOT NULL, -- Civil ID / National ID
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: excuse_requests
CREATE TABLE IF NOT EXISTS public.excuse_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "date" DATE NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    "attachmentName" TEXT,
    "attachmentUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: staff_users
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    passcode TEXT NOT NULL,
    assignments JSONB DEFAULT '[]'::jsonb, -- Array of objects: [{grade: '...', className: '...'}]
    permissions JSONB DEFAULT '[]'::jsonb, -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: attendance_records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "date" DATE NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "staffId" UUID REFERENCES public.staff_users(id),
    records JSONB DEFAULT '[]'::jsonb, -- Array of {studentId, studentName, status}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: resolved_alerts
CREATE TABLE IF NOT EXISTS public.resolved_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "dateResolved" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "actionType" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: behavior_records
CREATE TABLE IF NOT EXISTS public.behavior_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "violationDegree" TEXT NOT NULL,
    "violationName" TEXT NOT NULL,
    "articleNumber" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    notes TEXT,
    "staffId" UUID REFERENCES public.staff_users(id),
    "parentViewed" BOOLEAN DEFAULT FALSE,
    "parentFeedback" TEXT,
    "parentViewedAt" TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: admin_insights
CREATE TABLE IF NOT EXISTS public.admin_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "targetRole" TEXT NOT NULL,
    content TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "referralDate" DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    "referredBy" TEXT NOT NULL,
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Table: guidance_sessions
CREATE TABLE IF NOT EXISTS public.guidance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessionType" TEXT NOT NULL,
    topic TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ongoing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table: student_points
CREATE TABLE IF NOT EXISTS public.student_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table: app_notifications
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "targetUserId" TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table: parent_links
CREATE TABLE IF NOT EXISTS public.parent_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "parentCivilId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Table: student_observations
CREATE TABLE IF NOT EXISTS public.student_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "date" DATE NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    "staffId" UUID REFERENCES public.staff_users(id),
    "staffName" TEXT NOT NULL,
    "parentViewed" BOOLEAN DEFAULT FALSE,
    "parentFeedback" TEXT,
    "parentViewedAt" TIMESTAMP WITH TIME ZONE,
    sentiment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Table: school_news
CREATE TABLE IF NOT EXISTS public.school_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    "isUrgent" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Table: appointment_slots
CREATE TABLE IF NOT EXISTS public.appointment_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "currentBookings" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Table: appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "slotId" UUID NOT NULL REFERENCES public.appointment_slots(id) ON DELETE CASCADE,
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentCivilId" TEXT NOT NULL,
    "visitReason" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    "arrivedAt" TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Table: exit_permissions
CREATE TABLE IF NOT EXISTS public.exit_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" TEXT NOT NULL REFERENCES public.students("studentId") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    grade TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    reason TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT,
    status TEXT NOT NULL DEFAULT 'pending_pickup',
    "completedAt" TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for all tables
-- (Optional but recommended in Supabase)
-- ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.excuse_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.resolved_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.behavior_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.admin_insights ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.guidance_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.student_observations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.school_news ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.exit_permissions ENABLE ROW LEVEL SECURITY;
