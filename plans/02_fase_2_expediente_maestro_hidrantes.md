# Fase 2 — Expediente maestro de hidrantes

Estado: **FASE 2 — CERTIFICADA**. Inicio: 2026-08-13. Certificada: 2026-08-26.

## Alcance oficial

La Fase 2 comprende exclusivamente el listado maestro paginado de hidrantes activos y su expediente administrativo de lectura: búsqueda, filtros, ordenamiento y paginación server-side; datos maestros vigentes; coordenadas y mapa individual; estado RV; estadísticas básicas; última revisión; alertas objetivas; metadata; historial completo; navegación revisión ↔ hidrante; enlaces de KPI al listado y responsive 1440/768/390.

Municipio y localidad permanecen excluidos. No forman parte de esta fase CRUD, usuarios, cuadrillas, jornadas, dispositivos, mapa global, validación/rechazo, comparador de revisiones, nuevas exportaciones ni otras escrituras.

## Modelo y reglas vigentes

- Maestro: `rv.hydrants`; identificación operativa `account_number`.
- Revisiones RV: `rv.inspections`; técnico de `rv.users` y cuadrilla histórica de `rv.work_sessions`/`rv.crews`.
- Evidencia: siete slots obligatorios más N fotografías totales de `rv.photos`.
- GPS y señal pertenecen a la revisión; las coordenadas maestras pertenecen al hidrante.
- `rvStatus=completed` cuando existe al menos una RV en `submitted` o `validated`; en otro caso es `pending`.
- `latestInspectionStatus` conserva por separado el estado exacto de la revisión más reciente.
- El KPI “revisados” mantiene su fórmula certificada (`submitted|validated|rejected`) y no se debe confundir con `rvStatus`.

## Endpoints de Fase 2

- `GET /api/v1/admin/dashboard/hydrants`: lista, búsqueda, filtros, ordenamiento y paginación server-side.
- `GET /api/v1/admin/dashboard/hydrants/:id`: maestro, agregados y última revisión.
- `GET /api/v1/admin/dashboard/hydrants/:id/inspections`: historial paginado y liviano, más reciente primero.
- Rutas privadas de miniatura/contenido de Fase 1: sólo se usan al abrir una revisión; el expediente no descarga fotos.

El endpoint de campo `/hydrants` no se reutiliza: su autorización y contrato permanecen congelados. No se requiere DDL, migración ni cambio Flutter.

## Implementación presente

- `25b9d42`: listado, expediente, tipos/servicio, transformadores, pruebas, rutas, navegación cruzada y enlaces KPI.
- `ac7c495`: plan, diccionario, métricas, reconciliación Figma y registro inicial de validación.
- API documentada: PR #6, merge `20085c8`; endpoints aditivos de sólo lectura.
- Producción al 2026-08-26: live/ready 200; lista, detalle e historial responden 401 Problem Details sin token, no 404; CORS localhost responde 204.

## Consultas y rendimiento

La implementación API documentada usa CTE, funciones de ventana, agregados set-based, `OFFSET/FETCH`, parámetros tipados y allowlist de ordenamiento compatibles con SQL Server 2014. La lista realiza una petición por página. El expediente realiza una petición de maestro y otra de historial; no solicita detalle de cada revisión ni fotografías. Leaflet queda dentro del chunk lazy del expediente.

## Casos obligatorios de certificación

- Cuenta `10`: sin revisiones.
- Cuenta `1`: múltiples revisiones.
- Cuenta `1279`: última evidencia incompleta.
- Cuenta `002`: caso productivo conocido.
- Lista: primera y otra página; búsqueda exacta/parcial; `pending`, `completed`, con/sin revisiones; filtros, orden y tamaños 25/50/100.
- Expediente: campos vigentes, regla RV, última revisión separada, 7 obligatorias + N total, coordenadas/CRS, mapa/empty state, metadata e historial newest first.
- Navegación: Dashboard → Hidrantes → Expediente → Revisión; Revisión → Hidrante; KPI total/revisados/pendientes → lista filtrada.
- Responsive y operación real: 1440, 768 y 390 px; consola/red sin errores, CORS, N+1, secretos ni descarga masiva de fotos.

## Pruebas ejecutadas el 2026-08-26

- Dashboard `npm run typecheck`: correcto.
- Dashboard `npm run lint`: correcto.
- Dashboard `npm test -- --run`: 2 archivos, 10 passed, 0 failed, 0 skipped.
- Dashboard `npm run build`: correcto, 2,488 módulos; warning no bloqueante conocido de ECharts (535.92 kB minificado).
- API: no existe checkout local disponible; no se atribuyen pruebas nuevas.
- HTTP anónimo: lista, detalle, historial y rutas privadas de foto devuelven 401 Problem Details; ninguna devuelve 404. CORS desde `http://localhost:5173`: 204.

## Bloqueo histórico resuelto

En intentos anteriores no había una sesión administrativa reutilizable ni navegador automatizado. El bloqueo quedó resuelto mediante `playwright-core`, Microsoft Edge local y un refresh token viewer inyectado sólo en el proceso, nunca versionado ni impreso.

La certificación final usó frontend `http://localhost:5173` y API productiva `http://cifra.aquafim.com:3002/api/v1`. `npm run e2e:edge` confirmó backend administrativo, sesión viewer, Dashboard, Hidrantes y responsive 1440/768/390, sin responses HTTP >=400, requests fallidos ni errores de consola.

## Funciones detectadas fuera de alcance

El commit posterior `d5aa482` agregó una galería administrativa global y una exportación XLSX de revisiones, además de cambios visuales en login/layout y ajustes menores de integración. Son independientes del expediente y no son requisito ni parte certificada de Fase 2.

- Galería: `/fotografias`, `PhotoGalleryView.vue`, tipos/servicio y rutas `/admin/dashboard/photos` y `/filters`. No tiene pruebas dedicadas. La ruta productiva está montada/protegida (401 anónimo), pero no se certificó autenticada.
- Exportación: `/exportaciones`, `ExportView.vue` y `/admin/dashboard/exports/inspections.xlsx`. No tiene pruebas dedicadas. La ruta productiva está montada/protegida (401 anónimo), pero no se certificó descarga ni contenido.
- Los cambios visuales amplios de login/layout del mismo commit no son dependencia funcional del expediente y requieren validación propia en una fase futura.

No se elimina ni amplía ese código en esta consolidación.

## Secuencia y aceptación

- [x] Implementar y documentar API aditiva; integrar PR #6 (`20085c8`).
- [x] Implementar listado, expediente, historial y navegación.
- [x] Exponer los filtros/orden soportados y paginar el historial completo sin cargar detalles individuales.
- [x] Ejecutar pruebas estáticas/unitarias/build del dashboard.
- [x] Confirmar montaje, protección y CORS de rutas productivas sin token.
- [x] Ejecutar certificación autenticada de lista, filtros, orden y casos reales documentados.
- [x] Completar recorrido visual Edge 1440/768/390, consola y network.
- [x] Registrar resultados sin almacenar credenciales, tokens ni secretos.

Con implementación, pruebas, API productiva, sesión viewer, recorrido Edge, tres breakpoints y documentación publicados, el estado final es **FASE 2 — CERTIFICADA**.
