
-- Storage policies: avatars
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars user insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars user update" ON storage.objects;
DROP POLICY IF EXISTS "avatars user delete" ON storage.objects;

CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars user insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies: newspaper-pdfs
DROP POLICY IF EXISTS "pdfs public read" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin insert" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin update" ON storage.objects;
DROP POLICY IF EXISTS "pdfs admin delete" ON storage.objects;

CREATE POLICY "pdfs public read" ON storage.objects FOR SELECT USING (bucket_id = 'newspaper-pdfs');
CREATE POLICY "pdfs admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'newspaper-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pdfs admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'newspaper-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pdfs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'newspaper-pdfs' AND public.has_role(auth.uid(), 'admin'));

-- Seed regulations (full content)
DELETE FROM public.regulations WHERE source IN ('COBAC','CEMAC','BEAC');

INSERT INTO public.regulations (title, source, summary, content, external_url, published_at) VALUES
('Règlement COBAC R-2016/04 relatif au capital social minimum des établissements de crédit',
 'COBAC',
 'Fixe à 10 milliards FCFA le capital social minimum des banques opérant en zone CEMAC.',
 E'Article 1 — Le capital social minimum applicable aux banques universelles agréées par la COBAC est fixé à dix milliards (10 000 000 000) de francs CFA, intégralement libéré à la constitution.\n\nArticle 2 — Les établissements de microfinance de 2ᵉ catégorie doivent disposer d''un capital minimum de 300 millions FCFA, ceux de 3ᵉ catégorie de 50 millions FCFA.\n\nArticle 3 — Les banques existantes disposent d''un délai de cinq (05) ans à compter de la publication du présent règlement pour se conformer aux nouvelles exigences.\n\nArticle 4 — Tout établissement n''ayant pas atteint le seuil requis à l''échéance verra son agrément retiré conformément à l''article 18 de l''annexe à la Convention du 17 janvier 1992.\n\nArticle 5 — Le Secrétariat Général de la COBAC est chargé de la mise en œuvre du présent règlement.',
 'https://www.beac.int/cobac/textes-reglementaires/',
 '2016-06-15'),

('Règlement COBAC R-2010/01 sur la solvabilité — Ratio de Bâle',
 'COBAC',
 'Établit le ratio de solvabilité minimum de 9,5% (CET1 + Tier 2) pour les établissements de crédit de la CEMAC.',
 E'Article 1 — Le ratio de couverture des risques (ratio de solvabilité) est fixé à un minimum de 9,5%, dont :\n  • 7% au titre des fonds propres de base (CET1)\n  • 2,5% au titre du coussin de conservation\n\nArticle 2 — Sont assujettis l''ensemble des risques pondérés : risque de crédit, risque de marché et risque opérationnel.\n\nArticle 3 — Les pondérations applicables aux contreparties suivent la grille standard :\n  • Souverains CEMAC : 0%\n  • Banques notées AA : 20%\n  • Entreprises non notées : 100%\n  • Crédits à la consommation non garantis : 150%\n\nArticle 4 — Les fonds propres complémentaires (Tier 2) ne peuvent excéder le montant des fonds propres de base.\n\nArticle 5 — Toute insuffisance de fonds propres déclenche un plan de redressement notifié à la COBAC sous 30 jours.',
 'https://www.beac.int/cobac/textes-reglementaires/',
 '2010-12-20'),

('Règlement COBAC R-2017/01 sur la classification et le provisionnement des créances',
 'COBAC',
 'Définit les 4 classes de créances (saines, sensibles, douteuses, contentieuses) et leurs taux de provisionnement obligatoires.',
 E'Article 1 — Les créances sont classées en quatre catégories selon leur niveau de risque :\n  1. Créances saines (impayés < 30 jours) — provision : 1%\n  2. Créances sensibles (30-90 jours) — provision : 5%\n  3. Créances douteuses (90-180 jours) — provision : 50%\n  4. Créances contentieuses (>180 jours) — provision : 100%\n\nArticle 2 — Les garanties éligibles (espèces, garanties de l''État, hypothèques) peuvent réduire l''assiette de provisionnement dans la limite prévue à l''annexe.\n\nArticle 3 — Le passage en perte d''une créance contentieuse doit intervenir dans un délai maximum de cinq ans après son déclassement.\n\nArticle 4 — Les établissements transmettent trimestriellement à la COBAC un état détaillé des créances par catégorie.',
 'https://www.beac.int/cobac/textes-reglementaires/',
 '2017-09-05'),

('Règlement COBAC R-2016/03 sur la lutte contre le blanchiment de capitaux et le financement du terrorisme (LBC/FT)',
 'COBAC',
 'Cadre LBC/FT pour les établissements assujettis CEMAC : KYC, déclarations de soupçon, gel des avoirs.',
 E'Chapitre I — Obligations de vigilance\nArticle 1 — Les établissements identifient et vérifient l''identité de leurs clients (KYC) avant toute entrée en relation d''affaires.\nArticle 2 — Une vigilance renforcée est appliquée aux Personnes Politiquement Exposées (PPE), aux relations de correspondance bancaire transfrontalières et aux opérations atypiques.\n\nChapitre II — Déclaration de soupçon\nArticle 3 — Toute opération suspecte fait l''objet d''une Déclaration de Soupçon (DS) auprès de l''ANIF dans un délai maximum de 48 heures.\nArticle 4 — L''interdiction de divulgation (tipping-off) s''applique à toute information liée à une DS.\n\nChapitre III — Gel des avoirs\nArticle 5 — Les fonds appartenant à des personnes inscrites sur les listes ONU/Union Africaine sont gelés sans délai.\n\nChapitre IV — Sanctions\nArticle 6 — Les manquements sont sanctionnés conformément au règlement n°01/CEMAC/UMAC/CM du 11 avril 2016.',
 'https://www.anif-cameroun.org',
 '2016-04-11'),

