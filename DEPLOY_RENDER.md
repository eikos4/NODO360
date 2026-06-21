# Desplegar NODO360 en Render

Repositorio: [github.com/eikos4/NODO360](https://github.com/eikos4/NODO360)

Necesitas **3 recursos** en Render:

1. **PostgreSQL** (base de datos)
2. **Web Service** (API NestJS)
3. **Static Site** (frontend Vite/React)

---

## Opción A — Blueprint (recomendada)

1. Entra a [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint**
3. Conecta el repo `eikos4/NODO360`
4. Render lee `render.yaml` y crea DB + API + Web
5. Tras el primer deploy, revisa las URLs reales y actualiza:
   - En **nodo360-api** → `FRONTEND_URL` = URL del static site (ej. `https://nodo360-web.onrender.com`)
   - En **nodo360-web** → `VITE_API_URL` = URL API + `/api` (ej. `https://nodo360-api.onrender.com/api`)
6. Redeploy ambos servicios

### Poblar datos demo (una vez)

En **nodo360-api** → **Shell**:

```bash
cd apps/api && npx prisma db seed
```

---

## Opción B — Manual (panel)

### 1. PostgreSQL

| Campo | Valor |
|--------|--------|
| Name | `nodo360-db` |
| Database | `nodo360` |
| User | `nodo360` |
| Plan | Free |

Copia la **Internal Database URL** (la usa la API en la misma región).

---

### 2. Web Service — API

| Campo | Valor |
|--------|--------|
| Name | `nodo360-api` |
| Root Directory | *(vacío = raíz del repo)* |
| Runtime | Node |
| Build Command | ver abajo |
| Start Command | `npm run start --workspace=apps/api` |
| Instance type | Free |

**Build Command:**

```bash
npm install && npx prisma generate --schema=apps/api/prisma/schema.prisma && npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && npm run build:api
```

**Environment variables:**

| Key | Valor |
|-----|--------|
| `NODE_VERSION` | `20` |
| `DATABASE_URL` | *(Internal URL de Postgres)* |
| `JWT_SECRET` | *(string largo aleatorio, 32+ chars)* |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://TU-WEB.onrender.com` |
| `PORT` | *(Render lo inyecta solo)* |

URL final API: `https://nodo360-api.onrender.com`  
Endpoints: `https://nodo360-api.onrender.com/api/...`

---

### 3. Static Site — Web

| Campo | Valor |
|--------|--------|
| Name | `nodo360-web` |
| Root Directory | *(vacío)* |
| Build Command | `npm install && npm run build:render --workspace=apps/web` |
| Publish Directory | `apps/web/dist` |

**Environment variables:**

| Key | Valor |
|-----|--------|
| `VITE_API_URL` | `https://nodo360-api.onrender.com/api` |

**Redirects (SPA — React Router):**

| Source | Destination |
|--------|-------------|
| `/*` | `/index.html` |

---

## Credenciales demo (tras seed)

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | `admin@nodo360.cl` | `Admin1234!` |
| Capitán | `martinez@bomberosparral.cl` | `Demo1234!` |
| Operador Central | `central@bomberosparral.cl` | `Demo1234!` |

Vista pública demo: `/central/bomberos-parral`  
Perfil operador central: `/central-operativa`

---

## Notas importantes

- **CORS:** la API usa `FRONTEND_URL`; debe coincidir exactamente con la URL del static site (sin barra final).
- **Uploads:** en plan free el disco es efímero; imágenes subidas pueden perderse al reiniciar.
- **Cold start:** el plan free “duerme” la API; el primer login puede tardar ~30 s.
- **Build web:** localmente usamos `tsc && vite build`; en Render usamos `build:render` (solo Vite) para evitar errores de tipos de Leaflet.

---

## Checklist post-deploy

- [ ] Login en la URL del frontend
- [ ] Dashboard carga datos
- [ ] Módulo Salud y mapa funcionan
- [ ] `FRONTEND_URL` y `VITE_API_URL` actualizados si cambiaste nombres de servicios
