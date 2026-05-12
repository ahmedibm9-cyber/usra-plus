-- ============================================================
-- USRA PLUS — Additional Tables Migration
-- ============================================================
-- This migration adds tables for 4 features that previously
-- had no Supabase persistence:
--   - Budget / Expenses (budget_months, expenses)
--   - Meal Plans (meal_plans)
--   - Chores (chores, chore_logs)
--   - Milestones (milestones)
--
-- Prerequisites: The base migration (complete-migration.sql)
-- must already be applied — these tables reference
-- public.families and public.profiles.
--
-- To execute:
--   Option A: Copy-paste into Supabase SQL Editor and click Run
--   Option B: Run `bun run scripts/run-migration.ts`
--   Option C: Use supabase CLI: npx supabase db query --linked -f supabase/additional-tables.sql
-- ============================================================


-- ============================================================
-- 1. BUDGET_MONTHS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budget_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- '2025-01'
  total_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '{}', -- {"food": 500, "housing": 1000, ...}
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, month)
);

ALTER TABLE public.budget_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view budget months" ON public.budget_months
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = budget_months.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create budget months" ON public.budget_months
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = budget_months.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update budget months" ON public.budget_months
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = budget_months.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin can delete budget months" ON public.budget_months
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = budget_months.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );


-- ============================================================
-- 2. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  budget_month_id UUID REFERENCES public.budget_months(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'housing', 'transport', 'education', 'health', 'entertainment', 'shopping', 'utilities', 'other')),
  expense_date DATE NOT NULL,
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = expenses.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = expenses.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update expenses" ON public.expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = expenses.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin can delete expenses" ON public.expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = expenses.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR auth.uid() = paid_by
  );


-- ============================================================
-- 3. MEAL_PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meal_type TEXT NOT NULL DEFAULT 'lunch' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_date DATE NOT NULL,
  assigned_to UUID[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  recipe_url TEXT,
  prep_time INTEGER,
  calories INTEGER,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view meal plans" ON public.meal_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = meal_plans.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = meal_plans.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update meal plans" ON public.meal_plans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = meal_plans.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin or creator can delete meal plans" ON public.meal_plans
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = meal_plans.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR auth.uid() = created_by
  );


-- ============================================================
-- 4. CHORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  assigned_to UUID[] DEFAULT '{}',
  rotation_order UUID[] DEFAULT '{}',
  current_assignee_index INTEGER DEFAULT 0,
  last_rotated_at TIMESTAMPTZ,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_minutes INTEGER DEFAULT 15,
  is_paused BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view chores" ON public.chores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chores.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create chores" ON public.chores
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chores.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update chores" ON public.chores
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chores.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin or creator can delete chores" ON public.chores
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chores.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR auth.uid() = created_by
  );


-- ============================================================
-- 5. CHORE_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chore_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES public.chores(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chore_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view chore logs" ON public.chore_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chores c
      INNER JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE c.id = chore_logs.chore_id AND fm.user_id = auth.uid()
    )
  );
CREATE POLICY "Family members can create chore logs" ON public.chore_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chores c
      INNER JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE c.id = chore_logs.chore_id AND fm.user_id = auth.uid()
    )
  );
CREATE POLICY "Owner/admin or completer can delete chore logs" ON public.chore_logs
  FOR DELETE USING (
    auth.uid() = completed_by
    OR EXISTS (
      SELECT 1 FROM public.chores c
      INNER JOIN public.family_members fm ON fm.family_id = c.family_id
      WHERE c.id = chore_logs.chore_id AND fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
    )
  );


-- ============================================================
-- 6. MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('birthday', 'anniversary', 'graduation', 'achievement', 'custom')),
  description TEXT,
  person_id UUID REFERENCES public.profiles(id),
  emoji TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  notify_days_before INTEGER DEFAULT 7,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view milestones" ON public.milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = milestones.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create milestones" ON public.milestones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = milestones.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update milestones" ON public.milestones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = milestones.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin or creator can delete milestones" ON public.milestones
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = milestones.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR auth.uid() = created_by
  );


