# Mapa Global multidominio — entrega local

Fecha: 2026-09-17. Estado: **IMPLEMENTADO — PENDIENTE DESPLIEGUE API**. No se hizo push, merge, rebase, reset, despliegue ni migración. No se crearon clones ni worktrees.

## A. Baseline

| Campo | Dashboard | API |
|---|---|---|
| Repo oficial | https://github.com/MartinDavidOsuna/ddr001_dashboard.git | https://github.com/MartinDavidOsuna/ddr001_api.git |
| Clon local | `C:\DEV\AQAGS\ddr001_dashboard` | `C:\DEV\AQAGS\ddr001_api_rv` |
| Rama inicial | `feature/functional-diagnostics-dashboard` | `feature/fase-3-dashboard-api` |
| SHA inicial | `2b335cbcdfeaefb67214804fbfa687af815e618a` | `66f767378975b3adbf6a346f9d66c7b63fbf6ab8` |
| Rama final | `feature/global-multidomain-map` | `feature/global-map-api` |
| SHA final | `2b335cbcdfeaefb67214804fbfa687af815e618a` | `66f767378975b3adbf6a346f9d66c7b63fbf6ab8` |

Se ejecutaron status, branch, remote y fetch --all --prune en ambos clones. Las ramas nuevas se crearon con `git switch -c` desde el HEAD local sin cambiar el contenido de trabajo. No se hicieron commits: los SHA permanecen iguales y los cambios son revisables en el working tree. Se preservaron los cambios previos de Diagnósticos, retiros RV y demás trabajos. El diff de Field API se comparó con el baseline y permanece idéntico.

## B. Documentación actualizada

- `plans/03_fase_3_cierre_funcional.md`: definición multidominio previa a implementación, fuentes, restricciones, endpoints, UX, pruebas y estado final.
- `docs/dashboard-data-dictionary.md`: coordenadas maestras RV, canónicas Construction y selección GPS funcional; simulación, desempates, procedencia, fechas, límites y roles.
- `docs/fase-3-validation.md`: actualización de las matrices de Mapa y enlace al corte vigente, conservando el contexto histórico.
- `docs/global-map-validation.md`: este reporte, baseline, pruebas, archivos, pendientes y Git.
- API `docs/global-map.md`: contrato completo, semántica y reproducción de pruebas TEST.
- API `docs/openapi.yaml`: queries y respuestas tipadas de las tres rutas, autorización, bbox, límite, errores y GPS representativo.

`docs/functional-diagnostics-validation.md` ya estaba modificado antes de Mapa y se conserva sin cambios adicionales de esta tarea.

## C. Endpoint reutilizado

`GET /api/v1/admin/dashboard/construction/map`. Conserva su ruta, campos existentes y política de lectura admin/supervisor. No se duplicó bajo otro namespace.

## D. Endpoints creados

1. `GET /api/v1/admin/dashboard/map/hydrants`.
2. `GET /api/v1/admin/dashboard/functional-diagnostics/map`.

## E. Endpoint ampliado

`GET /api/v1/admin/dashboard/construction/map`:

- Filtros añadidos: `search`, `stage`, `contractorId`, `crewId`, `north`, `south`, `east`, `west`, `limit`; alias `status=in_process`. Mantiene status/from/to.
- Campos añadidos: `accountNumber`, `contractorUserId`, `crewId`, `createdAt`, `updatedAt`; metadata de respuesta `limit`, `truncated`.
- Motivo: búsqueda operativa, filtros equivalentes al listado, tarjeta útil y carga acotada. Comparte campos Zod y predicado de filtros con el listado de levantamientos. El mapa deja de agregar fotos que no necesita.
- Límite: ahora hasta 2.000 elementos por respuesta, explícitamente señalados por `truncated`; los consumidores deben acotar área/filtros si se alcanza.

## F. Dashboard — archivos

Creados:

```text
src/features/map/MapView.vue
src/features/map/MapCanvas.vue
src/features/map/MapPopupCard.vue
src/features/map/map.types.ts
src/features/map/map.filters.ts
src/features/map/map.api.datasource.ts
src/features/map/map.state.ts
src/features/map/map.markers.ts
src/features/map/map.css
src/features/map/map.test.ts
scripts/global-map-ui-e2e.mjs
docs/global-map-validation.md
```

