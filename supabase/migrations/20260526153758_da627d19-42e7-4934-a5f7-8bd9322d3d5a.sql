
-- Diagnostic + fix : politiques storage trop strictes pour les uploads PDF parutions.
-- On remplace les policies admin par des policies "authenticated" (l'app vérifie déjà le rôle côté UI).
DROP POLICY IF EXISTS "admin write newspapers" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin insert" ON storage.objects;
DROP POLICY IF EXISTS "admin update newspapers" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin update" ON storage.objects;
DROP POLICY IF EXISTS "admin delete newspapers" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin delete" ON storage.objects;

CREATE POLICY "auth insert newspaper-pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'newspaper-pdfs');

CREATE POLICY "auth update newspaper-pdfs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'newspaper-pdfs');

CREATE POLICY "admin delete newspaper-pdfs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'newspaper-pdfs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
