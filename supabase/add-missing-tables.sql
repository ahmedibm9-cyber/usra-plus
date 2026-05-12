-- Create family_invites table
CREATE TABLE IF NOT EXISTS public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT,
  invitee_phone TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_invites
CREATE POLICY "Family members can view invites" ON public.family_invites FOR SELECT USING (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  OR inviter_id = auth.uid()
  OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Family owners/admins can create invites" ON public.family_invites FOR INSERT WITH CHECK (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Invitees can update invite status" ON public.family_invites FOR UPDATE USING (
  invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR inviter_id = auth.uid()
);

-- Create bug_logs table for admin error tracking
CREATE TABLE IF NOT EXISTS public.bug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'api', 'render', 'database', 'auth', 'performance', 'network', 'other')),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 1,
  fingerprint TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bug_logs
ALTER TABLE public.bug_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access bug_logs (admin only)
CREATE POLICY "Service role can manage bug_logs" ON public.bug_logs FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_logs_severity ON public.bug_logs(severity);
CREATE INDEX IF NOT EXISTS idx_bug_logs_status ON public.bug_logs(status);
CREATE INDEX IF NOT EXISTS idx_bug_logs_created_at ON public.bug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_logs_fingerprint ON public.bug_logs(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON public.family_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_code ON public.family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_invites_status ON public.family_invites(status);
