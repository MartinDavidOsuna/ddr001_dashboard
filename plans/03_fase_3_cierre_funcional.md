# Fase 3 — Cierre funcional de la plataforma

Estado: **IMPLEMENTACIÓN EN CURSO — PENDIENTE DESPLIEGUE API Y CERTIFICACIÓN**. Inicio: 2026-08-26.

## Objetivo y límites

La Fase 3 completa la superficie administrativa pendiente: galería global, exportaciones, usuarios, cuadrillas, jornadas, dispositivos, mapa global, validación/rechazo, CRUD administrativo controlado y comparador de revisiones. La certificación exigirá roles reales, autorización en API, auditoría, pruebas API/frontend, Edge E2E y responsive 1440/768/390.

El dashboard continuará exclusivamente en `feature/fase-2-hydrant-master-record`. Flutter es estrictamente de sólo lectura. Sus rutas, cuerpos, respuestas, autenticación, sesiones, sincronización y fotografías son contrato congelado. No se desplegará la API ni se ejecutarán migraciones o escrituras productivas desde este trabajo.

## Línea base auditada

| Componente | Rama/commit | Estado inicial |
|---|---|---|
| Dashboard | `feature/fase-2-hydrant-master-record` / `2f0d603` | Fases 1 y 2 certificadas; rama única conservada para Fase 3 |
| API | `feature/fase-3-dashboard-api` desde `main` `85265fd` | Rama exclusiva de Fase 3; `main` permanece protegida y productiva |
| Flutter | `main` / `c01961d` | Inspeccionado sin modificar; sesiones de campo y sincronización congeladas |
| Producción | `http://cifra.aquafim.com:3002/api/v1` | Rutas existentes verificadas de forma anónima sólo para montaje/protección; sin escrituras |

Commits relevantes posteriores al núcleo de Fase 2: dashboard `d5aa482` incorporó galería/exportación parcial; API `9eeeae4` incorporó galería, `d713d00` XLSX, `ae7787d` pruebas/documentación y `7d502a2` su integración. La auditoría no creó ramas ni modificó API o Flutter.

## Contratos y capacidades existentes

- Lectura administrativa existente: `/admin/users`, `/admin/crews`, `/admin/work-sessions`, listado/detalle de revisiones, filtros, resumen, hidrantes y fotografías privadas.
- Galería existente: `GET /admin/dashboard/photos` y `/photos/filters`. Pagina y busca, pero sólo expone fotografías activas `verified`; carece de filtros explícitos de técnico, cuadrilla y verificación.
- Exportación existente: `GET /admin/dashboard/exports/inspections.xlsx`, generada server-side y sin filtros. El CSV legado `/admin/export/inspections.csv` sólo admite estado/fechas.
- Revisión existente: `PATCH /admin/inspections/:id/status`, restringido a `admin|supervisor`, acepta `validated|rejected`, exige comentario al rechazar, usa transacción serializable y registra historial/auditoría.
- Roles reales: `viewer`, `admin` y `supervisor`. No se crearán roles sólo de frontend.
- Esquema disponible: `rv.users`, `rv.crews`, `rv.devices`, `rv.work_sessions`, `rv.inspections`, `rv.inspection_status_history` y `rv.audit_log`. Usuarios, cuadrillas, jornadas e inspecciones tienen `row_version`; dispositivos no lo tienen en el DDL base.
- El inicio móvil `POST /field-sessions/start` crea/actualiza usuario, cuadrilla y dispositivo, liga la jornada y emite tokens. Sus rutas `/field-sessions/*` son contrato congelado y no se reutilizarán para administración.

Rutas administrativas ausentes en producción al auditar: `/admin/devices`, `/admin/dashboard/users`, `/crews`, `/work-sessions`, `/devices` y `/map` respondieron 404 sin token. Las rutas existentes de galería, exportación, usuarios, cuadrillas, jornadas y cambio de estado respondieron protección (401), no 404.

