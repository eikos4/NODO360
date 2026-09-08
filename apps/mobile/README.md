# Nodo360 Mobile

Cliente operativo separado para Android/iOS, construido con React, TypeScript, Vite y Capacitor 8.

## Puesta en marcha

Requisitos: Node 20, Android Studio/JDK 21 para Android y macOS/Xcode para compilar iOS.

```bash
cp apps/mobile/.env.example apps/mobile/.env
npm install
npm run dev:mobile
npm run build:mobile
npm run sync:mobile
```

Después de sincronizar:

```bash
npm run open:android --workspace=apps/mobile
npm run open:ios --workspace=apps/mobile
```

El proyecto iOS puede generarse en Windows, pero solo se compila/firma en macOS.

## Contratos y comportamiento

- Login: `POST /auth/login`; restauración: `GET /auth/me`.
- Sesión nativa: `@aparajita/capacitor-secure-storage` 8 (Keychain / Android Keystore). El único fallback web está aislado en `src/platform/session.ts` y usa `sessionStorage` solo para desarrollo.
- Estado operativo: `GET /emergency-response/snapshot`.
- Tiempo real: Socket.IO en `/emergencies`, con polling de respaldo cada 12 s con alarmas o 45 s en espera.
- Respuestas: `POST /emergency-response/:id/respond`, con UUID en cuerpo y cabecera `Idempotency-Key`.
- Offline: snapshot, historial y cola en Capacitor Preferences. La última respuesta pendiente por incidente se reintenta al recuperar red.
- Alarmas: se marcan `opened` al abrir un deep link/push y `acknowledged` al responder.
- Deep links esperados: `nodo360://emergency/<incidentId>?notificationId=<id>` o URL con `incidentId` y `notificationId`.

## Firebase nativo (sin credenciales en el repositorio)

- Android: descarga el archivo real para el package `cl.nodo360.mobile` y guárdalo como
  `apps/mobile/android/app/google-services.json`. Usa `google-services.json.example` solo como guía.
- iOS: descarga `GoogleService-Info.plist`, guárdalo en `apps/mobile/ios/App/App/` y agrégalo al
  target **App** en Xcode. `GoogleService-Info.plist.example` no es una configuración funcional.
- Ambos archivos reales están ignorados por git. No reemplaces los placeholders con datos inventados.
- La app usa `@capacitor-firebase/messaging` (no el plugin push genérico), por lo que Android e iOS
  registran tokens FCM compatibles con Firebase Admin. También debes subir la APNs Auth Key/certificado
  al proyecto Firebase. Si Xcode informa una colisión de identidad SwiftPM, activa la opción
  `experimental.ios.spm.packageOptions["@capacitor-firebase/messaging"].symlink` en un macOS que
  permita symlinks; no se activa por defecto porque Windows sin Developer Mode hace fallar `cap sync`.

## Tonos nativos y alertas críticas

Android contiene los trece tonos existentes (10-0 a 10-12) en `res/raw`, crea un canal
`nodo360_alarm_10_X` por tono con audio de uso alarma, vibración, visibilidad pública y
`IMPORTANCE_HIGH`. La prioridad de cada notificación de prueba es `MAX`; Android no ofrece
`IMPORTANCE_MAX` para canales. El bypass DND solo se solicita al canal cuando el usuario ya concedió
Notification Policy Access.

Los MP3 originales no son un formato válido para sonidos de notificación iOS. Genera PCM/CAF antes
de archivar:

```bash
npm run prepare:ios-tones --workspace=apps/mobile
```

El script usa `ffmpeg` si está instalado o `afconvert` en macOS/Xcode y deja los archivos
`tone_10_0.caf` … `tone_10_12.caf` en la carpeta `Sounds`, incluida como recurso del target.

iOS Push Notifications está habilitado mediante `App.entitlements`. Critical Alerts **no** está
habilitado en el entitlement normal: Apple debe aprobarlo para el App ID. Solo tras la aprobación:

1. Copia la clave de `App.critical-alerts.entitlements.example` a `App.entitlements`.
2. Regenera el provisioning profile con esa capability.
3. Cambia `Nodo360CriticalAlertsEnabled` a `true` en `Info.plist`.
4. Define `IOS_CRITICAL_ALERTS_ENABLED=true` en el backend.

Sin esos cuatro pasos la app compila con push estándar y el backend no emite `critical: 1`.

## Límites de plataforma

- El permiso de notificaciones, DND, pantalla completa y optimización de batería se revisa en
  **Alertas** dentro de la app; cada ajuste requiere decisión explícita del usuario.
- Android 14+ puede revocar `USE_FULL_SCREEN_INTENT`; Google Play lo restringe a casos elegibles de
  alarma/llamada y algunos fabricantes limitan actividad en segundo plano. Declarar el permiso no lo garantiza.
- Los canales Android son controlados por el usuario después de crearse. Si cambia sonido,
  importancia o DND en Ajustes, la app no puede forzar su restauración.
- Un push FCM mostrado directamente por el sistema usa el canal/tono, pero FCM no ofrece un campo
  remoto para forzar full-screen intent. La prueba local sí lo solicita cuando Android lo permite.
- En iOS una notificación estándar no puede ignorar silencio/Focus. Critical Alerts solo lo hace con
  entitlement aprobado, autorización del usuario y payload crítico habilitado.
- Sigue pendiente declarar/validar App Links/Universal Links de producción, iconos finales, firma y publicación.