Modificados: `src/router/index.ts`, `package.json`, `package-lock.json`, `plans/03_fase_3_cierre_funcional.md`, `docs/dashboard-data-dictionary.md`, `docs/fase-3-validation.md`.

`/mapa` es una ruta lazy real. Vista, búsqueda, capas y filtros se restauran desde query string. Todos conserva estados por capa, cancelación y generaciones de requests. Bbox usa debounce de 350 ms; el primer fit espera las capas, evitando encuadrar sólo la primera respuesta. Resultados paginados localmente de 50 en 50 sobre el conjunto compacto cargado; la búsqueda se ejecuta en servidor. La selección comparte una única identidad y sincroniza tarjeta, lista y marker. ResizeObserver y listeners se limpian al salir.

Leaflet existente + [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster), con clustering, expansión de grupos, spiderfy para coincidencias y retirada de markers fuera de vista. SVG estático propio para gota/casco/actividad; datos externos sólo como texto. Tiles OpenStreetMap con atribución. E2E intercepta tiles y toda la API; no depende de servicios externos.

## G. API — archivos de esta tarea

Creados:

```text
src/modules/admin/map.schemas.ts
src/modules/admin/map.repository.ts
src/modules/admin/map.routes.ts
tests/unit/global-map.test.ts
tests/unit/global-map-openapi.test.ts
tests/integration/global-map.integration.test.ts
tests/integration/global-map-sql.integration.test.ts
scripts/certify-global-map-readonly.ts
docs/global-map.md
```

Modificados: `src/modules/admin/admin.routes.ts` (montaje), `src/modules/admin/construction-admin.routes.ts` (reutilización de filtros y consulta compacta), `docs/openapi.yaml`.

Los demás archivos modificados/no rastreados del status API proceden del baseline, incluida la integración funcional y sus migraciones históricas. Mapa no modifica `src/modules/api.routes.ts`, rutas Field, autenticación compartida ni tablas persistentes.

## H. Pruebas

| Validación | Resultado |
|---|---|
| Dashboard typecheck | PASS |
| Dashboard lint | PASS, sin errores ni warnings |
| Dashboard tests | PASS: 119 tests, 24 archivos (22 tests nuevos) |
| Dashboard build | PASS; warning previo de ECharts >500 kB |
| Dashboard E2E | PASS: 5 escenarios — admin 1440/768/390; viewer y supervisor 1440. API y tiles interceptados; sin errores JS ni scroll horizontal. |
| API type-check | PASS |
| API lint | PASS |
| API tests | PASS: 363 tests, 56 archivos (8 unitarios nuevos) |
| API build | PASS |
| API integration normal | PASS: 17 tests; 43 omitidos por flags de integración SQL/fixtures externas en esa ejecución |
| SQL de Mapa explícito | PASS: 6 tests sobre conexión TEST, compatibilidad 120, tablas temporales y rollback |
| Lectura TEST existente | PASS: cinco consultas reales de repositorio, sin escrituras |
| git diff --check | PASS en ambos repositorios |

El SQL de Mapa usa la misma consulta del repositorio, redirigiendo las tablas a fixtures temporales de la conexión. Verifica selección de GPS determinista, muestras múltiples, simulación, BLE, datos nulos/fuera de rango, (0,0), antimeridiano, fechas, filtros, búsqueda maliciosa y límites. La suite HTTP no SQL ejecuta middleware JWT real con pool simulado: sin token 401; viewer/supervisor/admin según política; filtros/bbox/límites inválidos 422; parámetros aislados de SQL; sin N+1 ni payloads de fotos/evidencias.

E2E: login, ruta real, selección desde lista/marker, enlace al expediente RV y regreso, filtros de etapa y Bluetooth, simulación por defecto/explícita, tres capas/toggles, clusters/spiderfy, selección sincronizada, empty/error/partial error, búsqueda en servidor y URL, aviso de truncamiento y stress de 1.800 puntos (<200 markers DOM, render <10 s). Cada recorrido produjo 29–32 requests, sin tormenta de consultas. Capturas revisadas en `.artifacts/global-map-ui/admin-1440.png`, `admin-768.png`, `admin-390.png`; resultados en `results.json`. Las pruebas cubren selección durante cambios de encuadre y limpieza del mapa al navegar.