## Matriz de módulos

| Módulo | Estado actual | Reutilización | Extensión aditiva necesaria | Dependencias / riesgo |
|---|---|---|---|---|
| Galería global | UI y API parciales; lightbox reutilizable | fotos, thumbnails y originales privados | ampliar filtros y catálogo; enlaces hidrante/revisión; tests | no confundir 7 obligatorias con total; originales sólo bajo demanda |
| Exportaciones | UI de una descarga y XLSX server-side | XLSX existente y CSV legado como referencia | filtros comunes, CSV de revisiones y XLSX de hidrantes | streaming/volumen, fórmulas y ausencia de municipio/localidad |
| Usuarios | lista API genérica; placeholder UI | `rv.users` y agregados existentes | lista/detalle dashboard y comandos admin explícitos | el móvil autoactualiza identidad; baja lógica, nunca borrado histórico |
| Cuadrillas | lista API genérica; placeholder UI | `rv.crews` | lista/detalle y crear/editar/activar/desactivar | nombres normalizados usados al iniciar sesión móvil |
| Jornadas | lista API genérica; placeholder UI | `rv.work_sessions` | lista/detalle agregado y, sólo si procede, revocación controlada | no editar historia; revocar también tokens de esa jornada |
| Dispositivos | esquema presente; sin ruta admin/UI | `rv.devices` | lista/detalle y bloqueo/desbloqueo auditado | contrato de campo debe respetar `is_blocked`; definir concurrencia sin migrar |
| Mapa global | ausente | hidrantes/última revisión | endpoint compacto con filtros/bounding box y UI Leaflet clustering | no fotos, samples históricos, N+1 ni mezcla de CRS |
| Validación/rechazo | endpoint parcial existente | transición y transacción actuales | Problem Details/409, `rejection_code`, before/after y UI por rol | no inventar transiciones; concurrencia e IDOR |
| CRUD controlado | ausente | entidades y auditoría | comandos específicos de usuario/cuadrilla/dispositivo | nunca CRUD genérico, borrado físico o edición de historia |
| Comparador | ausente | dos detalles de revisión existentes | comparación frontend por `itemCode`; endpoint nuevo sólo si medición lo exige | originales lazy; comparar evidencia humana, no IA |

## Endpoints previstos

Primero se reutilizarán las rutas existentes. Las extensiones nuevas vivirán bajo `/api/v1/admin/dashboard/...` y no modificarán endpoints de campo.

- Galería: extender `GET /admin/dashboard/photos` y `/photos/filters` con `technicianId`, `crewId`, rango, categoría/slot y estado respaldado por datos.
- Exportaciones: extender XLSX con filtros; agregar `GET /admin/dashboard/exports/inspections.csv` y `/hydrants.xlsx` server-side.
- Usuarios: `GET /admin/dashboard/users`, `GET /users/:id` y comandos admin separados para crear, editar, cambiar estado y asignar cuadrilla.
- Cuadrillas: `GET /admin/dashboard/crews`, `GET /crews/:id` y comandos admin separados de creación, edición y estado.
- Jornadas: `GET /admin/dashboard/work-sessions`, `GET /work-sessions/:id`; cualquier revocación se habilitará sólo tras pruebas del contrato vigente.
- Dispositivos: `GET /admin/dashboard/devices`, `GET /devices/:id` y comando admin de bloqueo/desbloqueo.
- Mapa: `GET /admin/dashboard/map/hydrants`, compacto, filtrable y opcionalmente limitado por bounding box.
- Revisión: consolidar una operación dashboard para `submitted → validated|rejected`, con comentario/código, conflicto 409, historial y auditoría before/after.
- Comparador: inicialmente dos lecturas de detalle y comparación local determinista por `itemCode`; crear endpoint agregado sólo si las mediciones muestran payload o latencia inadecuados.

