# Fase 3 — Cierre funcional de la plataforma

Estado: **IMPLEMENTACIÓN EN CURSO — PENDIENTE DESPLIEGUE API Y CERTIFICACIÓN**. Inicio: 2026-08-26.

## Objetivo y límites

### Actualización Mapa Global — 2026-09-17

Esta actualización prevalece para Mapa sobre las restricciones históricas de rama/publicación de esta fase: se trabaja en los clones existentes, sobre su estado local funcional, en `feature/global-multidomain-map` y `feature/global-map-api`, sin push, merge, despliegue ni migraciones. Se preservan Diagnósticos y los cambios previos.

Mapa es una superficie de exploración multidominio en `/mapa`, con vistas Hidrantes RV, Levantamientos, Diagnósticos y Todos (capas independientes). RV usa coordenadas maestras, Construction coordenadas canónicas y Diagnósticos una muestra GPS representativa por caso; no se inventan relaciones entre medidores e hidrantes. Véase el diccionario de datos.

Se reutiliza `/admin/dashboard/construction/map`, ampliándolo aditivamente. Se agregan lecturas compactas `/admin/dashboard/map/hydrants` y `/admin/dashboard/functional-diagnostics/map`. Filtros parametrizados, bbox opcional completo, límite máximo 2000 por capa y `truncated` explícito; sin fotos, historias ni N+1. El primer encuadre usa datos compactos y luego consulta el área visible, con debounce y cancelación. Las respuestas parciales mantienen las capas disponibles.

La UX incluye clustering/spiderfy, símbolos y etiquetas por dominio, leyenda contextual, búsqueda en servidor, filtros por vista, URL restaurable, panel de resultados accesible y tarjeta de selección con enlaces a expedientes. Móvil prioriza el mapa y la tarjeta inferior; se valida a 1440/768/390. Simulaciones excluidas por defecto y siempre etiquetadas al incluirlas. La política de lectura existente de Construction (`admin|supervisor`) se conserva, con error parcial para viewer en Todos.

Puerta de cierre: pruebas de contratos, roles, validación, consultas SQL Server 2014, filtros, concurrencia, clustering, navegación, responsive y suites normales de ambos repositorios. No se marca CERTIFICADO sin completar las pruebas.

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
| Exportaciones | Implementada en código; pendiente deployment y E2E | XLSX existente ampliado y filtros reales de revisiones/hidrantes | CSV de revisiones y XLSX de hidrantes agregados bajo dashboard | buffers en memoria para el volumen actual; vigilar crecimiento |
| Usuarios | lista API genérica; placeholder UI | `rv.users` y agregados existentes | lista/detalle dashboard y comandos admin explícitos | el móvil autoactualiza identidad; baja lógica, nunca borrado histórico |
| Cuadrillas | lista API genérica; placeholder UI | `rv.crews` | lista/detalle y crear/editar/activar/desactivar | nombres normalizados usados al iniciar sesión móvil |
| Jornadas | lista API genérica; placeholder UI | `rv.work_sessions` | lista/detalle agregado y, sólo si procede, revocación controlada | no editar historia; revocar también tokens de esa jornada |
| Dispositivos | esquema presente; sin ruta admin/UI | `rv.devices` | lista/detalle y bloqueo/desbloqueo auditado | contrato de campo debe respetar `is_blocked`; definir concurrencia sin migrar |
| Mapa global multidominio | IMPLEMENTADO — PENDIENTE DESPLIEGUE API | coordenadas maestras RV, canónicas Construction y GPS funcional representativo | dos lecturas compactas nuevas y extensión de Construction; Leaflet con clustering, bbox, filtros y expedientes | simulaciones excluidas por defecto; sin fotos, históricos, N+1 ni relaciones inventadas |
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
- Mapa: `GET /admin/dashboard/map/hydrants` y `GET /admin/dashboard/functional-diagnostics/map` nuevos; `GET /admin/dashboard/construction/map` reutilizado y ampliado. Vistas Hidrantes, Levantamientos, Diagnósticos y Todos; las tres consultas son compactas, filtrables y acotadas mediante bbox/límite.
- Revisión: consolidar una operación dashboard para `submitted → validated|rejected`, con comentario/código, conflicto 409, historial y auditoría before/after.
- Comparador: inicialmente dos lecturas de detalle y comparación local determinista por `itemCode`; crear endpoint agregado sólo si las mediciones muestran payload o latencia inadecuados.