-- ============================================================
-- 7. TASK_COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view task comments" ON public.task_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = task_comments.task_id AND fm.user_id = auth.uid())
  );
CREATE POLICY "Family members can create task comments" ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.family_members fm ON fm.family_id = t.family_id WHERE t.id = task_comments.task_id AND fm.user_id = auth.uid())
  );
CREATE POLICY "Author can delete own comments" ON public.task_comments
  FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON public.task_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at);


-- ============================================================
-- 8. INDEXES
-- ============================================================

-- budget_months indexes
CREATE INDEX IF NOT EXISTS idx_budget_months_family_id ON public.budget_months(family_id);
CREATE INDEX IF NOT EXISTS idx_budget_months_month ON public.budget_months(month);
CREATE INDEX IF NOT EXISTS idx_budget_months_family_month ON public.budget_months(family_id, month);
CREATE INDEX IF NOT EXISTS idx_budget_months_created_by ON public.budget_months(created_by);

-- expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_family_id ON public.expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_budget_month_id ON public.expenses(budget_month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_family_date ON public.expenses(family_id, expense_date);

-- meal_plans indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_id ON public.meal_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_date ON public.meal_plans(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_type ON public.meal_plans(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_family_date ON public.meal_plans(family_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_by ON public.meal_plans(created_by);

-- chores indexes
CREATE INDEX IF NOT EXISTS idx_chores_family_id ON public.chores(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_frequency ON public.chores(frequency);
CREATE INDEX IF NOT EXISTS idx_chores_difficulty ON public.chores(difficulty);
CREATE INDEX IF NOT EXISTS idx_chores_is_paused ON public.chores(is_paused);
CREATE INDEX IF NOT EXISTS idx_chores_created_by ON public.chores(created_by);

-- chore_logs indexes
CREATE INDEX IF NOT EXISTS idx_chore_logs_chore_id ON public.chore_logs(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_logs_completed_by ON public.chore_logs(completed_by);
CREATE INDEX IF NOT EXISTS idx_chore_logs_completed_at ON public.chore_logs(completed_at);

-- milestones indexes
CREATE INDEX IF NOT EXISTS idx_milestones_family_id ON public.milestones(family_id);
CREATE INDEX IF NOT EXISTS idx_milestones_milestone_date ON public.milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON public.milestones(type);
CREATE INDEX IF NOT EXISTS idx_milestones_person_id ON public.milestones(person_id);
CREATE INDEX IF NOT EXISTS idx_milestones_is_recurring ON public.milestones(is_recurring);
CREATE INDEX IF NOT EXISTS idx_milestones_family_date ON public.milestones(family_id, milestone_date);
CREATE INDEX IF NOT EXISTS idx_milestones_created_by ON public.milestones(created_by);


-- ============================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================
-- The update_updated_at() function already exists from the base migration.

DROP TRIGGER IF EXISTS update_budget_months_updated_at ON public.budget_months;
CREATE TRIGGER update_budget_months_updated_at BEFORE UPDATE ON public.budget_months FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_chores_updated_at ON public.chores;
CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON public.chores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 9. REALTIME PUBLICATIONS
-- ============================================================
-- Add new tables to the supabase_realtime publication for
-- real-time change notifications (same pattern as existing
-- chat_messages, tasks, grocery_items, etc.)

ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_months;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chore_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- New tables added:
--   budget_months  — Monthly budget categories per family
--   expenses       — Individual expense tracking per family
--   meal_plans     — Daily meal planning with recipes
--   chores         — Chore definitions with rotation support
--   chore_logs     — Completion logs for chores
--   milestones     — Family milestone tracking (birthdays, etc.)
--
-- Total new tables: 6
-- Total new indexes: 24
-- Total new triggers: 5
-- Total new RLS policies: 23
-- Realtime publications updated: 6 tables added
-- ============================================================
