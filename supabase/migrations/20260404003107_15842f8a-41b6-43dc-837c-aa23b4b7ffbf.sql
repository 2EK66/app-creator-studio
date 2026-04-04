
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'community',
  status TEXT NOT NULL DEFAULT 'en_cours',
  created_by UUID,
  budget_goal NUMERIC,
  budget_current NUMERIC DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (auth.uid() = created_by);

CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "pm_insert" ON public.project_members FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "pm_delete" ON public.project_members FOR DELETE USING (auth.uid() = profile_id);