Los nombres definitivos y cuerpos se fijarán con tests de contrato antes de implementar cada extensión. Viewer recibirá 403 en toda escritura aunque invoque UUID directamente; admin/supervisor sólo podrán ejecutar las operaciones expresamente autorizadas.

## Estrategia API y base de datos

Toda implementación API de Fase 3 se realizará exclusivamente en `feature/fase-3-dashboard-api`, creada desde `main`. No se desarrollará en `main`, no se crearán ramas por módulo y no se mezclarán ramas de otras aplicaciones. El parche de galería `b9dfaef` se auditó mediante patch-id y quedó consolidado de forma aislada como `296acde`; no se hizo merge de `feature/dashboard-fase-2-api`. Nunca se desplegará automáticamente.

La primera opción es resolver sin migración usando las tablas, estados, `row_version`, historial y auditoría existentes. Si aparece una necesidad real de esquema, el entregable será únicamente: documento de necesidad, precheck, SQL idempotente, rollback y pruebas; no se ejecutará. El bloqueo de dispositivo requiere además comprobar que el campo móvil ya rechace `is_blocked`; no se habilitará una UI decorativa sin enforcement API.

Toda escritura crítica usará transacción, autorización por rol, validación Zod, consulta parametrizada, comprobación de entidad/estado, concurrencia optimista o condición equivalente, Problem Details y `rv.audit_log` con actor, acción, entidad, before/after y timestamp. En producción la certificación seguirá siendo sólo lectura hasta autorización explícita.

## Orden de implementación y puertas de calidad

1. Auditoría general y esta línea base.
2. Galería global. **CERTIFICADA.**
3. Exportaciones. **Implementada y probada; pendiente deployment manual de API y E2E productivo.**
4. Usuarios. **Lectura implementada; pendiente comandos, deployment y certificación.**
5. Cuadrillas.
6. Jornadas.
7. Dispositivos.
8. Mapa global multidominio. **IMPLEMENTADO — PENDIENTE DESPLIEGUE API.** Véase `docs/global-map-validation.md` para pruebas y límites de validación local.
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
- Las exportaciones usan consultas set-based y buffers en memoria. El volumen actual no justificó jobs asíncronos; debe reevaluarse si crece de forma material.

## Subetapa 3.2 — Exportaciones

Implementada el 2026-08-27 sin modificar endpoints de campo, esquema ni datos. Se conserva y amplía `GET /api/v1/admin/dashboard/exports/inspections.xlsx`, y se agregan `GET /admin/dashboard/exports/inspections.csv` y `GET /admin/dashboard/exports/hydrants.xlsx`. Los tres requieren autenticación administrativa y admiten `viewer`, `admin` y `supervisor` conforme a la política de lectura vigente.

Las revisiones reutilizan `search`, `userId`, `crewId`, `status`, `from`, `to` y `gps`; los hidrantes reutilizan búsqueda, estado RV, revisado/con revisiones, datos físicos, coordenadas, rango de última revisión y orden permitidos por el listado maestro. La exportación es completa sobre el conjunto filtrado y no acepta paginación. No contiene municipio ni localidad.

Los XLSX incluyen hoja y encabezados legibles, encabezado congelado, autofiltro, anchos, fechas y números tipados. Estado RV y estado exacto de la última revisión permanecen separados; la evidencia se expresa como obligatorias sobre siete y fotos totales. El CSV usa UTF-8 con BOM, CRLF y escape de comillas/saltos. Todo texto con prefijo `=`, `+`, `-` o `@` se antepone con apóstrofo tanto en CSV como XLSX para impedir formula injection.

El dashboard ofrece las tres combinaciones, filtros equivalentes, estados de carga/error/éxito y descarga Blob autenticada. Valida el filename del servidor, usa fallback predecible y revoca el object URL. El harness Edge queda preparado mediante `E2E_CERTIFY_EXPORTS=true`; guardará temporalmente descargas y evidencia en `.artifacts/edge/`, pero no se ejecutará contra producción hasta el deployment manual de API.
- ECharts genera un warning conocido cercano a 535 kB; sólo se cambiarán imports/lazy loading si pruebas visuales y funcionales permanecen estables.

## Subetapa 3.3 — Usuarios

