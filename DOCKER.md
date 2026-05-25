# 🐳 Architecture Docker — Bibliothèque numérique Afriland First Bank

Guide complet de déploiement Docker (développement, production, CI/CD, VPS/Cloud).

---

## 📁 Structure des dossiers

```
.
├── Dockerfile              # Build production multi-stage (Bun → Nginx)
├── Dockerfile.dev          # Image dev avec hot reload Vite
├── .dockerignore           # Fichiers exclus du contexte
├── docker-compose.yml      # Stack prod (app + reverse proxy)
├── docker-compose.dev.yml  # Stack dev (hot reload + volumes)
├── .env.example            # Modèle des variables d'environnement
├── nginx/
│   ├── nginx.conf          # Config Nginx globale (gzip, perfs)
│   ├── default.conf        # Vhost SPA (cache assets + fallback /index.html)
│   └── reverse-proxy.conf  # Reverse proxy public (TLS-ready)
└── DOCKER.md               # Ce guide
```

---

## 🚀 Démarrage rapide

### 1. Configuration

```bash
cp .env.example .env
# Édite .env avec tes vraies clés Supabase
```

### 2. Développement (hot reload)

```bash
docker compose -f docker-compose.dev.yml up --build
# Accès : http://localhost:8080
```

### 3. Production locale

```bash
docker compose up -d --build
# Accès : http://localhost (proxy → app:8080)
docker compose logs -f
```

### 4. Arrêt

```bash
docker compose down               # arrêt
docker compose down -v            # arrêt + suppression des volumes
```

---

## ⚙️ Gestion des variables d'environnement

| Variable | Type | Visibilité | Usage |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Build arg | Client | Injectée au build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build arg | Client | Clé anon publique |
| `VITE_SUPABASE_PROJECT_ID` | Build arg | Client | Référence projet |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | **Serveur uniquement** | Ne jamais bundler |

**Règle d'or :** seules les variables préfixées `VITE_` peuvent finir dans le bundle JavaScript. Les secrets serveur doivent passer par les secrets du runtime (Lovable Cloud, GitHub Actions, etc.).

---

## 🏗️ Architecture multi-stage

Le `Dockerfile` utilise 3 étapes pour une image finale **< 50 Mo** :

1. **deps** — Bun installe les dépendances (cache layer)
2. **builder** — Compile TanStack Start + Vite en assets statiques
3. **runtime** — Nginx Alpine sert les fichiers (non-root user)

Avantages : build reproductible, surface d'attaque minimale, démarrage en < 2 s.

---

## 🔒 Bonnes pratiques sécurité appliquées

- ✅ Utilisateur non-root (`app:1001`) dans le conteneur runtime
- ✅ `no-new-privileges: true` au runtime
- ✅ `tmpfs` en lecture/écriture restreinte (`/tmp`, `/var/cache/nginx`)
- ✅ Headers Nginx durcis : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS
- ✅ `server_tokens off;` (pas de fuite de version Nginx)
- ✅ Healthchecks sur `app` et `proxy`
- ✅ Limites CPU/mémoire (`deploy.resources.limits`)
- ✅ Image Alpine minimaliste, dépendances figées (`bun install --frozen-lockfile`)
- ✅ `.dockerignore` exclut `.env`, `.git`, `node_modules`