Los nombres definitivos y cuerpos se fijarán con tests de contrato antes de implementar cada extensión. Viewer recibirá 403 en toda escritura aunque invoque UUID directamente; admin/supervisor sólo podrán ejecutar las operaciones expresamente autorizadas.

## Estrategia API y base de datos

Toda implementación API de Fase 3 se realizará exclusivamente en `feature/fase-3-dashboard-api`, creada desde `main`. No se desarrollará en `main`, no se crearán ramas por módulo y no se mezclarán ramas de otras aplicaciones. El parche de galería `b9dfaef` se auditó mediante patch-id y quedó consolidado de forma aislada como `296acde`; no se hizo merge de `feature/dashboard-fase-2-api`. Nunca se desplegará automáticamente.

La primera opción es resolver sin migración usando las tablas, estados, `row_version`, historial y auditoría existentes. Si aparece una necesidad real de esquema, el entregable será únicamente: documento de necesidad, precheck, SQL idempotente, rollback y pruebas; no se ejecutará. El bloqueo de dispositivo requiere además comprobar que el campo móvil ya rechace `is_blocked`; no se habilitará una UI decorativa sin enforcement API.

Toda escritura crítica usará transacción, autorización por rol, validación Zod, consulta parametrizada, comprobación de entidad/estado, concurrencia optimista o condición equivalente, Problem Details y `rv.audit_log` con actor, acción, entidad, before/after y timestamp. En producción la certificación seguirá siendo sólo lectura hasta autorización explícita.

## Orden de implementación y puertas de calidad

1. Auditoría general y esta línea base.
2. Galería global. **Implementada en código; pendiente deployment manual de API y E2E.**
3. Exportaciones.
4. Usuarios.
5. Cuadrillas.
6. Jornadas.
7. Dispositivos.
8. Mapa global.
9. Validación/rechazo.
10. CRUD administrativo controlado.
11. Comparador.
12. Seguridad: roles, IDOR, SQL injection, estados, conflictos y auditoría.
13. Performance: paginación, N+1, carga lazy, clustering y evaluación granular/lazy de ECharts.
14. Ampliación del único harness `scripts/edge-e2e.mjs`, con login runtime sin secretos persistidos.
15. Certificación final funcional, visual, responsive y documental.

Cada módulo estable exige typecheck, lint, Vitest y build del dashboard; endpoints nuevos exigen auth, viewer forbidden, admin allowed, validación, 404, 409, Problem Details, SQL injection, IDOR y paginación. Los comandos se probarán con DB local/test o fixtures aislados, nunca escribiendo producción. Cada hito dashboard se commiteará y publicará en la rama única.

## Riesgos y decisiones pendientes

- El alta móvil actual puede crear/actualizar técnicos y cuadrillas: la administración debe coexistir sin bloquear sincronización ni reinterpretar identidad.
- Falta comprobar enforcement de `is_active`/`is_blocked` en el flujo de campo antes de ofrecer esas acciones.
- El endpoint de validación existente no persiste aún `rejection_code`, no audita claramente before/after y debe mapear conflictos a 409.
- Dispositivos carecen de `row_version` en el DDL base; se preferirá actualización condicional por estado/fecha antes de proponer esquema.
- La galería sólo incluye `verified`; un filtro de verificación no puede prometer estados que no sean recuperables con seguridad.
- El XLSX completo no respeta filtros; se debe compartir una especificación de filtros entre listas y exportaciones.
- ECharts genera un warning conocido cercano a 535 kB; sólo se cambiarán imports/lazy loading si pruebas visuales y funcionales permanecen estables.

## Criterio de certificación

**FASE 3 — CERTIFICADA** sólo será válido cuando todos los módulos estén implementados, viewer/admin funcionen con autorización real, escrituras y auditoría estén probadas, API/frontend/E2E pasen, 1440/768/390 estén certificados, consola/red estén limpias, Flutter conserve sus contratos y todos los commits estén publicados. Si el código API espera despliegue manual, el estado será **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**.
