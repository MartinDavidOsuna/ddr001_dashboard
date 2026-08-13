# Fase 1 — Fundamentos + visor RV

Estado: **IMPLEMENTADA - PENDIENTE DE CERTIFICACIÓN**. Actualizado: 2026-08-13.

## Alcance

SPA Vue 3 administrativa con login real, dashboard agregado, lista RV paginada/filtrada en servidor y detalle completo (resumen, checklist dinámico, fotos privadas, GPS, señal, historial y auditoría) usable a 1440, 768–1024 y 390 px. No incluye escrituras de negocio, migraciones ni cambios Flutter.

## Arquitectura

- Vue 3 + TypeScript + Vite, Pinia y Vue Router.
- PrimeVue para controles accesibles/densos; ECharts para agregados; Leaflet/OSM para coordenadas reales.
- Axios centralizado por su soporte consistente de interceptores, cancelación/timeout, bytes autenticados y una cola única de refresh. Token de acceso en memoria y refresh persistido en `sessionStorage` (riesgo XSS documentado); restauración vía refresh, rotación y cierre coordinado.
- Features por dominio, tipos de contrato separados de view-models y transformadores probados.
- Endpoints administrativos de lectura bajo `/api/v1/admin/dashboard/...`; no se modifica ninguna ruta de campo.
- Paginación, filtros, agregados, actores y completitud resueltos en SQL sin N+1. Originales fotográficos sólo bajo demanda.

## Findings de auditoría

1. Dashboard remoto nuevo/vacío; se creó repositorio local y rama `feature/fase-1-visor-rv` desde la rama default nominal `main` sin commits remotos disponibles.
2. API es Express 4 + TypeScript/Node 22 + SQL Server 2014, Zod, JWT/refresh rotatorio, Sharp y Vitest. `origin/main` avanzó a `64e51b5` durante la auditoría.
3. Flutter es Dart 3.12/Flutter, Dio, Hive y almacenamiento seguro. Permanece sin cambios en `backup/first-on-field-test-mac`.
4. La API ya ofrece auth admin, summary simple, listas admin y detalle de inspección, pero el detalle no incluye definición completa del checklist ni acceso admin al contenido de fotos; la lista no cubre filtros/completitud solicitados.
5. Figma contiene localidad, municipio, 77 preguntas, tipo y anomalías ilustrativas. El contrato vigente confirma siete slots fotográficos obligatorios y permite N fotos totales; territorio y anomalías no son reglas vigentes.
6. `main` y la línea acumulativa móvil reciente divergen: reportes inmutables/fotos generales existen en una rama no integrada. Fase 1 se implementa como extensión aislada de `main`, tolerante a slots dinámicos, sin modificar contratos de campo.
7. `main` y Flutter confirman siete códigos obligatorios. La completitud usa 0–7/7; códigos distintos o duplicados son adicionales y N total se informa por separado.

## Endpoints reutilizados

| Método/ruta | Uso |
|---|---|
| POST `/api/v1/admin/auth/login` | Login admin |
| POST `/api/v1/admin/auth/refresh` | Rotación de refresh |
| POST `/api/v1/admin/auth/logout` | Revocación |
| GET `/api/v1/admin/auth/me` | Validación de sesión/claims |
| GET `/api/v1/admin/summary` | Referencia de fórmula y fallback diagnóstico; la UI usará summary extendido |
| GET `/api/v1/admin/users` | Verificación/administración existente; filtros usarán opciones compactas nuevas |
| GET `/api/v1/admin/crews` | Ídem cuadrillas |

## Endpoints nuevos necesarios

| Método/ruta | Propósito |
|---|---|
| GET `/api/v1/admin/dashboard/summary` | KPIs, estados, serie temporal y ranking reales |
| GET `/api/v1/admin/dashboard/filters` | Técnicos/cuadrillas/estados compactos para filtros |
| GET `/api/v1/admin/dashboard/inspections` | Lista RV con paginación y filtros server-side |
| GET `/api/v1/admin/dashboard/inspections/:id` | Header, definición+respuestas, muestras, fotos, historia y auditoría sin N+1 |
| GET `/api/v1/admin/dashboard/inspections/:id/photos/:photoId/thumbnail` | Miniatura privada admin |
| GET `/api/v1/admin/dashboard/inspections/:id/photos/:photoId/content` | Original privado admin bajo demanda |

