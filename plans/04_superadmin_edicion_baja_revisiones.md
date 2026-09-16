# Plan 04 — Limpieza administrativa de revisiones RV

Actualizado: 2026-09-15. Plataforma 0.2.0 / API 1.1.0.

## Decisiones confirmadas

- Esta entrega se limita a bajas lógicas de revisiones visuales (RV) por `admin`.
- Se conservan los permisos existentes de `admin` y `supervisor` para sus operaciones actuales.
- El nuevo rol `superadmin` y el editor completo se posponen a otra entrega.
- Los levantamientos de construcción quedan fuera de la limpieza.
- La baja oculta la revisión en las consultas habituales del dashboard y conserva los datos, historial y evidencia.

Esta revisión sustituye el plan inicial de exclusividad para superadmin y la propuesta API 2.0.0. La modificación es aditiva y la API pasa a 1.1.0.

## Semántica de esta versión

La baja es una marca administrativa separada de la revisión. No cancela, valida, rechaza, reabre ni elimina físicamente registros. No cambia el autor, el estado, las respuestas, las fotos, los snapshots o el claim oficial. Tampoco habilita automáticamente otra captura del hidrante.

El archivo permite a admin consultar la revisión con su evidencia. Los permisos y flujos móviles existentes permanecen vigentes: esta función no borra caches móviles ni modifica la sincronización o la oficialidad RV. La conservación de permisos implica que los comandos existentes pueden seguir actualizando la revisión según sus reglas; seguirá oculta mientras tenga marca de baja. El archivo muestra el registro conservado con su historial, no una copia congelada de la pantalla del momento de la baja.

## Reglas cotejadas

| Fuente | Regla aplicada |
| --- | --- |
| plans/03_fase_3_cierre_funcional.md | Comandos específicos, sin borrado físico, auditoría, concurrencia y SQL parametrizado |
| docs/dashboard-data-dictionary.md | Solo roles reales de la API y distinción entre usuarios de campo y administradores |
| API: plans/rv-major-update-stage-03-immutable-versioning.md | Preservar snapshots y asociaciones fotográficas históricas |
| API: plans/rv-major-update-stage-02-global-status-exclusivity.md | No liberar claims ni alterar rondas como efecto lateral de limpieza |
| API: docs/security.md | Autenticación, rol, validación y auditoría del lado servidor |
| docs/construction-dashboard-ui.md | La proyección de roles Construction queda intacta |

## Implementación

1. `rv.inspection_withdrawals`: una baja por inspección, actor, motivo, fecha UTC, comando único y versión leída.
2. Vistas `rv.dashboard_inspections` y `rv.dashboard_inspection_summary`: excluyen las bajas sin modificar las tablas de captura.
3. API de baja: solo token admin y cuenta actualmente activa con rol admin en SQL. La comprobación se repite dentro de la transacción, incluso en reintentos.
4. Solo RV: RF y UUID inexistentes reciben 404. Motivo de 3–500 caracteres y rowVersion hexadecimal obligatorios.
5. Control de concurrencia: si cambió rowVersion, responder 409 y pedir recarga. Repetir el mismo commandId y contenido devuelve el resultado original sin duplicar auditoría.
6. Filtrado consistente en listados, resumen, galería, expediente de hidrante, estadísticas de usuarios y exportaciones administrativas.
7. Detalle: botón Dar de baja revisión, motivo, confirmación, identificación del hidrante y revisión, error recuperable y navegación al archivo después de confirmar.
8. Archivo paginado administrativo y detalle con `archived=true`. Las rutas existentes de evidencia conservan su autorización previa.
9. Versión visible en el dashboard y versión real del paquete API en `/api/v1/version`.

## Contratos

- `POST /api/v1/admin/dashboard/inspections/:id/withdraw`: `{reason,rowVersion,commandId}`. 201 primera baja; 200 repetición idéntica; 403 sin permiso; 404 fuera de RV; 409 conflicto; 422 datos inválidos.
- `GET /api/v1/admin/dashboard/inspection-withdrawals`: archivo paginado, solo admin activo.
- `GET /api/v1/admin/dashboard/inspections/:id?archived=true`: permite consultar evidencia conservada, solo admin activo.
- La idempotencia de baja es transaccional mediante commandId. No se utiliza el caché global para devolver una baja sin comprobar el rol SQL vigente.

## Migración y entrega

Migración incremental SQL Server 2014: `20260915_rv_dashboard_withdrawals.sql`. El rollback se niega si hay bajas registradas. No ejecutar el DDL inicial destructivo.

Implementación API en `feature/fase-3-dashboard-api`; dashboard en `feature/rv-cleanup-0.2.0`. Se conservan cambios locales previos.

Aplicar y verificar primero en TEST. La migración crea tablas/vistas, no selecciona ni da de baja revisiones. La limpieza de registros reales la realiza el administrador desde la interfaz. No incluye selección masiva automática, restauración ni despliegue a producción.

## Validación requerida

- Contrato y confirmación explícita, fallos y reintentos UI.
- SQL real con fixtures nuevas dentro de una transacción revertida: roles, JWT con rol obsoleto, concurrencia, RF, idempotencia, auditoría y conservación de evidencia.
- Exclusión del detalle habitual, galería, métricas y exportación; lectura del archivo autorizada.
- Regresión de unitarias API/frontend, typecheck, lint, build y recorrido de navegador.
- Validación visual de escritorio y móvil sin dar de baja registros reales.

Ver VERSIONING.md, CHANGELOG.md y docs/rv-cleanup-validation.md para versiones, alcance y resultados.