**À faire en prod :**
- Activer TLS (Let's Encrypt via Certbot ou Traefik)
- Activer `Leaked Password Protection` dans Supabase Auth
- Configurer un WAF (Cloudflare, AWS WAF)
- Rotation régulière des secrets Supabase

---

## 🩺 Healthchecks

| Service | Endpoint | Fréquence |
|---|---|---|
| `app` | `GET /healthz` (Nginx interne) | 30 s |
| `proxy` | `GET /` | 30 s |

Vérifier l'état :

```bash
docker compose ps
docker inspect --format='{{.State.Health.Status}}' afriland-app
```

---

## 💾 Volumes persistants

| Volume | Contenu | Backup ? |
|---|---|---|
| `certs` | Certificats Let's Encrypt | ✅ Quotidien |
| `nginx_logs` | Journaux d'accès | ⚠️ Rotation 30 j |

```bash
# Backup des certificats
docker run --rm -v afriland_certs:/data -v $PWD:/backup alpine \
  tar czf /backup/certs-$(date +%F).tgz /data
```

---

## 🔧 Commandes Docker utiles

```bash
# Logs en temps réel
docker compose logs -f app

# Shell dans le conteneur
docker compose exec app sh

# Reconstruire sans cache
docker compose build --no-cache

# Voir l'utilisation des ressources
docker stats

# Nettoyer images/conteneurs/volumes inutilisés
docker system prune -a --volumes

# Inspecter la taille des layers
docker history afriland-biblio:latest

# Scan de vulnérabilités (Docker Scout)
docker scout cves afriland-biblio:latest

# Export d'une image pour transfert hors ligne
docker save afriland-biblio:latest | gzip > afriland.tgz
# Import sur le serveur
gunzip -c afriland.tgz | docker load
```

---

## 🛫 Déploiement VPS (Ubuntu / Debian)

```bash
# 1. Installation Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Cloner et configurer
git clone <repo> /opt/afriland && cd /opt/afriland
cp .env.example .env && nano .env

# 3. Démarrer
docker compose up -d --build

# 4. Certificat TLS (Let's Encrypt)
docker run --rm -v $PWD/certs:/etc/letsencrypt \
  -p 80:80 certbot/certbot certonly --standalone \
  -d biblio.afrilandfirstbank.com --email admin@afrilandfirstbank.com --agree-tos

# 5. Décommenter le bloc HTTPS dans nginx/reverse-proxy.conf
docker compose restart proxy
```

### Auto-restart au reboot

Le `restart: unless-stopped` dans `docker-compose.yml` s'en charge. Vérifier que le service Docker démarre au boot :

```bash
sudo systemctl enable docker
```

---

## ☁️ Déploiement Cloud

### Cloudflare Pages / Vercel / Netlify
Pas besoin de Docker : utilise directement `bun run build` → `.output/public`.

### Google Cloud Run / AWS ECS / Fly.io / Render
```bash
# Build & push vers un registry
docker build -t europe-west1-docker.pkg.dev/PROJET/biblio/app:latest \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg VITE_SUPABASE_PROJECT_ID=... .

docker push europe-west1-docker.pkg.dev/PROJET/biblio/app:latest

# Cloud Run
gcloud run deploy biblio-afriland \
  --image europe-west1-docker.pkg.dev/PROJET/biblio/app:latest \
  --platform managed --region europe-west1 --port 8080 --allow-unauthenticated
```

### Kubernetes
Helm chart minimal : `Deployment` (image), `Service` (ClusterIP 8080), `Ingress` (TLS via cert-manager).

---

## 🤖 Préparation CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` :

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: ghcr.io/${{ github.repository }}:latest
          build-args: |
            VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}
            VITE_SUPABASE_PUBLISHABLE_KEY=${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
            VITE_SUPABASE_PROJECT_ID=${{ secrets.VITE_SUPABASE_PROJECT_ID }}

      - name: Deploy SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/afriland
            docker compose pull
            docker compose up -d
            docker image prune -f
```

---

## 🔍 Optimisations de build

- **Layer caching** : `package.json` copié avant le code → install seulement si dépendances changent
- **Frozen lockfile** : `bun install --frozen-lockfile` garantit la reproductibilité
- **BuildKit cache** : `docker buildx build --cache-to/from` en CI
- **Multi-arch** : `docker buildx build --platform linux/amd64,linux/arm64`
- **Compression gzip** Nginx activée pour JS/CSS/SVG/WASM
- **Cache assets** : `Cache-Control: public, immutable; max-age=1y` sur les hash-files Vite

---

## 📚 Documents techniques livrés

| Document | Emplacement |
|---|---|
| Cahier des charges | `public/documents/cahier-des-charges.docx` |
| Spécifications fonctionnelles | `public/documents/projet-reception-numerique.docx` |
| Architecture Docker | `DOCKER.md` (ce fichier) |
| Schéma de base de données | Migrations SQL `supabase/migrations/` |
