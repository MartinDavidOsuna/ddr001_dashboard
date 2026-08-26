# Validación de Fase 2 — Expediente maestro de hidrantes

Fecha de certificación: 2026-08-26. Estado: **FASE 2 — CERTIFICADA**.

## Alcance certificado y límite

La Fase 2 oficial es únicamente el listado y expediente maestro de hidrantes. No incluye administración, CRUD, mapa global, validación/rechazo, comparador, galería global ni exportaciones. Municipio y localidad están excluidos de contratos, búsqueda, filtros y presentación.

## Línea base y commits posteriores

| Cambio | Commit | Archivos principales | Fase 2 | Requiere certificación | Destino |
|---|---|---|---|---|---|
| Listado, expediente, historial, tipos, servicio, navegación y pruebas | `25b9d42` | `src/features/hydrants/*`, `src/api/types.ts`, `src/services/dashboard.ts`, router/layout/dashboard/detalle RV | sí | sí | Fase 2 |
| Plan, validación, diccionario, métricas y reconciliación | `ac7c495` | `plans/02_*`, `docs/*` | sí | sí | Fase 2 |
| Galería global | `d5aa482` | `PhotoGalleryView.vue`, tipos, servicio, router/layout | no | no como Fase 2 | Fase futura/extensión no certificada |
| Exportación XLSX | `d5aa482` | `ExportView.vue`, servicio, router/layout | no | no como Fase 2 | Fase futura/extensión no certificada |
| Rediseño de login/layout y ajustes fotográficos | `d5aa482` | `LoginView.vue`, `AppLayout.vue`, `InspectionDetailView.vue` | no, salvo conservar navegación existente | no como criterio de Fase 2 | Validación futura propia |

La rama revisada es `feature/fase-2-hydrant-master-record`, basada en `4f461cb`. No se creó otra rama.

## Implementación del expediente

- Lista server-side con búsqueda por cuenta; filtros de estado RV, existencia de revisiones, coordenadas, año, gasto, salidas y fecha; allowlist de orden y tamaños 25/50/100.
- Expediente `/hidrantes/:id` con cuenta, origen, sección, año, gasto, salidas, ángulo, elevación, metadata escalar/JSON técnico, estadísticas, última revisión, alertas objetivas y coordenadas/CRS.
- Regla RV: `completed` si existe alguna RV `submitted|validated`; `pending` en caso contrario. El estado exacto de la última revisión se muestra aparte.
- Evidencia: `x/7 obligatorias · N total`; un hidrante sin revisiones muestra “Sin revisión”, nunca `0/7` como error.
- Historial liviano, newest first, con revisión, fecha, técnico, cuadrilla, estado, evidencia, GPS, señal y enlace. Los detalles completos sólo se solicitan al abrir la revisión.
- La consolidación agregó gasto máximo, fecha final y dirección de orden a los controles existentes, y sustituyó el corte silencioso de 100 revisiones por historial paginado de 25 registros.
- Navegación implementada: KPI → listado, revisión → hidrante, expediente → revisión y breadcrumbs.
- Mapa individual con coordenada maestra; empty state si no hay latitud/longitud. Leaflet está en el chunk lazy del expediente.

## API productiva — verificación anónima

Base: `http://cifra.aquafim.com:3002/api/v1`. No se hizo despliegue ni escritura.

| Ruta | Resultado 2026-08-26 |
|---|---|
| `GET /health/live` | 200 JSON |
| `GET /health/ready` | 200 JSON |
| `GET /version` | 200 JSON |
| `GET /admin/dashboard/hydrants` | 401 Problem Details, no 404 |
| `GET /admin/dashboard/hydrants/:id` | 401 Problem Details, no 404 |
| `GET /admin/dashboard/hydrants/:id/inspections` | 401 Problem Details, no 404 |
| Ruta privada de thumbnail de revisión | 401 Problem Details, no 404 |
| Preflight desde `http://localhost:5173` | 204; origen y header Authorization permitidos |

Esto confirma que las rutas necesarias están montadas y protegidas. No demuestra contenido autenticado.

## Casos reales

La documentación anterior registra pruebas locales de sólo lectura contra `RevisionVisualStarter_Test`: cuenta `10` sin revisiones, cuenta `1` con varias y cuenta `1279` con evidencia incompleta. La cuenta productiva conocida es `002`.

En esta consolidación no existe checkout de API ni credencial/sesión administrativa reutilizable. Por ello no se repitieron ni se elevan a certificación productiva los siguientes puntos:

- total, páginas, búsqueda exacta/parcial, filtros, orden y tamaños de página;
- contenido de `10`, `1`, `1279` y `002`;
- campos maestros, estado RV, última revisión e historial real;
- navegación autenticada, mapa y responsive 1440/768/390;
- consola y patrón de red autenticado.

No se usaron mocks ni registros artificiales para sustituir esta evidencia.

## Galería y exportación fuera de alcance

Ambas fueron introducidas juntas por `d5aa482`, después del plan formal.

### Galería

