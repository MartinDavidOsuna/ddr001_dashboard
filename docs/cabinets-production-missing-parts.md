# Producción y faltantes — catálogo v2

Base: `origin/main` dec549e499aa633d2ceab8fe56b033427749a9af. Rama: `feat/cabinet-production-missing-parts`.

Nuevos Hidrantes muestra AVANCE DE PRODUCCIÓN global y por modelo: producidos, objetivo, porcentaje y restantes. Todos vienen de API, sin metas hardcodeadas. Producción corresponde al registro QR cerrado, no al estado actual; validación, instalación y entregable permanecen separados. Las barras conservan valores visibles incluso por encima de 100%.

PIEZAS FALTANTES muestra nombre, modelo/variante, unidades y gabinetes distintos afectados. Ausencia confirmada y sin revisar aparecen separadas. Las series pendientes no se mezclan con faltantes físicos. Orden inicial por unidades descendentes. Click navega con `missingPartCode` (identidad técnica del grupo), modelo y variante. Query string conserva el filtro al recargar/paginar. `missingPartName` sólo sirve para contexto visual; nunca se envía como identificador al backend. El listado muestra cuántas unidades de la pieza faltan en cada gabinete.

El expediente muestra `missingParts` calculado por backend, observaciones y nombres individuales. El checklist y relaciones de foto utilizan `displayName ?? description`; las relaciones siguen por código. API resuelve nombres históricos desde cada snapshot y no cambia expedientes antiguos. XLSX nunca se consume en el frontend.

Contrato generado desde el OpenAPI del PR API `feat/cabinet-catalog-display-names-production`. Requiere integrar API, migración `20261015_cabinet_missing_parts.sql` y rebuild antes del dashboard. No desplegar separadamente contra la API anterior.

Validaciones: 372 pruebas unitarias; typecheck/build; E2E con fixtures a 1440, 1024, 768 y 390 px, roles admin/supervisor/viewer, mapa, detalle, visor de fotos y navegación. Prueba de click en faltante, request a API y recarga de URL incluida en `scripts/cabinets-ui-e2e.mjs`. Screenshots/resultados locales en `.artifacts/cabinets-mock-ui`. Estas pruebas de navegador usan mocks; el contrato y SQL real se prueban en el PR API contra TEST. No constituyen certificación productiva.

API requerida: https://github.com/MartinDavidOsuna/ddr001_api/pull/19 (contrato fijado desde `96a420ba778df1fd6bec743bd1a6ed65f600552b`). No desplegado.
