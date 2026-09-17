# Auditoría contractual — Diagnósticos

Fecha: 2026-09-15. `git fetch --all --prune` ejecutado en ambos clones existentes.

- Dashboard `origin/main`: `53c3f0671f5ffcc32f250e64c79b25033b697f80`.
- API `origin/main`: `66f767378975b3adbf6a346f9d66c7b63fbf6ab8`.
- API `origin/feature/functional-diagnostics-api`: `e571b8bdf84a709a0d4ce40bf2a5f842e44199bd`; cuatro commits adelante, no integrada.
- Rama frontend creada desde origin/main en el mismo directorio. `fe6d659` conserva los cambios locales de RV, dashboard y navegación de tareas anteriores, sin mezclarlos con el nuevo feature.

## Fuentes inspeccionadas (API, SHA anterior)

`docs/functional-diagnostics-online-contract.md`, `docs/openapi.yaml`, `database/migrations/20260902_functional_diagnostics_domain.sql`, `admin.routes.ts`, `admin.schemas.ts`, `admin.repository.ts`, `domain.ts`, `functional-diagnostics.routes.ts`, tests unitarios e integración del dominio.

## Contrato observado

- Namespace `/api/v1/admin/dashboard/functional-diagnostics`; respuestas JSON envueltas en `{data: ...}`. Autenticación administrativa existente.
- Listas: `{items, page: {limit, nextCursor, sort}}`; cursor opaco, no convertir a número de página. Listado admite los filtros definidos en `adminCaseListSchema`. Búsqueda mínima 2 caracteres; límites 1–100; rangos métricos hasta 366 días.
- Detalle: `meter`, `technician`, `case`, `flowPoints[].samples[].{operationalSettings,points,evidence}`, `reports`, `statusHistory`, `reviews`, `currentReview`. Proyección directa SQL snake_case → camelCase (incluido `sampleStddevPct`).
- Revisiones embebidas: `reviewStatus`, `reviewComment`, `reviewedByAdminId`, `reviewedByNameSnapshot`. Endpoint de revisiones: `status`, `comment`, `reviewedBy`, `reviewedByName`. Adaptación explícita requerida.
- Reportes embebidos: `clientCreatedAt`, `serverCreatedAt`; endpoint de reporte: `createdAt`, `receivedAt`. No existe descarga administrativa de HTML/PDF; sólo metadata y flags.
- Viewer: lectura y thumbnails. Supervisor/admin: originales y creación de revisiones. Sólo admin: cambio e historial de acceso.
- Acceso: motivo 3–500 caracteres, `expectedRowVersion` hex de 8 bytes o null para fila todavía inexistente. 409 obliga a releer antes de permitir reintento.
- Revisión: UUID estable para reintentar idéntico contenido; generar otro si cambia el contenido. Flags máximo 20 de 1–80 caracteres; comentario hasta 2000; clasificación hasta 80.
- Evidencia sólo se sirve si integridad `VERIFIED`, además de pertenecer al caso. Flags de disponibilidad por sí solos no garantizan acceso al archivo.

## Semántica y límites

- Default `simulation=exclude` siempre explícito. Un caso mixto puede aparecer porque tiene muestras reales; el detalle no admite filtro simulation y conserva todas las muestras con su badge. No recalcular veredictos ni estadísticas metrológicas del caso.
- `sync.storedUnlinked` y `sync.partialReceipts` son contadores globales del dominio, no están filtrados por simulación/fecha. Se presentan separados de los indicadores físicos y etiquetados como globales.
- `/users` no admite simulation: su actividad incluye todo el dominio y se etiqueta así. No usarla como KPI físico.
- Métricas y tendencias se fechan por `samples.ended_at`; summary/list por creación del caso. No igualar arbitrariamente esos totales.
- El medidor es `functional_diag.meters.meter_id`, no un hidrante. Sólo se usa la relación contractual del técnico expuesta por la API.
- La API local conserva su rama y sus cambios previos; no se aplican migraciones, merges, despliegues ni cambios en ella. El frontend requiere que un operador despliegue el contrato auditado para obtener datos reales.

## Pruebas

Fixtures del frontend son exclusivamente de tests, basadas en las proyecciones del repositorio y el fixture de integración `functional-diagnostics-admin.integration.test.ts`; las variantes BLE usan las columnas de configuración reales. No se importan desde código de producción ni se usan como fallback.