La lectura TEST existente encontró 1.178 hidrantes y 21 levantamientos con GPS. Diagnósticos: 0 casos con GPS en `exclude`, 2 en `include`, 0 en BLE físico. Esto no equivale a ausencia de casos: los 21 diagnósticos existentes no tienen GPS físico elegible. No se generaron coordenadas ni registros para aparentar cobertura. Mediciones orientativas en esta máquina: 217 ms / 440.771 bytes RV; 43 ms / 9.511 bytes Construction; 119 ms / 1.349 bytes Diagnósticos include (sin incluir calentamiento de conexión). No es un benchmark productivo.

Comandos reproducibles:

```powershell
# Dashboard
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e:global-map
git diff --check
# API (desde su clon)
npm run type-check
npm run lint
npm test
npm run test:integration
npm run build
$env:RUN_GLOBAL_MAP_SQL='true'
npx vitest run tests/integration/global-map-sql.integration.test.ts
npx tsx scripts/certify-global-map-readonly.ts
git diff --check
```

## I. CAMBIOS NUEVOS REALIZADOS EN API PARA SOPORTAR MAPA

### Endpoint: GET /admin/dashboard/map/hydrants

- Razón: el listado maestro está paginado y agrega datos que el mapa no necesita.
- Datos: ubicación maestra, cuenta, estado RV, revisado, número/última revisión, técnico/cuadrilla, gasto/año.
- Filtros: búsqueda de cuenta, RV, revisado, con revisiones, instalación, gasto, fecha última RV, bbox y límite.
- Tests: unitarios Zod/OpenAPI; HTTP sin token/tres roles/validación/inyección; SQL TEST con coordenadas, filtros, antimeridiano y límite; E2E.
- Impacto: ruta administrativa nueva de sólo lectura; ninguna modificación Field o esquema.
- Requiere despliegue antes del frontend: **SÍ**.

### Endpoint: GET /admin/dashboard/functional-diagnostics/map

- Razón: el listado funcional no ofrece GPS representativo compacto.
- Datos: un punto por caso, muestra GPS elegida y procedencia, medidor/veredicto/técnico/banco, fuentes/BLE, simulación, conteos, integridad y revisión.
- Filtros: reutiliza campos administrativos funcionales, bbox y límite; simulación excluida por defecto.
- Tests: Zod/OpenAPI, autenticación/tres roles, HTTP parametrizado, SQL con múltiples muestras y empates, simulaciones, caso sin GPS, BLE y filtros; E2E.
- Impacto: lectura aislada sin relaciones a hidrantes ni recalcular veredictos; no cambia endpoints funcionales existentes.
- Requiere despliegue antes del frontend: **SÍ**.

### Endpoint: GET /admin/dashboard/construction/map (ampliación)

- Razón: alinear mapa/listado y evitar carga ilimitada y agregación de fotos.
- Datos/filtros: ampliaciones exactas en E; se preserva el contrato previo y autorización admin/supervisor.
- Tests: mismos controles generales; SQL con ubicación canónica, filtros compartidos y nulos; E2E y viewer 403.
- Impacto: cambios aditivos y límite explícito; ninguna escritura ni migración.
- Requiere despliegue antes del frontend: **SÍ**.

## J. Pendientes reales

- Publicación/despliegue deliberadamente no ejecutados. La API que sirva al dashboard debe incorporar estos cambios antes de publicar el frontend. El proceso local iniciado antes de esta tarea no se reinició ni reemplazó.
- Capturas funcionales con GPS físico deberán existir para que el filtro Reales muestre puntos; los casos sin ubicación siguen accesibles en Diagnósticos.
- Las pruebas UI usan fixtures aislados; no se declara certificación productiva.

## K. Git al cierre

Se adjuntan abajo las salidas de `git status --short` y `git log --oneline -10` de ambos clones. Incluyen explícitamente el trabajo previo preservado.

### Dashboard - git status --short

```text
 M docs/dashboard-data-dictionary.md
 M docs/fase-3-validation.md
 M docs/functional-diagnostics-validation.md
 M package-lock.json
 M package.json
 M plans/03_fase_3_cierre_funcional.md
 M src/router/index.ts
?? docs/global-map-validation.md
?? scripts/global-map-ui-e2e.mjs
?? src/features/map/
```