No se requiere nueva tabla ni migración.

## Riesgos

- Divergencia `main` vs ramas móviles recientes: evitar columnas exclusivas no desplegadas; documentar compatibilidad.
- OpenAPI incompleto: tipos frontend se basan en implementación y se validan defensivamente.
- Tokens en SPA: CSP estricta, sin HTML arbitrario y refresh en `sessionStorage`; una SPA no puede igualar una cookie HttpOnly sin cambio contractual.
- Archivos privados pueden faltar aunque DB diga `verified`: devolver 503 y estado de imagen no disponible.
- SQL Server 2014: evitar sintaxis moderna e índices/migraciones.
- La DB local puede no estar disponible o no contener credenciales admin conocidas; el E2E real se registra con evidencia o como bloqueo operativo, nunca se sustituye por mocks.

## Secuencia

- [x] Verificar remotos, ramas y reglas de sólo lectura.
- [x] Auditar API, Flutter, DDL, OpenAPI, planes recientes y Figma.
- [x] Crear diccionario, matriz, métricas y plan.
- [x] Implementar y probar extensión API administrativa aislada.
- [x] Crear base Vue, cliente HTTP, auth/guards y layout responsive.
- [x] Implementar dashboard y navegación de módulos futuros sin datos ficticios.
- [x] Implementar lista, filtros y paginación server-side.
- [x] Implementar detalle, checklist dinámico, fotos/lightbox, mapa, señal, historial y auditoría.
- [x] Ejecutar lint, typecheck, unitarias y builds.
- [ ] Ejecutar E2E manual autenticado real y responsive mediante navegador. Autenticación READ_ONLY, refresh, CORS y endpoints legacy se certificaron contra el servicio real; bloqueo externo: los endpoints `/api/v1/admin/dashboard/...` de esta rama responden 404 en el ambiente indicado (rama API no desplegada) y el navegador de automatización no estuvo disponible.
- [x] Integrar extensión API mediante PR #5; merge commit `28ca304`.
- [ ] Desplegar merge API. Pre-deploy detenido de forma segura: no se pudo identificar proceso NSSM/PM2, directorio activo ni artefacto de rollback; el servicio aún responde 404 en las rutas nuevas.
- [x] Actualizar este plan y `docs/fase-1-validation.md`.

## Criterios de aceptación

- Admin real puede iniciar/restaurar/cerrar sesión.
- Ninguna pantalla funcional depende de mocks/placeholders.
- KPIs y filtros provienen de consultas server-side documentadas.
- Una inspección RV real muestra todos sus items en la versión correcta, incluidos false, N/A, unidades y JSON.
- Galería usa bytes reales autenticados y carga original sólo en lightbox.
- GPS maestro/capturado, señal, historial y auditoría son distinguibles y toleran ausencia.
- 1440, tablet y 390 px son usables con teclado, foco visible, labels y estados de error/vacío/carga.
- No hay cambio, rama ni commit en Flutter; rutas de campo API quedan intactas.

## Pruebas previstas

- API: validación Zod de filtros, paginación, autorización/IDOR, consultas agregadas, streaming de miniatura/original, RFC Problem Details, lint, type-check, unitarias y build.
- Frontend: transformadores de respuestas, completitud, auth refresh concurrente, stores/services, rutas protegidas, lint, typecheck, Vitest y build.
- Manual: los 20 pasos definidos por el objetivo, incluida recarga en detalle y breakpoints.

## Pendientes para Fase 2

- CRUD/gestión de hidrantes, usuarios, cuadrillas, jornadas y dispositivos.
- Mapa global, exportaciones avanzadas y acciones de validación/rechazo.
- Integración coordinada del modelo inmutable/global cuando llegue a `main` y esté desplegado.
- Política de READ_ONLY más allá del rol backend `viewer`; en Fase 1 sólo lecturas, sin falsa seguridad cliente.
