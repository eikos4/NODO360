# Distribución privada — APK Bomberos (Nodo360)

Canal interno (Drive / WhatsApp / USB). **No** Play Store.

## 0. Render (para que suene con la app cerrada)

La APK ya tiene Firebase (`nodo360-9a8ac`). El servidor también tiene que poder enviar FCM.

1. Firebase Console → proyecto **nodo360-9a8ac** → ⚙️ Project settings → **Service accounts**
2. **Generate new private key** (descarga un JSON distinto de `google-services.json`)
3. Render → **nodo360-api** → Environment → `FIREBASE_SERVICE_ACCOUNT_JSON` = ese JSON en **una línea**
4. Guardar (redeploy). En logs: `Push FCM listo`

Sin esa variable, la app se instala pero **no suena cerrada**.

## 1. Firebase (obligatorio para alarmas con app cerrada)

1. Firebase Console → app Android `cl.nodo360.mobile`
2. Descargar `google-services.json`
3. Guardarlo en:

```text
apps/mobile/android/app/google-services.json
```

Verificar:

```bash
npm run check:firebase --workspace=apps/mobile
```

## 2. Keystore (firma release)

Solo una vez por computador de release (hacer backup):

```bash
npm run keystore --workspace=apps/mobile
```

Genera (ignorados por git):

- `apps/mobile/android/app/nodo360-mobile-release.keystore`
- `apps/mobile/android/keystore.properties`

**Guardá copia segura.** Si perdés la firma, los bomberos deben desinstalar la app anterior para instalar la nueva.

## 3. Generar APK

```bash
# Desde la raíz del monorepo
npm run apk:mobile:release
```

Salida:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

La `versionName` queda con fecha (`1.0.3-YYYYMMDD`). En la app: **Perfil** → línea “App … · build …”.

## 4. Canal de entrega (sugerido)

1. Subir `app-release.apk` a Google Drive (enlace “cualquiera con el link”).
2. Renombrar el archivo con la versión, ej. `Nodo360-1.0.3-20260926.apk`.
3. Enviar el link + estas instrucciones:

### Instalar en el celular

1. Descargar el archivo `.apk`.
2. Si Android bloquea: **Ajustes → Seguridad → Instalar apps desconocidas** (o “Orígenes desconocidos”) y permitir el navegador / Files / Drive.
3. Abrir el APK → **Instalar**.
4. Abrir **Nodo360** → iniciar sesión.
5. En **Alertas** (o el menú de permisos de la app): permitir notificaciones, tono de alarma y, si pide, batería sin restricciones.
6. En **Perfil**, confirmar la versión (debe coincidir con el nombre del APK).

## 5. Checklist de prueba (2–3 celulares)

Probar al menos **1 Samsung** y **1 Xiaomi/Redmi** (o Motorola).

| # | Prueba | OK? |
|---|--------|-----|
| 1 | Instala APK release sin desinstalar build vieja (misma firma) | |
| 2 | Login con cuenta de bombero | |
| 3 | Perfil muestra versión correcta | |
| 4 | Cerrar app (swipe) + despachar alarma de prueba → tono / notificación | |
| 5 | Marcar **En camino** / **En el lugar** | |
| 6 | App en segundo plano 10 min + otra alarma | |
| 7 | Desactivar “optimización de batería” para Nodo360 si el OEM la mata | |
| 8 | Sin Wi‑Fi (solo datos) responde Voy | |

## Comandos útiles

```bash
npm run check:firebase --workspace=apps/mobile
npm run keystore --workspace=apps/mobile
npm run apk:mobile:release
npm run apk:mobile          # debug (solo desarrollo)
```