### Dashboard - git log --oneline -10

```text
2b335cb test(diagnostics): certify contracts and responsive UI for release 0.3.0
5d2469c feat(diagnostics): add technical dossier, metrics, reviews and access UI
b715d84 feat(diagnostics): add audited API contract and authenticated data source
fe6d659 chore: preserve local RV cleanup and dashboard improvements
53c3f06 Merge pull request #1 from MartinDavidOsuna/feature/construction-dashboard-ui
271ca94 test(construction-ui): certify real API browser workflow
28ce052 test(construction-ui): cover API adapters and final modes
777d108 feat(construction-ui): complete server-driven admin integration
f5f0098 fix(construction-e2e): repair auth bootstrap and responsive assertions
f63823f feat(construction-ui): connect administrative API data source
```

### API - git status --short

```text
 M .env.example
 M docs/openapi.yaml
 M package-lock.json
 M package.json
 M src/app.ts
 M src/modules/admin/admin.routes.ts
 M src/modules/admin/construction-admin.routes.ts
 M src/modules/admin/dashboard-export.routes.ts
 M src/modules/admin/dashboard-hydrants.routes.ts
 M src/modules/admin/dashboard-photo.routes.ts
 M src/modules/admin/dashboard-users.routes.ts
 M src/modules/api.routes.ts
 M src/modules/idempotency/idempotency.middleware.ts
 M src/shared/schemas.ts
 M tests/integration/sql-migrations.integration.test.ts
 M tests/integration/sql-rollbacks.integration.test.ts
 M tests/integration/sql/migration-manifest.ts
 M tests/setup.ts
 M tests/unit/sql-migration-runner.test.ts
?? database/migrations/20260902_functional_diagnostics_domain.sql
?? database/migrations/20260902_functional_diagnostics_domain_rollback.sql
?? database/migrations/20260915_rv_dashboard_withdrawals.sql
?? database/migrations/20260915_rv_dashboard_withdrawals_rollback.sql
?? docs/functional-diagnostics-online-contract.md
?? docs/global-map.md
?? docs/rv-dashboard-withdrawals.md
?? scripts/certify-global-map-readonly.ts
?? scripts/migrate-dashboard-withdrawals.ts
?? src/modules/admin/dashboard-checklist.ts
?? src/modules/admin/inspection-withdrawal.routes.ts
?? src/modules/admin/inspection-withdrawal.service.ts
?? src/modules/admin/map.repository.ts
?? src/modules/admin/map.routes.ts
?? src/modules/admin/map.schemas.ts
?? src/modules/functional-diagnostics/
?? tests/integration/dashboard-withdrawal.integration.test.ts
?? tests/integration/functional-diagnostics-admin.integration.test.ts
?? tests/integration/functional-diagnostics-flow.integration.test.ts
?? tests/integration/global-map-sql.integration.test.ts
?? tests/integration/global-map.integration.test.ts
?? tests/unit/dashboard-checklist.test.ts
?? tests/unit/dashboard-inspection-filters.test.ts
?? tests/unit/functional-diagnostics-admin.test.ts
?? tests/unit/functional-diagnostics-migration.test.ts
?? tests/unit/functional-diagnostics.test.ts
?? tests/unit/global-map-openapi.test.ts
?? tests/unit/global-map.test.ts
?? tests/unit/inspection-withdrawal.test.ts
```

### API - git log --oneline -10

```text
66f7673 Merge pull request #14 from MartinDavidOsuna/fix/resident-company-independent-login
534fac8 fix(auth): allow resident cross-company login
3413f81 Merge pull request #13 from MartinDavidOsuna/feature/construction-company-ownership
80301b8 ci: validate api pull requests
9493ac7 feat(construction): scope contractor surveys by company
4f53aa6 Merge pull request #12 from MartinDavidOsuna/feature/construction-admin-dashboard-api
ab49485 docs(construction): record integrated SQL TEST certification
78af54b feat: add dashboard user read model
fa49d3e test(construction-admin): certify SQL TEST contracts
5056a61 test(construction): make local TEST certification portable
```


## Ajuste solicitado: estados, vista Revisiones y agrupación (2026-09-17)

