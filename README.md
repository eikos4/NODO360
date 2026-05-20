# NODO360 — Plataforma de Gestión Operativa para Bomberos

## Stack
- **Frontend:** React + Vite + TailwindCSS + PWA
- **Backend:** NestJS + REST API
- **DB:** PostgreSQL + Prisma ORM
- **Auth:** JWT + RBAC (8 roles)

## Estructura del monorepo

```
nodo360/
  apps/
    web/        ← React + Vite + PWA (puerto 5173)
    api/        ← NestJS REST API (puerto 3001)
  packages/
    shared/     ← Tipos y enums compartidos
```

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno del backend

```bash
copy apps\api\.env.example apps\api\.env
```
Editar `apps/api/.env` con tu conexión PostgreSQL y un JWT_SECRET seguro.

### 3. Generar cliente Prisma y migrar la BD

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Levantar en desarrollo

Terminal 1 — Backend:
```bash
npm run dev:api
```

Terminal 2 — Frontend:
```bash
npm run dev:web
```

La app estará en `http://localhost:5173` y la API en `http://localhost:3001/api`.

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| SUPER_ADMIN | Todo el sistema |
| COMANDANTE | Operativo completo |
| CAPITAN | Gestión diaria |
| ENCARGADO_MATERIAL | Inventario y mantención |
| SECRETARIO | Documentos y actas |
| TESORERO | Finanzas y compras |
| BOMBERO | Lectura básica |
| AUDITOR | Solo lectura |

## Módulos (roadmap)

- ✅ **Bloque 1:** Auth + Roles, Compañías, Personal
- 🔲 **Bloque 2:** Inventario, Dashboard Ejecutivo, Alertas
- 🔲 **Bloque 3:** Guardia/Turnos, Emergencias, Mantención
- 🔲 **Bloque 4:** Documental, Compras/Facturación, Finanzas
