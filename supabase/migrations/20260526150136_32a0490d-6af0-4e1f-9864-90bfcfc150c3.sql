
UPDATE public.categories SET image_url = CASE slug
  WHEN 'economie' THEN 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800'
  WHEN 'finance' THEN 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
  WHEN 'politique' THEN 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800'
  WHEN 'societe' THEN 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800'
  WHEN 'sport' THEN 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'
  WHEN 'culture' THEN 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800'
  WHEN 'international' THEN 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800'
  WHEN 'agriculture' THEN 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'
  WHEN 'tech' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'
  ELSE 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800'
END WHERE image_url IS NULL;

UPDATE public.regulations SET image_url = CASE
  WHEN source ILIKE '%COBAC%' THEN 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800'
  WHEN source ILIKE '%BEAC%' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800'
  WHEN source ILIKE '%CEMAC%' THEN 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800'
  ELSE 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800'
END WHERE image_url IS NULL;

INSERT INTO public.regulation_sources (name, url, description)
SELECT * FROM (VALUES
  ('COBAC', 'https://www.beac.int/cobac/', 'Commission Bancaire de l''Afrique Centrale'),
  ('BEAC', 'https://www.beac.int/', 'Banque des États de l''Afrique Centrale'),
  ('CEMAC', 'https://www.cemac.int/', 'Communauté Économique et Monétaire de l''Afrique Centrale'),
  ('MINFI Cameroun', 'https://www.minfi.gov.cm/', 'Ministère des Finances du Cameroun')
) AS v(name, url, description)
WHERE NOT EXISTS (SELECT 1 FROM public.regulation_sources WHERE regulation_sources.url = v.url);
