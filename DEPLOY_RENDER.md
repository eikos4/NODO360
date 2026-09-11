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

### Poblar datos demo (automático)

El deploy carga los datos demo **automáticamente** si la base de datos está vacía (`SEED_IF_EMPTY` en build + `AUTO_SEED_DEMO` al iniciar la API). **No necesitas Shell** en el primer deploy.

Si el login falla tras un deploy, verifica en el panel de Render:

1. **nodo360-api** → *Logs* → busca `[bootstrap] Seed demo completado` o `Usuarios existentes`
2. **nodo360-web** → *Environment* → `VITE_API_URL` debe ser `https://TU-API.onrender.com/api` (sin barra final)
3. **nodo360-api** → *Environment* → `FRONTEND_URL` debe coincidir exactamente con la URL del static site
4. Redeploy manual de **nodo360-api** (botón *Manual Deploy*)

### Siempre encendida (producción)

El plan **Free** de la API se duerme a los ~15 min. Para que el login no pida esperar:

1. [dashboard.render.com](https://dashboard.render.com) → **nodo360-api** → **Settings** → **Instance Type** → **Starter** (~USD 7/mes)
2. **nodo360-db** → **Settings** → sube a **Basic-256mb** (~USD 6/mes). El Postgres Free **caduca a los 30 días**
3. Agrega tarjeta en **Billing**. El static site (`nodo360-web`) puede seguir en Free

Costo piso: ~USD 13/mes. Sin esto, Central no es 24/7.

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
npm install && npx prisma generate --schema=apps/api/prisma/schema.prisma && npx prisma migrate resolve --rolled-back 20260907213000_incident_operational_contract --schema=apps/api/prisma/schema.prisma ; npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && npm run build:api && SEED_IF_EMPTY=true npm run seed --workspace=apps/api -- --if-empty
```

> **Nota:** El `prisma migrate resolve --rolled-back ...` marca la migración fallida como "rolled back" para que Prisma la pueda re-intentar. El `;` (en lugar de `&&`) hace que continúe aunque no haya migración fallida.

**Environment variables:**

| Key | Valor |
|-----|--------|
| `NODE_VERSION` | `20` |
| `DATABASE_URL` | *(Internal URL de Postgres)* |
| `JWT_SECRET` | *(string largo aleatorio, 32+ chars)* |
| `JWT_EXPIRES_IN` | `7d` |
| `AUTO_SEED_DEMO` | `true` *(carga demo Parral si la BD está vacía)* |
| `FRONTEND_URL` | `https://TU-WEB.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | *(Dashboard Cloudinary)* |
| `CLOUDINARY_API_KEY` | *(Dashboard Cloudinary)* |
| `CLOUDINARY_API_SECRET` | *(Dashboard Cloudinary)* |
| `PORT` | *(Render lo inyecta solo)* |

URL final API: `https://nodo360-api.onrender.com`  
Endpoints: `https://nodo360-api.onrender.com/api/...`

### Cloudinary (archivos persistentes)

1. Crea cuenta en [cloudinary.com](https://cloudinary.com) (plan gratis)
2. En el dashboard copia **Cloud name**, **API Key** y **API Secret**
3. Pégalas en **nodo360-api** → Environment
4. Redeploy la API
5. En logs debe aparecer: `Storage: Cloudinary (persistente)`

### Alarmas en el teléfono (app cerrada)

Sin esto, el bombero **solo ve la alarma si tiene NODO360 abierto**.

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activa **Cloud Messaging**
3. **Project settings → Service accounts → Generate new private key** → pega el JSON en `FIREBASE_SERVICE_ACCOUNT_JSON` (una línea)
4. **Project settings → General → Your apps → Web**: copia apiKey, projectId, appId, messagingSenderId, etc. a `FIREBASE_WEB_*`
5. Cloud Messaging → **Web Push certificates** → genera **VAPID** → `FIREBASE_WEB_VAPID_KEY`
6. Para la **app Android (Capacitor)**: descarga `google-services.json` a `apps/web/android/app/`
7. Redeploy API. El bombero inicia sesión → banner **Activar notificaciones** → debe aceptar el permiso
8. Prueba: despacha un 10-0 con el celular en reposo (app cerrada)

**iPhone:** hace falta la app nativa + cuenta Apple Developer. El navegador Safari no despierta apps cerradas de forma fiable.

La API persiste cada alarma y entrega por dispositivo en PostgreSQL antes de
enviarla a FCM. El worker integrado reintenta con backoff y recupera entregas
interrumpidas; no requiere Redis. Sus variables `ALARM_WORKER_*` y
`ALARM_QUEUE_TTL_SECONDS` son opcionales y están documentadas en
`apps/api/.env.example`. En el despliegue inicial debe existir una sola instancia
con `ALARM_WORKER_ENABLED=true`.

Endpoints autenticados para clientes:
- `GET /api/notifications/mine`: estado e historial propio.
- `POST /api/notifications/:id/opened`: registra apertura.
- `POST /api/notifications/:id/acknowledged`: registra acuse.

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
| Kodesk (plataforma) | `nodo360@kodesk.cl` | `Kodesk360!` |
| Super Admin | `admin@nodo360.cl` | `Admin1234!` |
| Capitán | `martinez@bomberosparral.cl` | `Demo1234!` |
| Operador Central | `central@bomberosparral.cl` | `Demo1234!` |

Vista pública demo: `/central/bomberos-parral` (también `/central/parral-segunda` … `/central/parral-sexta-remulcao`)  
Consola Kodesk: `/implementacion` — crea o repara el Cuerpo de Parral (6 compañías)  
Perfil operador central: `/central-operativa`

Al arrancar, la API asegura: dueño Kodesk, las 6 compañías y los mandos/capitanes piloto si faltan. No borra datos existentes.

---

## Notas importantes

- **CORS:** la API usa `FRONTEND_URL`; debe coincidir exactamente con la URL del static site (sin barra final).
- **Uploads:** documentos, fotos y planes van a **Cloudinary**. Sin esas 3 variables, los archivos se guardan en disco local y **se pierden** al redeploy. Plan gratis de Cloudinary (~25 GB) alcanza para empezar.
- **Producción real:** `AUTO_SEED_DEMO=false` y planes pagados (API Starter + Postgres Basic).
- **Cold start:** el plan free “duerme” la API; el primer login puede tardar ~30 s.
- **Build web:** localmente usamos `tsc && vite build`; en Render usamos `build:render` (solo Vite) para evitar errores de tipos de Leaflet.

---

## Checklist post-deploy

- [ ] Login Kodesk en `https://www.nodo360.net` → `/implementacion` y 6 cuarteles
- [ ] Login Super Admin y Central (`admin@nodo360.cl`, `central@bomberosparral.cl`)
- [ ] Dashboard carga datos
- [ ] Módulo Salud y mapa funcionan
- [ ] `FRONTEND_URL` y `VITE_API_URL` actualizados si cambiaste nombres de servicios
- [ ] Cloudinary configurado: subir un PDF/foto y confirmar que el link es `res.cloudinary.com`
- [ ] Redeploy de la API y verificar que el archivo **sigue** abriéndose
- [ ] Firebase FCM: el bombero activa notificaciones y recibe alarma con la app cerrada