Implementado sobre la misma rama y los cambios locales anteriores:

- Hidrantes conserva el universo con coordenadas. Revisiones utiliza `view=reviews` y `hasInspections=true` en servidor, representando el estado de la última revisión. Volver a Hidrantes elimina restricciones RV heredadas de la otra vista.
- Colores por estado para cada dominio; formas e iconos se conservan. Leyenda plegable contextual con estados presentes en el encuadre; filtros avanzados también limitados a capas activas.
- Clustering de 35 px (antes 70 px). Hidrantes a menos de 4 m se representan por un solo punto con cantidad y selector de cuentas. Estados mezclados se identifican expresamente. No se borran ni fusionan registros; otros dominios siguen separados.
- Algoritmo geográfico determinista con rejilla tridimensional, componentes conectados, soporte de polos/antimeridiano y coordenada original representativa. Casos exactamente a 4 m permanecen separados; agrupación aplicada a datos cargados por filtros/encuadre.
- Archivos nuevos: `src/features/map/map.colors.ts`, `map.grouping.ts`, `map.grouping.test.ts`. Actualizados componentes, modelos, adaptación, filtros, estilos, tests y harness E2E del mapa.
- Typecheck, lint y build aprobados. Suite frontend: **131 tests, 25 archivos**; de ellos **34 tests del mapa**. `git diff --check` aprobado. Advertencia preexistente de tamaño de ECharts en build.
- E2E cubre selección de cuentas agrupadas, estados y plegado de leyenda, filtro servidor de Revisiones y retorno al universo, además de los recorridos previos.
- Sin cambios adicionales de API ni migraciones para este ajuste. La API local ya fue reiniciada en la tarea anterior (puerto 3000); el dashboard de desarrollo continúa en 5173. Sin push ni despliegue remoto.

- Resultado E2E final: cinco escenarios aprobados (admin 1440/768/390, viewer y supervisor 1440), sin errores de JavaScript ni desbordamiento horizontal. Las esperas verifican estados visibles tras el debounce.
- Verificación HTTP real a través del dashboard: Hidrantes 200 con 1.178 registros; Revisiones 200 con 518 registros. Incluye colores para estados reales `submitted`, `in_progress` y `conflict` (En conflicto, naranja).


Ajuste incremental posterior solicitado: radio de clustering reducido nuevamente de 35 a **17,5 px** (la cuarta parte de los 70 px originales). Se mantiene la regla independiente de hidrantes a menos de 4 metros.


### Carga por vista y actualización manual (2026-09-17)

Por solicitud operativa se elimina la recarga de datos al mover o cambiar el zoom. El frontend consulta una instantánea compacta por vista/filtros, sin bbox, y mantiene esos puntos en memoria mientras se explora. El encuadre actualiza localmente resultados, leyenda y contadores; no vuelve a consultar la API. `Ver conjunto` sólo ajusta la cámara. `Actualizar` consulta nuevamente las capas activas con los filtros vigentes, conserva el encuadre y mantiene la instantánea anterior con aviso si falla la recarga. Cambiar vista/filtros realiza una nueva consulta; no es una caché persistente entre rutas.

Se mantienen límites de 2.000 por capa y advertencia de truncamiento: en ese caso deben aplicarse filtros, acercar el mapa ya no descarga datos adicionales. Los endpoints conservan soporte de bbox para otros consumidores. No se modificó API.

Radio de clustering actual: **8,75 px**, otro 50% menos que 17,5 px. La agrupación geográfica de hidrantes a menos de 4 m permanece igual.

Validación de la carga manual: typecheck, lint, build y `git diff --check` aprobados; **133 tests en 25 archivos**. Nuevas regresiones comprueban que cambios de encuadre y `Ver conjunto` no consultan API, que `Actualizar` consulta sin bbox y que los puntos sobreviven a errores de recarga. El harness E2E verifica ausencia de solicitudes después de zoom/recentrado y mantiene la prueba con 1.800 puntos.

E2E final de carga manual: **5/5 aprobados**, admin 1440/768/390, viewer y supervisor 1440; sin consultas por zoom/recentrado. Zoom sin transiciones pendientes para mantener la selección estable al expandir puntos coincidentes. Build final aprobado tras este ajuste.
