# Runbook de alarmas fallidas y observabilidad

## Objetivo y severidad

- **SEV-1:** varias compañías no reciben despachos activos o existe cruce de autorización.
- **SEV-2:** una compañía/dispositivo presenta fallos sostenidos, cola vencida o latencia crítica.
- **SEV-3:** token individual inválido, acuse faltante o degradación sin impacto operativo inmediato.

La alarma móvil es un canal de apoyo: ante SEV-1 se debe activar de inmediato el medio de despacho
alternativo definido por la institución.

## Detección mínima

Alertar por: entregas `FAILED`/`EXPIRED`; antigüedad máxima de `QUEUED`; locks `PROCESSING` vencidos;
tasa de éxito FCM; intentos por entrega; latencia despacho→`SENT` y despacho→`OPENED`; incidentes sin
dispositivos; worker inactivo; errores de autenticación Firebase; y crecimiento anormal de tokens
inválidos. Separar métricas por plataforma, compañía y versión sin exponer tokens ni datos sensibles.

Registrar de forma estructurada `incidentId`, `notificationId`, `deliveryId`, `eventType`, código 10-X,
estado, intento, plataforma, timestamps y código de error del proveedor. Redactar token, credenciales,
dirección y ubicación de logs generales.

## Triage

1. Confirmar alcance, hora inicial, incidente y canal alternativo activado.
2. Revisar salud de API/DB, una sola instancia con `ALARM_WORKER_ENABLED=true` durante el piloto y
   configuración `ALARM_WORKER_*`.
3. Consultar notificaciones y entregas por estado, antigüedad e intentos; no modificar datos todavía.
4. Clasificar error: configuración FCM/APNs, token permanente inválido, 429/5xx transitorio, expiración,
   lock estancado, falta de dispositivos o autorización incorrecta.
5. Comparar payload: `incidentId`, `eventType`, URL, código 10-X, canal `nodo360_alarm_10_X`, sonido
   `tone_10_X` y APNs crítico solo si está aprobado/habilitado.
6. Verificar si el cliente recuperó snapshot y si la respuesta offline conserva su clave idempotente.

## Mitigación segura

- Firebase no configurado/credencial inválida: corregir secreto y reiniciar controladamente; probar con
  un dispositivo interno antes de cerrar el incidente.
- 429/5xx/red: dejar actuar el backoff; no crear manualmente duplicados con otra `dedupKey`.
- Token no registrado/inválido: confirmar su eliminación automática y pedir nuevo registro al abrir app.
- Worker detenido: restaurar una instancia; los locks vencidos deben volver a `QUEUED`.
- Entregas expiradas: no reactivarlas sin autorización operativa; emitir una nueva alarma trazable si
  corresponde.
- Error de alcance entre compañías: deshabilitar el canal afectado, preservar evidencia y tratar como
  incidente de seguridad.

Nunca editar estados directamente en producción sin respaldo, ticket, consulta de impacto y plan de
reversión. Nunca copiar service accounts ni tokens a chats o tickets.

## Verificación y cierre

- Confirmar un despacho controlado con `QUEUED → PROCESSING → SENT` y apertura/acuse cuando aplique.
- Confirmar que reintentos no duplican notificación lógica ni respuesta del usuario.
- Revisar snapshot/socket/polling y aislamiento por compañía.
- Registrar causa raíz, duración, alcance, mitigación, evidencia, datos afectados y acciones preventivas.
- Mantener abierto hasta que la métrica vuelva a normalidad durante [ventana por definir].

## Consultas operativas sugeridas

Construir paneles sobre `AlarmNotification`, `AlarmDelivery` y `AlarmDeliveryHistory`, evitando consultas
ad hoc con datos sensibles. El panel debe mostrar conteos por estado, percentiles de latencia, tasa de
reintentos, errores principales y entregas más antiguas. Definir responsables, umbrales, canal de guardia
y retención de logs antes del piloto.
