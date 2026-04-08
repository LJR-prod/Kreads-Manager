-- ============================================
-- KREADS MANAGER — SUPABASE SCHEMA
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. TABLE PROFILES (extension de auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE AVAILABILITIES (calendrier des disponibilités)
CREATE TABLE public.availabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  editor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cours', 'tournage', 'conge')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(editor_id, date)
);

-- 3. TABLE MONTHLY_OBJECTIVES (objectifs mensuels)
CREATE TABLE public.monthly_objectives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  editor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_concepts INTEGER NOT NULL DEFAULT 0,
  actual_concepts INTEGER NOT NULL DEFAULT 0,
  working_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(editor_id, year, month)
);

-- 4. TABLE QUARTERLY_VARIABLES (variable trimestrielle)
CREATE TABLE public.quarterly_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  editor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  objective_rate DECIMAL(5,2) DEFAULT 0, -- % d'objectif atteint (calculé)
  bonus_amount DECIMAL(10,2) DEFAULT 0,   -- montant bonus calculé
  base_bonus DECIMAL(10,2) DEFAULT 0,     -- bonus de base défini par admin
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(editor_id, year, quarter)
);

-- 5. TABLE EVALUATION_LINKS (liens d'évaluation par quarter)
CREATE TABLE public.evaluation_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, quarter)
);

-- 6. TABLE EVALUATIONS (évaluations par les CS)
CREATE TABLE public.evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.evaluation_links(id) ON DELETE CASCADE NOT NULL,
  editor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cs_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  -- Notes sur 5
  quality_score DECIMAL(2,1) NOT NULL CHECK (quality_score BETWEEN 0 AND 5),
  avoidable_returns_score DECIMAL(2,1) NOT NULL CHECK (avoidable_returns_score BETWEEN 0 AND 5),
  communication_score DECIMAL(2,1) NOT NULL CHECK (communication_score BETWEEN 0 AND 5),
  deadline_score DECIMAL(2,1) NOT NULL CHECK (deadline_score BETWEEN 0 AND 5),
  -- Commentaire libre
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Profiles visibles par tous les connectés" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Chaque user peut modifier son profil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin peut tout modifier" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AVAILABILITIES policies
CREATE POLICY "Monteur voit ses propres dispos" ON public.availabilities
  FOR SELECT USING (
    editor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Monteur gère ses dispos" ON public.availabilities
  FOR ALL USING (editor_id = auth.uid());

CREATE POLICY "Admin gère toutes les dispos" ON public.availabilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- MONTHLY_OBJECTIVES policies
CREATE POLICY "Monteur voit ses objectifs" ON public.monthly_objectives
  FOR SELECT USING (
    editor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Monteur met à jour son réel" ON public.monthly_objectives
  FOR UPDATE USING (editor_id = auth.uid());

CREATE POLICY "Admin gère tous les objectifs" ON public.monthly_objectives
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- QUARTERLY_VARIABLES policies
CREATE POLICY "Monteur voit sa variable" ON public.quarterly_variables
  FOR SELECT USING (
    editor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin gère les variables" ON public.quarterly_variables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- EVALUATION_LINKS policies
CREATE POLICY "Liens visibles par admin" ON public.evaluation_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin gère les liens" ON public.evaluation_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Liens accessibles publiquement pour validation (via token)
CREATE POLICY "Lien accessible publiquement par token" ON public.evaluation_links
  FOR SELECT USING (is_active = TRUE);

-- EVALUATIONS policies
CREATE POLICY "Evaluations visibles par admin" ON public.evaluations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Insertion publique via lien valide" ON public.evaluations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.evaluation_links WHERE id = link_id AND is_active = TRUE)
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: créer un profil automatiquement après inscription Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'lois@kreads.social' THEN 'admin' ELSE 'editor' END,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automatique
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_monthly_objectives
  BEFORE UPDATE ON public.monthly_objectives
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_quarterly_variables
  BEFORE UPDATE ON public.quarterly_variables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- JOURS FERIES FRANCE 2024-2026
-- ============================================

CREATE TABLE public.french_holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.french_holidays (date, name) VALUES
  ('2024-01-01', 'Jour de l''An'),
  ('2024-04-01', 'Lundi de Pâques'),
  ('2024-05-01', 'Fête du Travail'),
  ('2024-05-08', 'Victoire 1945'),
  ('2024-05-09', 'Ascension'),
  ('2024-05-20', 'Lundi de Pentecôte'),
  ('2024-07-14', 'Fête Nationale'),
  ('2024-08-15', 'Assomption'),
  ('2024-11-01', 'Toussaint'),
  ('2024-11-11', 'Armistice'),
  ('2024-12-25', 'Noël'),
  ('2025-01-01', 'Jour de l''An'),
  ('2025-04-21', 'Lundi de Pâques'),
  ('2025-05-01', 'Fête du Travail'),
  ('2025-05-08', 'Victoire 1945'),
  ('2025-05-29', 'Ascension'),
  ('2025-06-09', 'Lundi de Pentecôte'),
  ('2025-07-14', 'Fête Nationale'),
  ('2025-08-15', 'Assomption'),
  ('2025-11-01', 'Toussaint'),
  ('2025-11-11', 'Armistice'),
  ('2025-12-25', 'Noël'),
  ('2026-01-01', 'Jour de l''An'),
  ('2026-04-06', 'Lundi de Pâques'),
  ('2026-05-01', 'Fête du Travail'),
  ('2026-05-08', 'Victoire 1945'),
  ('2026-05-14', 'Ascension'),
  ('2026-05-25', 'Lundi de Pentecôte'),
  ('2026-07-14', 'Fête Nationale'),
  ('2026-08-15', 'Assomption'),
  ('2026-11-01', 'Toussaint'),
  ('2026-11-11', 'Armistice'),
  ('2026-12-25', 'Noël');

ALTER TABLE public.french_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jours fériés visibles par tous" ON public.french_holidays
  FOR SELECT USING (true);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Note: Les profils seront créés automatiquement lors de la première connexion Google.
-- Assurez-vous que l'email admin correspond à NEXT_PUBLIC_ADMIN_EMAIL

-- Vue agrégée utile pour l'admin
CREATE OR REPLACE VIEW public.editor_quarterly_summary AS
SELECT
  p.id as editor_id,
  p.name as editor_name,
  p.email,
  mo.year,
  CEIL(mo.month / 3.0)::INT as quarter,
  SUM(mo.target_concepts) as total_target,
  SUM(mo.actual_concepts) as total_actual,
  CASE
    WHEN SUM(mo.target_concepts) > 0
    THEN ROUND((SUM(mo.actual_concepts)::DECIMAL / SUM(mo.target_concepts)) * 100, 1)
    ELSE 0
  END as completion_rate
FROM public.profiles p
LEFT JOIN public.monthly_objectives mo ON p.id = mo.editor_id
WHERE p.role = 'editor'
GROUP BY p.id, p.name, p.email, mo.year, CEIL(mo.month / 3.0)::INT;
