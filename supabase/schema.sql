-- =====================================================================
-- APPLOYE SAAS: COMPLETE PRODUCTION SUPABASE POSTGRESQL SCHEMA WITH RLS
-- Multi-Tenant Time Tracking, Proof of Work Monitoring & Payroll
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types
DO $$ BEGIN
  CREATE TYPE platform_role AS ENUM ('SUPER_ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('ORG_OWNER', 'MANAGER', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE pricing_plan AS ENUM ('SOLO', 'STANDARD', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE budget_type AS ENUM ('TOTAL_COST', 'TOTAL_HOURS', 'MONTHLY_COST', 'MONTHLY_HOURS', 'NONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE time_entry_type AS ENUM ('AUTOMATIC_DESKTOP', 'MANUAL_REQUEST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE productivity_category AS ENUM ('PRODUCTIVE', 'UNPRODUCTIVE', 'NEUTRAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('PAID_TIME_OFF', 'SICK_LEAVE', 'CASUAL_LEAVE', 'UNPAID_LEAVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shift_attendance_status AS ENUM ('ON_TIME', 'LATE', 'ABSENT', 'HALF_DAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'VOID', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('DRAFT', 'APPROVED', 'PROCESSED', 'PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------
-- 3. Core Tables: Tenancy, Profiles, and Memberships
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  platform_role platform_role DEFAULT 'USER'::platform_role,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  
  -- Stripe Subscription fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  subscription_status subscription_status DEFAULT 'TRIALING'::subscription_status,
  plan pricing_plan DEFAULT 'STANDARD'::pricing_plan,
  seats_allocated INT DEFAULT 5,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  
  -- Global Monitoring & Policy Settings
  default_screenshot_frequency INT DEFAULT 3, -- 1-10 per 10-minute block
  stealth_mode_enabled BOOLEAN DEFAULT FALSE,
  idle_timeout_minutes INT DEFAULT 5,
  blur_screenshots_by_default BOOLEAN DEFAULT FALSE,
  allow_manual_time BOOLEAN DEFAULT TRUE,
  track_apps_and_urls BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role org_role DEFAULT 'MEMBER'::org_role,
  job_title TEXT,
  hourly_pay_rate NUMERIC(10, 2) DEFAULT 0.00,
  billable_hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  weekly_capacity_hours NUMERIC(5, 2) DEFAULT 40.00,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Per-Member Tracking Overrides
  override_screenshots_per_10m INT,
  stealth_mode_override BOOLEAN,
  is_monitoring_exempt BOOLEAN DEFAULT FALSE,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ---------------------------------------------------------------------
-- 4. Clients, Projects & Tasks
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_billable BOOLEAN DEFAULT TRUE,
  billing_rate NUMERIC(10, 2) DEFAULT 0.00,
  budget_type budget_type DEFAULT 'NONE'::budget_type,
  budget_amount NUMERIC(12, 2) DEFAULT 0.00,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  custom_rate NUMERIC(10, 2),
  UNIQUE(project_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.organization_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(6, 2),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. Time Tracking, Screenshots & Activity Monitoring Engine
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  entry_type time_entry_type DEFAULT 'AUTOMATIC_DESKTOP'::time_entry_type,
  is_billable BOOLEAN DEFAULT TRUE,
  hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  is_manual BOOLEAN DEFAULT FALSE,
  approval_status approval_status DEFAULT 'APPROVED'::approval_status,
  manual_reason TEXT,
  approved_by_id UUID REFERENCES public.organization_members(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  monitor_index INT DEFAULT 0,
  resolution TEXT,
  is_blurred BOOLEAN DEFAULT FALSE,
  activity_score_at_capture INT DEFAULT 0, -- 0 to 100%
  active_app_name TEXT,
  active_window_title TEXT,
  is_suspicious_jiggler BOOLEAN DEFAULT FALSE,
  is_deleted_by_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  block_start_time TIMESTAMPTZ NOT NULL,
  block_end_time TIMESTAMPTZ NOT NULL,
  keystrokes_count INT DEFAULT 0,
  mouse_clicks_count INT DEFAULT 0,
  mouse_movement_pixels INT DEFAULT 0,
  active_duration_seconds INT DEFAULT 600,
  idle_duration_seconds INT DEFAULT 0,
  productivity_percentage NUMERIC(5, 2) DEFAULT 0.00,
  flagged_jiggler_pattern BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_url_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,
  window_title TEXT NOT NULL,
  url_or_domain TEXT,
  duration_seconds INT DEFAULT 0,
  category productivity_category DEFAULT 'NEUTRAL'::productivity_category,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  matcher_pattern TEXT NOT NULL,
  target_field TEXT NOT NULL, -- 'PROCESS' | 'DOMAIN'
  category productivity_category NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, matcher_pattern, target_field)
);

-- ---------------------------------------------------------------------
-- 6. Timesheet Approvals, Shifts & Leaves
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_hours_worked NUMERIC(7, 2) DEFAULT 0.00,
  billable_hours NUMERIC(7, 2) DEFAULT 0.00,
  manual_hours NUMERIC(7, 2) DEFAULT 0.00,
  status approval_status DEFAULT 'PENDING'::approval_status,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(member_id, period_start_date, period_end_date)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  leave_type leave_type DEFAULT 'PAID_TIME_OFF'::leave_type,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4, 1) NOT NULL,
  reason TEXT,
  status approval_status DEFAULT 'PENDING'::approval_status,
  reviewer_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time_utc TEXT NOT NULL, -- e.g. '09:00'
  end_time_utc TEXT NOT NULL,   -- e.g. '17:00'
  days_of_week INT[] NOT NULL,  -- e.g. ARRAY[1,2,3,4,5]
  grace_minutes INT DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shift_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  status shift_attendance_status DEFAULT 'ON_TIME'::shift_attendance_status,
  late_minutes INT DEFAULT 0,
  notes TEXT,
  UNIQUE(shift_id, member_id, date)
);

-- ---------------------------------------------------------------------
-- 7. Invoices & Payrolls
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC(12, 2) NOT NULL,
  tax_rate_percent NUMERIC(5, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL,
  status invoice_status DEFAULT 'DRAFT'::invoice_status,
  notes TEXT,
  stripe_invoice_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity_hours NUMERIC(8, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_hours NUMERIC(8, 2) NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  gross_pay NUMERIC(12, 2) NOT NULL,
  bonus_amount NUMERIC(10, 2) DEFAULT 0.00,
  deduction_amount NUMERIC(10, 2) DEFAULT 0.00,
  net_pay NUMERIC(12, 2) NOT NULL,
  status payroll_status DEFAULT 'DRAFT'::payroll_status,
  payment_method TEXT,
  transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, member_id, period_start_date, period_end_date)
);

-- ---------------------------------------------------------------------
-- 8. Performance Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_time_entries_member_start ON public.time_entries(member_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_member_captured ON public.screenshots(member_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_member_block ON public.activity_logs(member_id, block_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_app_url_logs_member ON public.app_url_logs(member_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_timesheet_org_member ON public.timesheet_approvals(organization_id, member_id);

-- ---------------------------------------------------------------------
-- 9. Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_url_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- Security helper function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id AND user_id = auth.uid() AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security helper function to check manager or owner role
CREATE OR REPLACE FUNCTION public.is_org_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id AND user_id = auth.uid() 
      AND role IN ('ORG_OWNER', 'MANAGER') AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "Owners can update organization settings"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Time entries policies:
-- Members can view their own entries; Managers can view all entries in org
CREATE POLICY "View time entries"
  ON public.time_entries FOR SELECT
  USING (
    member_id IN (SELECT id FROM public.organization_members WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.id = public.time_entries.member_id AND is_org_manager(om.organization_id)
    )
  );

CREATE POLICY "Insert time entries for self"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM public.organization_members WHERE user_id = auth.uid())
  );