('Règlement COBAC R-2024/04 — Cybersécurité et résilience opérationnelle des établissements de crédit',
 'COBAC',
 'Nouveau cadre 2024 : RTO/RPO, tests d''intrusion annuels, gouvernance des incidents cyber, notification 24h à la COBAC.',
 E'Article 1 — Tout établissement met en place une politique de sécurité du SI approuvée par le conseil d''administration et revue annuellement.\n\nArticle 2 — Objectifs minimaux de continuité d''activité :\n  • RTO (Recovery Time Objective) ≤ 4 heures pour les services critiques\n  • RPO (Recovery Point Objective) ≤ 15 minutes\n  • Site de repli activable sous 2 heures\n\nArticle 3 — Tests obligatoires annuels :\n  • Test d''intrusion (pentest) par un tiers indépendant\n  • Exercice de PCA/PRA grandeur nature\n  • Audit de conformité PCI-DSS pour les acteurs monétiques\n\nArticle 4 — Tout incident cyber majeur est notifié à la COBAC dans un délai maximum de 24 heures via le portail SUCRE.\n\nArticle 5 — Un RSSI (Responsable Sécurité SI) est désigné, rattaché directement à la Direction Générale, indépendant de la DSI.\n\nArticle 6 — Les prestataires cloud doivent figurer sur la liste blanche COBAC et héberger les données primaires sur le territoire de la CEMAC.',
 'https://www.beac.int/cobac/textes-reglementaires/',
 '2024-04-18'),

('Règlement CEMAC n°02/18/CEMAC/UMAC/CM relatif au change',
 'CEMAC',
 'Nouvelle réglementation des changes 2018 : rapatriement des recettes d''exportation, plafonds de transferts, déclarations BEAC.',
 E'Article 1 — Les recettes d''exportation de biens et services réalisées par les résidents de la CEMAC doivent être rapatriées et cédées à la BEAC dans un délai maximum de 150 jours suivant l''expédition.\n\nArticle 2 — Tout transfert vers l''étranger > 1 000 000 FCFA est soumis à déclaration à la BEAC accompagnée des pièces justificatives (facture, contrat, etc.).\n\nArticle 3 — La détention de devises par les résidents est limitée à 5 000 000 FCFA équivalent. Au-delà, les devises sont cédées à un intermédiaire agréé sous 30 jours.\n\nArticle 4 — Les opérations de capital (investissements directs étrangers, emprunts extérieurs) font l''objet d''une autorisation préalable du Ministre des Finances avec avis conforme de la BEAC.\n\nArticle 5 — Les sanctions vont de l''amende administrative (jusqu''à 100% du montant en infraction) au retrait de l''agrément d''intermédiaire agréé.',
 'https://www.beac.int/wp-content/uploads/2019/01/Reglement-N02-18-CEMAC-UMAC-CM.pdf',
 '2018-12-21'),

('Règlement CEMAC n°04/CEMAC/UMAC/COBAC sur les Systèmes de Paiement',
 'CEMAC',
 'Régule la monnaie électronique, les systèmes de paiement de masse (RSP) et les paiements transfrontaliers en zone CEMAC.',
 E'Article 1 — Sont agréés en qualité d''Établissements de Monnaie Électronique (EME) les opérateurs autorisés par la COBAC à émettre et gérer de la monnaie électronique.\n\nArticle 2 — Le capital social minimum d''un EME est fixé à 500 millions FCFA. Les fonds collectés sont cantonnés en comptes de cantonnement auprès d''une banque agréée.\n\nArticle 3 — Plafond par compte de monnaie électronique :\n  • Compte simplifié : 1 000 000 FCFA\n  • Compte étendu (KYC renforcé) : 10 000 000 FCFA\n\nArticle 4 — Le Système Net de Règlement (SYSTAC) traite les paiements de masse (virements, prélèvements, chèques) et SYGMA traite les paiements de gros montant en temps réel (RTGS).\n\nArticle 5 — L''interopérabilité entre EME et banques est obligatoire à compter du 1er janvier 2024.\n\nArticle 6 — Les frais de transfert intra-CEMAC sont plafonnés conformément à la grille publiée annuellement par la BEAC.',
 'https://www.beac.int',
 '2020-09-15'),

('Décision BEAC n°002/GR/2023 — Taux directeur et coefficient des réserves obligatoires',
 'BEAC',
 'Relèvement du TIAO à 5,00% et du taux des réserves obligatoires sur dépôts à vue à 7%.',
 E'Article 1 — Le Taux d''Intérêt des Appels d''Offres (TIAO) est porté de 4,75% à 5,00% à compter du 27 mars 2023.\n\nArticle 2 — Le Taux de la Facilité de Prêt Marginal (TFPM) est fixé à 6,75%.\n\nArticle 3 — Le Taux de la Facilité de Dépôt (TFD) reste à 0,00%.\n\nArticle 4 — Les coefficients des réserves obligatoires applicables aux établissements de crédit sont fixés à :\n  • 7% sur les dépôts à vue\n  • 4,5% sur les dépôts à terme\n\nArticle 5 — Cette décision vise à contenir les pressions inflationnistes et soutenir la stabilité monétaire de la zone CEMAC.\n\nArticle 6 — La présente décision entre en vigueur immédiatement et sera révisée trimestriellement par le Comité de Politique Monétaire.',
 'https://www.beac.int/category/communiques-de-presse/',
 '2023-03-27');