La superficie de lectura se implementó el 2026-08-27 mediante `GET /admin/dashboard/users` y `GET /admin/dashboard/users/:id`, sin migraciones ni cambios al flujo móvil. El listado admite búsqueda parametrizada por nombre/correo/teléfono, cuadrilla, estado activo y presencia de revisiones; limita `pageSize` a 25/50/100 y agrega revisiones, jornadas, sesiones activas, dispositivos y primera/última actividad con consultas set-based. El detalle agrega las diez revisiones y jornadas más recientes y devuelve 404 para UUID inexistente.

El dashboard reemplaza el placeholder con tarjetas responsive, filtros, búsqueda con debounce, paginación, estados de carga/error/vacío y detalle enlazado a revisiones. La identidad conserva los campos reales del esquema; no presenta roles de administración ni datos ficticios. Viewer, admin y supervisor reutilizan la política vigente de lectura administrativa.

Los comandos de alta/edición/estado/asignación permanecen pendientes hasta completar su diseño transaccional, concurrencia por `row_version`, auditoría before/after y pruebas de coexistencia con `/field-sessions/start`. Por ello 3.3 aún no se considera certificada ni habilita escrituras.

## Criterio de certificación

**FASE 3 — CERTIFICADA** sólo será válido cuando todos los módulos estén implementados, viewer/admin funcionen con autorización real, escrituras y auditoría estén probadas, API/frontend/E2E pasen, 1440/768/390 estén certificados, consola/red estén limpias, Flutter conserve sus contratos y todos los commits estén publicados. Si el código API espera despliegue manual, el estado será **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**.


### Ajuste operativo del mapa: estados, revisiones y proximidad (2026-09-17)

- `view=hydrants`: universo del catálogo georreferenciado, con o sin revisiones; color por `rvStatus`. Los filtros y el encuadre siguen delimitando los resultados.
- `view=reviews`: sólo hidrantes con revisiones, usando el mismo endpoint compacto con `hasInspections=true` en servidor. Un punto por ubicación maestra, coloreado por `latestInspectionStatus`; el expediente permite abrir la última revisión. No descarga historiales ni cambia la ubicación por GPS de inspección.
- Levantamientos: color por `status`. Diagnósticos: color por `overallVerdict`. Las formas e iconos mantienen la distinción de dominios; texto y tarjeta explican el estado.
- Leyenda desplegable/retráctil «Colores y estados»: únicamente capas activas y estados presentes en el encuadre, con cantidades. Estados desconocidos tienen una alternativa gris explícita.
- Radio de clustering reducido de 70 a 35 píxeles. Es independiente de la agrupación física de hidrantes.
- Hidrantes cargados con separación estrictamente menor a 4 metros se agrupan visualmente por componentes conectados; incluye ubicaciones idénticas y cadenas de vecinos. La coordenada representativa es la del primer identificador ordenado, no un promedio. No se fusionan registros de base de datos ni otros dominios.
- El punto agrupado muestra cantidad y permite seleccionar cada cuenta/expediente. Conserva el color cuando el estado es común; estados distintos usan gris oscuro y leyenda explícita. Los clusters contabilizan registros originales. La agrupación se recalcula con filtros/encuadre sobre la respuesta acotada existente.
- No se requieren cambios adicionales de API, migraciones ni reinicio del backend para este ajuste.


Ajuste incremental posterior solicitado: radio de clustering reducido nuevamente de 35 a **17,5 px** (la cuarta parte de los 70 px originales). Se mantiene la regla independiente de hidrantes a menos de 4 metros.


### Carga por vista y actualización manual (2026-09-17)

Por solicitud operativa se elimina la recarga de datos al mover o cambiar el zoom. El frontend consulta una instantánea compacta por vista/filtros, sin bbox, y mantiene esos puntos en memoria mientras se explora. El encuadre actualiza localmente resultados, leyenda y contadores; no vuelve a consultar la API. `Ver conjunto` sólo ajusta la cámara. `Actualizar` consulta nuevamente las capas activas con los filtros vigentes, conserva el encuadre y mantiene la instantánea anterior con aviso si falla la recarga. Cambiar vista/filtros realiza una nueva consulta; no es una caché persistente entre rutas.

Se mantienen límites de 2.000 por capa y advertencia de truncamiento: en ese caso deben aplicarse filtros, acercar el mapa ya no descarga datos adicionales. Los endpoints conservan soporte de bbox para otros consumidores. No se modificó API.

Radio de clustering actual: **8,75 px**, otro 50% menos que 17,5 px. La agrupación geográfica de hidrantes a menos de 4 m permanece igual.
