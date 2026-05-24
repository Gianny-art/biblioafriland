
-- regulations
CREATE TABLE IF NOT EXISTS public.regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL DEFAULT 'COBAC',
  summary text,
  content text,
  external_url text,
  pdf_url text,
  published_at date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read regulations" ON public.regulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage regulations" ON public.regulations FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.regulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- edition_pages
CREATE TABLE IF NOT EXISTS public.edition_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL,
  page_number int NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.edition_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read pages" ON public.edition_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage pages" ON public.edition_pages FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_edition_pages_edition ON public.edition_pages(edition_id, page_number);

-- profile theme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('newspaper-pdfs','newspaper-pdfs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read newspapers" ON storage.objects FOR SELECT USING (bucket_id = 'newspaper-pdfs');
CREATE POLICY "admin write newspapers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'newspaper-pdfs' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admin update newspapers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'newspaper-pdfs' AND has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete newspapers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'newspaper-pdfs' AND has_role(auth.uid(),'admin'));

CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "user write own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- notify all users helper
CREATE OR REPLACE FUNCTION public.notify_all_users(_title text, _body text, _link text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT user_id, _type, _title, _body, _link FROM public.profiles;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_all_users(text,text,text,text) FROM PUBLIC, anon, authenticated;

-- trigger on regulations
CREATE OR REPLACE FUNCTION public.on_new_regulation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_all_users(
    'Nouvelle règlementation : ' || NEW.title,
    COALESCE(NEW.summary, NEW.source || ' — publiée le ' || NEW.published_at::text),
    '/reglementations',
    'regulation'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_regulation ON public.regulations;
CREATE TRIGGER trg_notify_regulation AFTER INSERT ON public.regulations FOR EACH ROW EXECUTE FUNCTION public.on_new_regulation();

-- trigger on editions
CREATE OR REPLACE FUNCTION public.on_new_edition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _np text;
BEGIN
  SELECT name INTO _np FROM public.newspapers WHERE id = NEW.newspaper_id;
  PERFORM public.notify_all_users(
    'Nouvelle parution : ' || COALESCE(_np,'Journal'),
    COALESCE(NEW.title, 'Édition du ' || NEW.edition_date::text),
    '/lecteur/' || NEW.id::text,
    'edition'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_edition ON public.editions;
CREATE TRIGGER trg_notify_edition AFTER INSERT ON public.editions FOR EACH ROW EXECUTE FUNCTION public.on_new_edition();

-- auto-promote giannyfoapa@gmail.com to admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  IF NEW.email = 'giannyfoapa@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ensure existing giannyfoapa is admin
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'giannyfoapa@gmail.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid,'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- seed regulations
INSERT INTO public.regulations (title, source, summary, content, published_at) VALUES
('Règlement COBAC R-2020/01 sur les fonds propres', 'COBAC', 'Renforcement des exigences de fonds propres pour les établissements de crédit de la CEMAC.', 'Le présent règlement définit les nouvelles exigences minimales de fonds propres applicables aux établissements de crédit...', '2024-11-12'),
('Règlement CEMAC sur la lutte contre le blanchiment', 'CEMAC', 'Nouvelles obligations de vigilance KYC/AML pour les banques de la zone.', 'Les banques sont tenues d''appliquer les diligences renforcées...', '2025-02-03'),
('Décision BEAC sur le taux directeur', 'BEAC', 'Maintien du taux d''intérêt des appels d''offres à 5,00 %.', 'Le Comité de Politique Monétaire de la BEAC a décidé...', '2025-09-22'),
('COBAC R-2024/04 — Reporting prudentiel', 'COBAC', 'Calendrier et format du nouveau reporting prudentiel trimestriel.', 'A compter du 1er janvier 2025, les établissements assujettis transmettent...', '2024-12-20'),
('Réforme CEMAC sur la digitalisation des paiements', 'CEMAC', 'Cadre harmonisé pour la monnaie électronique et les paiements instantanés.', 'Le règlement institue un cadre unique pour les services de paiement...', '2025-06-15')
ON CONFLICT DO NOTHING;