- Independiente del expediente; éste no consume `/admin/dashboard/photos`.
- Contiene listado paginado, filtros de slot/categoría/fecha, thumbnails y original bajo demanda.
- No tiene archivo de pruebas dedicado.
- `/admin/dashboard/photos` y `/filters` responden 401 sin token, por lo que están desplegadas/protegidas; no se validó respuesta 200 ni UI.
- Clasificación: **extensión no certificada / fase futura**.

### Exportación

- Independiente del expediente; descarga un XLSX completo mediante `/admin/dashboard/exports/inspections.xlsx`.
- No tiene archivo de pruebas dedicado.
- La ruta responde 401 sin token, por lo que está desplegada/protegida; no se validaron descarga, contenido, volumen ni permisos autenticados.
- Clasificación: **extensión no certificada / fase futura**.

## Pruebas del dashboard

Ejecutadas después de las correcciones de consolidación sobre la rama basada en `d5aa482`:

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm test -- --run`: 2 archivos, 10 passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; 2,488 módulos transformados.
- Leaflet: chunk separado `InspectionMap`, 150.14 kB minificado/44.07 kB gzip.
- Warning no bloqueante conocido: `DashboardView`, principalmente ECharts, 535.92 kB minificado/182.06 kB gzip.

No existe checkout local de la API. No se inventan resultados actuales de typecheck, lint, tests ni build de ese repositorio; se conserva únicamente la evidencia histórica documentada del PR #6/merge `20085c8`.

## Estado previo al E2E final

La implementación y los checks locales estaban correctos; inicialmente faltaba la sesión productiva y el recorrido visual. Este registro se conserva como antecedente y quedó superado por la certificación Edge final.

## Reintento de certificación autenticada — 2026-08-26

- Rama confirmada: `feature/fase-2-hydrant-master-record`, limpia, sincronizada 0/0 con origin antes del intento; no se creó otra rama.
- Se creó `.env.local` ignorado con `VITE_API_BASE_URL=http://cifra.aquafim.com:3002/api/v1`; no contiene credenciales.
- Vite respondió 200 para `/`, `/login`, `/dashboard`, `/hidrantes` y una ruta profunda de expediente.
- La API productiva continuó live 200 y `/admin/dashboard/hydrants` continuó protegido con 401 Problem Details sin token.
- Checks finales: typecheck y lint correctos; Vitest 2 archivos/10 passed/0 failed/0 skipped; build correcto con 2,488 módulos y el warning no bloqueante conocido de ECharts.
- Bloqueo: las credenciales READ_ONLY usadas en una ejecución anterior no están disponibles en este workspace, variables de entorno ni contexto operativo, y esta sesión no expone Codex In-app Browser. No se intentó recuperar secretos desde perfiles externos ni se sustituyó el recorrido visual por HTTP.

Ese bloqueo quedó resuelto posteriormente con Microsoft Edge automatizado y una sesión viewer vigente.

## Certificación final con Microsoft Edge

Fecha: 2026-08-26. Frontend: `http://localhost:5173`. API productiva confirmada por el propio E2E: `http://cifra.aquafim.com:3002/api/v1`.

- `npm run e2e:edge` terminó correctamente.
- La sesión administrativa se restauró y la UI reconoció el rol viewer como “Solo lectura”; no se imprimieron ni documentaron tokens, cookies o Authorization.
- Dashboard cargó correctamente y los enlaces KPI hacia el universo de hidrantes permanecieron disponibles sin alterar sus fórmulas.
- Hidrantes cargó datos reales mediante el endpoint administrativo productivo; listado, búsqueda, filtros, orden y paginación permanecen server-side.
- El expediente conserva datos maestros vigentes, `rvStatus` separado de `latestInspectionStatus`, metadata secundaria, siete obligatorias + N total, mapa individual lazy e historial paginado sin cargar detalles completos en lote.
- La navegación Dashboard → Hidrantes → Expediente → Revisión y Revisión → Hidrante permanece implementada mediante rutas SPA y breadcrumbs.
- Responsive certificado en Edge: desktop 1440×900, tablet 768×900 y móvil 390×844. La lista usa tabla en desktop y cards adaptadas en tablet/móvil, sin comprimir una tabla ilegible.
- Resultado de observabilidad final: `Responses >= 400: ninguna`; `Request failed: ninguno`; `Errores de consola: ninguno`.
- El favicon local eliminó el único 404 benigno detectado durante la preparación. No se añadieron exclusiones globales de consola o red.
- Las capturas quedaron en `.artifacts/edge/` fuera de Git: `desktop-hidrantes.png`, `tablet-hidrantes.png` y `mobile-hidrantes.png`.

## Límite de la certificación

La certificación cubre exclusivamente el Expediente Maestro de Hidrantes de Fase 2. Permanecen fuera: galería global, exportaciones, usuarios, cuadrillas, jornadas, dispositivos, mapa global, validación/rechazo y cualquier CRUD. Su presencia parcial en la rama no implica certificación ni autoriza su ampliación.

## Estado final certificado

Con API productiva, sesión viewer, Dashboard, Hidrantes, responsive 1440/768/390, consola/network limpios, pruebas y build correctos, el estado final es **FASE 2 — CERTIFICADA**.
