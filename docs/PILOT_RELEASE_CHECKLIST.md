# Piloto y publicación móvil

Este documento es una guía de ejecución. Cada resultado debe registrarse con fecha, versión, modelo,
versión del sistema operativo, red y evidencia. Un APK/IPA compilado no reemplaza las pruebas físicas.

## Matriz manual de recepción

Ejecutar cada fila con al menos un Android objetivo y un iPhone objetivo. Repetir los códigos 10-0,
10-4 y 10-12 para cubrir extremos y un caso intermedio del mapeo de tonos.

| Escenario | Android: resultado esperado | iOS: resultado esperado | Evidencia |
|---|---|---|---|
| App en primer plano | Alerta visible, vibración, canal y tono del 10-X correcto; abre el incidente | Banner/alerta, tono CAF correcto si está incluido; abre el incidente | video + diagnóstico de Alertas |
| Pantalla bloqueada | Notificación de alta importancia visible; full-screen solo si el SO lo autoriza | Notificación visible; sonido sujeto a silencio/Focus salvo Critical Alerts aprobado | video desde segundo equipo |
| App cerrada/forzada | Push FCM abre el incidente correcto; registrar restricciones del fabricante | Push APNs abre el incidente; no prometer ejecución en segundo plano | video + timestamp servidor |
| Ahorro de batería | Medir demora; documentar si el fabricante posterga la entrega | Medir demora con Low Power Mode | hora envío/recepción |
| Silencio | Sonido según canal configurado por el usuario; no asumir bypass | Sin sonido salvo Critical Alerts autorizado | captura de ajustes |
| DND/Focus | Bypass solo con Notification Policy Access y canal habilitado | Solo Critical Alerts aprobadas pueden atravesar Focus | captura de permisos |
| Sin red al responder | La UI conserva snapshot y una respuesta pendiente por incidente | Igual; no debe perderse al cerrar/reabrir | captura antes/después |
| Red recuperada | Reintenta con el mismo `Idempotency-Key`, elimina éxito y conserva 429/5xx | Igual | historial API + UI |
| Push duplicado | Una respuesta no genera efectos duplicados | Igual | historial idempotente |
| Ubicación después de “Voy” | Actualiza GPS sin reemplazar asistencia “Voy” | Igual | snapshot y evento socket |

También verificar: permiso denegado y luego habilitado desde Ajustes; token refrescado; usuario
desactivado; compañía ajena; incidente cerrado; deep link con sesión expirada; canal modificado por el
usuario; actualización de app sobre una instalación existente.

## Firebase y APNs

- [ ] Proyecto Firebase definitivo separado de desarrollo y con responsables asignados.
- [ ] App Android `cl.nodo360.mobile` registrada; SHA necesarias cargadas.
- [ ] `google-services.json` real instalado localmente/CI como secreto y nunca versionado.
- [ ] App iOS con Bundle ID definitivo registrada en Firebase.
- [ ] `GoogleService-Info.plist` real instalado como secreto y agregado al target App.
- [ ] APNs Auth Key o certificado cargado en Firebase; Team ID y Key ID verificados.
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` configurado solo en el gestor de secretos del backend.
- [ ] Rotación, revocación y responsable de credenciales documentados.
- [ ] Envío FCM de prueba validado en dispositivos físicos Android/iOS.
- [ ] Eliminación de tokens inválidos y telemetría de entregas revisadas.

## Firma, capabilities y publicación

- [ ] Android: keystore de release fuera del repositorio, respaldo cifrado y alias/contraseñas en CI.
- [ ] Android: `versionCode`/`versionName`, min/target SDK, iconos, splash y ficha Play definitivos.
- [ ] Android 13+: permiso de notificaciones; Android 14+: elegibilidad de full-screen revisada.
- [ ] Declaración de uso de alarmas/full-screen y Data safety de Google Play consistentes con la app.
- [ ] iOS: cuenta Apple Developer, certificados y provisioning profile de distribución vigentes.
- [ ] iOS: Push Notifications y Background Modes/Remote notifications habilitados según uso real.
- [ ] Critical Alerts no se agrega hasta tener aprobación escrita de Apple y perfil regenerado.
- [ ] `aps-environment` corresponde al entorno de distribución usado.
- [ ] Associated Domains/App Links/Universal Links definidos y alojados en dominio de producción.
- [ ] Política de privacidad, URL de soporte, responsable y proceso de eliminación publicados.
- [ ] Revisión interna de textos, accesibilidad, capturas, clasificación de edad y datos recolectados.
- [ ] Smoke de producción realizado con cuentas de piloto, sin usar credenciales demo.

## Criterio de salida del piloto

No publicar si existe pérdida de respuestas offline, cruce de compañías, duplicación no idempotente,
payload 10-X incorrecto, ausencia de trazabilidad de fallos o credenciales dentro del artefacto.
La publicación requiere aprobación operativa y técnica basada en la matriz completada; este repositorio
no constituye evidencia de pruebas físicas ni de aprobación de tiendas.
