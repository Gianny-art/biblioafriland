
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  phone text,
  department text,
  language text DEFAULT 'fr',
  timezone text DEFAULT 'UTC+1 Yaoundé',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#dc2626',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Newspapers
CREATE TABLE public.newspapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  publisher text,
  frequency text DEFAULT 'Quotidien',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newspapers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read newspapers" ON public.newspapers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage newspapers" ON public.newspapers FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Editions
CREATE TABLE public.editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id uuid NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  edition_date date NOT NULL,
  title text,
  summary text,
  pdf_url text,
  cover_url text,
  page_count int DEFAULT 1,
  size_bytes bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_editions_date ON public.editions(edition_date DESC);
CREATE INDEX idx_editions_newspaper ON public.editions(newspaper_id);
CREATE POLICY "read editions" ON public.editions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage editions" ON public.editions FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Articles
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  page_number int DEFAULT 1,
  author text,
  keywords text[] DEFAULT '{}',
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_articles_edition ON public.articles(edition_id);
CREATE INDEX idx_articles_keywords ON public.articles USING GIN(keywords);
CREATE INDEX idx_articles_search ON public.articles USING GIN(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(content,'')));
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage articles" ON public.articles FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Favorites
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_id uuid REFERENCES public.editions(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((edition_id IS NOT NULL) OR (article_id IS NOT NULL))
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Downloads
CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own downloads" ON public.downloads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Search history
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own searches" ON public.search_history FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  newspaper_id uuid REFERENCES public.newspapers(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id uuid NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Quotidien - PDF',
  status text NOT NULL DEFAULT 'Actif',
  next_renewal date,
  storage_used_bytes bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read subs auth" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage subs" ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Annotations
CREATE TABLE public.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  page_number int DEFAULT 1,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own annotations" ON public.annotations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_display text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read activity" ON public.activity_log FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert activity" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Seed categories & newspapers
INSERT INTO public.categories (name, slug, color) VALUES
  ('Économie', 'economie', '#dc2626'),
  ('Finance', 'finance', '#0ea5e9'),
  ('Politique', 'politique', '#7c3aed'),
  ('Société', 'societe', '#16a34a'),
  ('Général', 'general', '#64748b'),
  ('Autres', 'autres', '#737373');

INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Cameroon Tribune', 'cameroon-tribune', 'Quotidien', 'SOPECAM', id FROM public.categories WHERE slug='general';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'L''Économiste du Cameroun', 'leconomiste-du-cameroun', 'Hebdomadaire', 'Éditions du Mfoundi', id FROM public.categories WHERE slug='economie';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Le Jour', 'le-jour', 'Quotidien', 'Le Jour SA', id FROM public.categories WHERE slug='general';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Mutations', 'mutations', 'Quotidien', 'SAPRESS', id FROM public.categories WHERE slug='societe';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Financial Afrik', 'financial-afrik', 'Hebdomadaire', 'Financial Afrik SA', id FROM public.categories WHERE slug='finance';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Investir au Cameroun', 'investir-au-cameroun', 'Mensuel', 'Mediamania Sarl', id FROM public.categories WHERE slug='economie';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Jeune Afrique', 'jeune-afrique', 'Hebdomadaire', 'Jeune Afrique Media Group', id FROM public.categories WHERE slug='general';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'The Guardian', 'the-guardian', 'Quotidien', 'Guardian Media Group', id FROM public.categories WHERE slug='general';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Forbes Afrique', 'forbes-afrique', 'Mensuel', 'Forbes Africa', id FROM public.categories WHERE slug='finance';
INSERT INTO public.newspapers (name, slug, frequency, publisher, category_id)
SELECT 'Le Monde', 'le-monde', 'Quotidien', 'Groupe Le Monde', id FROM public.categories WHERE slug='general';

-- Seed editions for today
INSERT INTO public.editions (newspaper_id, edition_date, title, summary, page_count, size_bytes)
SELECT id, CURRENT_DATE, name || ' - Édition du ' || to_char(CURRENT_DATE,'DD/MM/YYYY'),
  'Édition complète avec les dernières actualités économiques et financières.',
  24, 5242880
FROM public.newspapers;

-- Seed a few articles
INSERT INTO public.articles (edition_id, title, content, page_number, author, keywords)
SELECT e.id, 'Réforme bancaire dans la CEMAC : cap sur Bâle III',
  'Les pays de la zone CEMAC poursuivent la mise en œuvre des accords de Bâle III pour renforcer la résilience du secteur bancaire...',
  3, 'Rédaction', ARRAY['réforme bancaire','CEMAC','Bâle III']
FROM public.editions e JOIN public.newspapers n ON e.newspaper_id=n.id WHERE n.slug='leconomiste-du-cameroun';

INSERT INTO public.articles (edition_id, title, content, page_number, author, keywords)
SELECT e.id, 'La BEAC renforce le dispositif prudentiel',
  'La Banque des États de l''Afrique Centrale a annoncé un nouveau dispositif prudentiel...',
  8, 'B. Mvogo', ARRAY['BEAC','prudentiel','banque']
FROM public.editions e JOIN public.newspapers n ON e.newspaper_id=n.id WHERE n.slug='cameroon-tribune';

INSERT INTO public.articles (edition_id, title, content, page_number, author, keywords)
SELECT e.id, 'Investir au Cameroun : les secteurs porteurs en 2026',
  'Analyse complète des opportunités d''investissement dans les secteurs clés de l''économie camerounaise en 2026.',
  1, 'Rédaction', ARRAY['investissement','Cameroun','2026']
FROM public.editions e JOIN public.newspapers n ON e.newspaper_id=n.id WHERE n.slug='investir-au-cameroun';

INSERT INTO public.articles (edition_id, title, content, page_number, author, keywords)
SELECT e.id, 'La digitalisation bancaire : un levier de croissance',
  'La transformation digitale des banques africaines accélère, avec des investissements record dans les fintech.',
  6, 'Rédaction', ARRAY['digitalisation','banque','fintech']
FROM public.editions e JOIN public.newspapers n ON e.newspaper_id=n.id WHERE n.slug='financial-afrik';

-- Seed subscriptions
INSERT INTO public.subscriptions (newspaper_id, plan, status, next_renewal, storage_used_bytes)
SELECT id, frequency || ' - PDF', 'Actif', (CURRENT_DATE + interval '60 days')::date, 104857600
FROM public.newspapers;
