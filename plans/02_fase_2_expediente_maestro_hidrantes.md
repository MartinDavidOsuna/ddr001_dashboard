# Fase 2 — Expediente maestro de hidrantes

Estado: **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**. Inicio: 2026-08-13. Actualizado: 2026-08-13.

## Alcance

Listado administrativo paginado de hidrantes activos y expediente de lectura con información maestra vigente, estado RV derivado, última revisión, historial completo, coordenadas maestras, mapa y alertas objetivas. Incluye navegación revisión ↔ hidrante y responsive 1440/768/390. No incluye CRUD, migraciones, escrituras ni cambios Flutter.

## Modelo real identificado

- Maestro: `rv.hydrants`; identificación operativa `account_number`, atributos hidráulicos/físicos, coordenadas originales y WGS84, origen, metadata y vigencia.
- Revisiones: `rv.inspections`, técnico `rv.users`, cuadrilla histórica mediante `rv.work_sessions`/`rv.crews`.
- Evidencia: `rv.photos`; siete slots obligatorios y N fotografías totales.
- Captura: `rv.location_samples` y `rv.signal_samples` pertenecen a la revisión, no al maestro.
- Regla Flutter vigente: existe RV completado cuando alguna revisión está en `submitted` o `validated`; la última revisión y su estado se muestran aparte.

## Datos incluidos

Cuenta, año de instalación, gasto L/s, sección, ángulo, elevación, número de salidas, coordenadas maestras, coordenadas de origen con CRS etiquetado, origen catalog/manual, timestamps y metadata legible. Derivados: revisiones, primera/última, estados, último técnico/cuadrilla, cobertura obligatoria, fotos totales, GPS/señal y porcentaje de revisiones con evidencia completa.

## Datos excluidos

Municipio y localidad; IDs o razones internas como protagonistas; claves metadata desconocidas como campos oficiales; criticidad hidráulica, anomalías o interpretación territorial no respaldadas.

## Endpoints

Reutilizados: auth admin y detalle de revisión de Fase 1. El endpoint de campo `/hydrants` no se reutiliza porque su autorización, visibilidad y contrato están congelados.

Nuevos, aditivos y sólo lectura:

- `GET /api/v1/admin/dashboard/hydrants`: lista/filtros/orden/paginación server-side.
- `GET /api/v1/admin/dashboard/hydrants/:id`: maestro, agregados y última revisión.
- `GET /api/v1/admin/dashboard/hydrants/:id/inspections`: historial paginado y liviano.

## Consultas

CTE y funciones de ventana para ordenar revisiones por hidrante; agregados agrupados para conteos/estados; cobertura fotográfica por `COUNT(DISTINCT slot_code)` de los siete códigos; `OFFSET/FETCH`; parámetros tipados y allowlist de ordenamiento. Cero escrituras y cero N+1 HTTP. No se necesita migración.

## Arquitectura frontend y UX

Tipos y servicio en la capa API, transformadores puros probados, `HydrantListView` y `HydrantDetailView` lazy. Desktop usa tabla compacta e historial; tablet/móvil usan cards. Leaflet sólo se carga con el expediente. Empty states explícitos para nunca revisado, sin coordenadas y sin metadata.

## Rendimiento

Page sizes 25/50/100, filtros/agregados server-side, historial bajo demanda, sin fotos/listado ni detalles por hidrante. Se revisarán planes/índices existentes; cualquier índice adicional sólo se documentará.

## Pruebas

- API: schemas, viewer, paginación/filtros, 404, sin revisiones, múltiples revisiones y evidencia.
- Frontend: estado RV, metadata, empty states, fotos 7+N, filtros e historial.
- E2E real: hidrante 002, uno sin revisión, uno con múltiples y uno incompleto si existe; 1440/768/390; consola/network.

## Riesgos

- `source_crs` no está confirmado para el catálogo histórico; nunca se etiqueta como WGS84 salvo lat/lng válidos.
- Estado “revisado” del KPI incluye `rejected`, mientras “RV completado” móvil sólo usa `submitted|validated`; ambos conceptos se mostrarán con etiquetas distintas.
- La API nueva requerirá despliegue manual antes de certificación productiva visual.

## Secuencia y aceptación

- [x] Publicar cierre certificado de Fase 1.
- [x] Auditar modelo API/Flutter/Figma y decidir extensión administrativa.
- [x] Implementar/probar API aditiva, abrir PR #6 e integrar a `main` (`20085c8`).
- [x] Implementar listado y expediente frontend.
- [x] Completar navegación cruzada y enlaces KPI.
- [ ] Certificar E2E real, responsive, consola y network después del despliegue manual de API.
- [x] Actualizar documentación; commits y push se registran al cierre.

Aceptación: datos reales; viewer; server-side; sin municipio/localidad; estado coherente con Flutter; expediente recargable; historial completo sin N+1; 7 obligatorias + N totales; mapa/empty states; tres breakpoints; pruebas/build; todo publicado.

## Futuro

Comparador de revisiones, CRUD controlado, alertas técnicas formalizadas, exportaciones y optimización por índice sólo con evidencia.
