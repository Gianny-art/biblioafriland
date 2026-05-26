
-- 1. image_url columns
ALTER TABLE public.regulations ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- 2. News feed cache (populated by scraping/cron, read by all authenticated)
CREATE TABLE IF NOT EXISTS public.news_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL,
  url text NOT NULL UNIQUE,
  image_url text,
  summary text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_feed TO authenticated, anon;
GRANT ALL ON public.news_feed TO service_role;
ALTER TABLE public.news_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read news" ON public.news_feed;
CREATE POLICY "read news" ON public.news_feed FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manage news" ON public.news_feed;
CREATE POLICY "admin manage news" ON public.news_feed FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Regulation official sources (admin reference)
CREATE TABLE IF NOT EXISTS public.regulation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  description text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regulation_sources TO authenticated;
GRANT ALL ON public.regulation_sources TO service_role;
ALTER TABLE public.regulation_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read sources" ON public.regulation_sources;
CREATE POLICY "read sources" ON public.regulation_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage sources" ON public.regulation_sources;
CREATE POLICY "admin manage sources" ON public.regulation_sources FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.regulation_sources (name, url, description) VALUES
 ('COBAC - Commission Bancaire de l''Afrique Centrale', 'https://www.beac.int/cobac/', 'Régulateur bancaire CEMAC'),
 ('BEAC - Banque des États de l''Afrique Centrale', 'https://www.beac.int/', 'Banque centrale CEMAC, politique monétaire et taux directeurs'),
 ('CEMAC - Communauté Économique et Monétaire', 'https://www.cemac.int/', 'Règlements et directives communautaires'),
 ('Ministère des Finances Cameroun', 'https://www.minfi.gov.cm/', 'Réformes fiscales et financières nationales')
ON CONFLICT DO NOTHING;

-- 4. Categories default images
UPDATE public.categories SET image_url = CASE slug
  WHEN 'economie' THEN 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80'
  WHEN 'finance' THEN 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80'
  WHEN 'politique' THEN 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80'
  WHEN 'societe' THEN 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1200&q=80'
  WHEN 'sport' THEN 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80'
  WHEN 'culture' THEN 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200&q=80'
  WHEN 'international' THEN 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&q=80'
  WHEN 'agriculture' THEN 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'
  WHEN 'tech' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80'
  ELSE 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80'
END WHERE image_url IS NULL;

-- 5. Regulation default images (by source)
UPDATE public.regulations SET image_url = CASE source
  WHEN 'COBAC' THEN 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80'
  WHEN 'BEAC' THEN 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200&q=80'
  WHEN 'CEMAC' THEN 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80'
  ELSE 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&q=80'
END WHERE image_url IS NULL;
