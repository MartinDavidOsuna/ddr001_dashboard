# Validación de Fase 2 — Expediente maestro de hidrantes

Fecha: 2026-08-13. Estado: **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**.

## Cierre de Fase 1 y ramas

- Dashboard Fase 1: commits pendientes `09c9331` y `4f461cb` publicados en `origin/feature/fase-1-visor-rv`; worktree limpio al crear Fase 2.
- Dashboard Fase 2: `feature/fase-2-hydrant-master-record`, creada desde `4f461cb` certificado.
- API: `main` remoto contenía merge `28ca304`; rama `feature/dashboard-fase-2-api` creada desde esa base.
- Flutter `backup/first-on-field-test-mac`: sin modificaciones; exclusivamente lectura.

## Modelo y campos

Maestro real: `rv.hydrants`. Se incluyen cuenta, año, gasto L/s, sección, ángulo, elevación, salidas, coordenadas maestras, coordenadas/CRS de origen, origen catalog/manual, timestamps y metadata escalar. Se agregan conteos RV, estado global, última revisión, técnico/cuadrilla, evidencia, fotos y presencia GPS/señal.

Municipio y localidad están excluidos de contratos, búsqueda, filtros, listado y expediente. El “tipo” ilustrativo, territorio y anomalías de Figma no tienen fuente funcional vigente y tampoco se presentan.

## Endpoints administrativos

| Método | Ruta | Propósito | Autorización | Escritura |
|---|---|---|---|---|
| GET | `/api/v1/admin/dashboard/hydrants` | Lista, búsqueda, filtros, orden y paginación | admin principal, incluido `viewer` | no |
| GET | `/api/v1/admin/dashboard/hydrants/:id` | Maestro, estadísticas y última RV | idem | no |
| GET | `/api/v1/admin/dashboard/hydrants/:id/inspections` | Historial RV liviano y paginado | idem | no |

Los endpoints de campo no cambiaron. No hubo dependencias, DDL, migración, seed ni datos modificados.

## SQL y rendimiento

- CTE, `ROW_NUMBER`, agregados y paginación `OFFSET/FETCH` compatibles con SQL Server 2014.
- Parámetros tipados para todos los valores; ordenamiento por allowlist.
- Agregados de fotos/GPS/señal set-based y filtro por hidrante en detalle.
- Page sizes de lista: 25, 50 y 100. Historial máximo 100.
- No hay requests por hidrante, fotos en lista, originales ni N+1 HTTP.
- El primer test real detectó una columna duplicada en `ORDER BY` para el sort por cuenta; se corrigió y la repetición completa pasó.

## Funcionalidad frontend

- Listado real server-side con búsqueda por cuenta; filtros de estado RV, existencia de revisiones, coordenadas, año, gasto, salidas y fecha; orden seguro y paginación.
- Desktop usa tabla; tablet/móvil usan cards.
- Expediente recargable `/hidrantes/:id`: encabezado, copiar cuenta, datos maestros, metadata legible/JSON técnico, estadísticas, alertas objetivas, resumen RV, mapa lazy y cronología completa.
- Empty states: nunca revisado, sin coordenadas, sin metadata, historial vacío, 404 y error de historial.
- Navegación Dashboard KPI → Hidrantes, revisión → hidrante e hidrante → revisión.
- Regla fotográfica: sin revisión muestra “Sin revisión”; con revisión muestra `x/7 obligatorias · N total`.

## Regla RV

`completed` significa que existe alguna RV `submitted` o `validated`, igual que la función vigente usada por Flutter. La última revisión y su estado exacto se muestran por separado. “Revisado” del KPI conserva la fórmula certificada que también cuenta `rejected`.

## Casos reales de prueba

Base local separada `RevisionVisualStarter_Test`, sólo SELECT:

- Cuenta `10`: sin revisiones; valida empty state y ausencia de completitud ficticia.
- Cuenta `1`: dos revisiones; última con 7/7 obligatorias; valida historial múltiple.
- Cuenta `1279`: una revisión y 0/7 en la última; valida evidencia incompleta.
- Producción conocida `002`: se conserva como caso de certificación post-deploy; su nueva ruta todavía no puede probarse hasta el despliegue manual.

No se crearon ni modificaron registros.

## Pruebas

### API

- `npm run type-check`: exit 0.
- `npm run lint`: exit 0.
- Unitarias directas: 2 archivos, 5 passed, 0 failed, 0 skipped.
- Integración SQL nueva: 1 archivo, 2 passed, 0 failed, 0 skipped; viewer lista/detalle/historial y 404.
- `npm run build`: exit 0.
- `npm test`: 13 integraciones skipped por el script normal que excluye `tests/integration/**`; las unitarias relevantes se ejecutaron directamente.

### Dashboard

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- Vitest: 2 archivos, 10 passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; 2,481 módulos.
- Warning no bloqueante conocido: chunk ECharts 535.92 kB minificado. Leaflet permanece separado en el chunk lazy `InspectionMap`.

## Responsive, consola y network

La estructura y build cubren tabla/cards y breakpoints 1440/768/390, pero el E2E real no se declara certificado: la API productiva aún no contiene las tres rutas de Fase 2 y no se usaron mocks. Después del despliegue manual deben comprobarse los tres casos, mapa, navegación cruzada, consola sin errores y network con tres requests máximos por expediente (maestro, historial y tiles), sin fotos.

## Integración y despliegue pendiente

- API commit de feature: `3bbcc96`.
- PR API: `#6`, integrada a `main`.
- Merge que debe desplegarse: `20085c8a6a9cd140e6a0c2dc3b6fa67f6962ea98`.
- `npm install`: no requerido; package/lock sin cambios.
- Build: sí, `npm run build`.
- Migración: **no**.
- Deployment automático: no realizado; corresponde al responsable del Windows Server.

Smoke post-deploy: live/ready 200; rutas móviles anónimas continúan 401; `/admin/dashboard/hydrants` anónimo 401 (no 404); login viewer; lista 25; búsqueda `002`; detalle e historial; cuenta sin revisión; cuenta múltiple; evidencia incompleta; CORS localhost.

## Estado

Implementación, pruebas locales, documentación y merge API completos. Falta exclusivamente desplegar manualmente el merge API y repetir certificación funcional/visual real. Estado: **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**.
