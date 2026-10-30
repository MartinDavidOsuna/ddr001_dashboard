# M4.1 — Certificación contractual posterior a la integración

Fecha: 2026-10-27. Informe local de la rama correctiva; no modifica main. La evidencia de cierre, commit, PR y CI definitivo se completa en el resultado único de M4.1. No autoriza publicación productiva.

## 1. Estado inicial y documentación

API: `C:/DEV/AQAGS/ddr001_api_rv`, rama inicial `feat/cabinet-admin-management-20261027`, HEAD `3fb381a25c2b9639050d84a6d1b0e8fe900f04e8`. Dashboard: `C:/DEV/AQAGS/ddr001_dashboard`, rama inicial `feat/cabinet-admin-ui-20261027`, HEAD `9943ba6da673daffa0e82f6610e4b355df30df19`. Dashboard limpio; API conserva dos documentos M4 sin seguimiento: `docs/cabinet-administration-m4-integration-20261027.md` y `docs/cabinet-administration-m4-release-manifest-20261027.md`.

Se ejecutaron status, branch, log, remote, fetch --prune y branch -avv. Origin es MartinDavidOsuna/ddr001_api y MartinDavidOsuna/ddr001_dashboard respectivamente. PR API #29 y Dashboard #6 confirmados closed/merged, destino main. No commits remotos adicionales respecto a los main reportados. API se cambió a main sin alterar sus documentos; Dashboard usa una rama nueva desde origin/main: `fix/cabinets-api-contract-pin-postmerge-20261027`. No clones, reset, clean, rebase, descarte ni modificación directa de main.

Leídos los documentos M1, M2, M3, M4, runbook y `resultados codex/M4_integracion_main_20261027_174333.md` del API. Son evidencia histórica; los resultados siguientes se ejecutaron de nuevo. Se aplicaron las habilidades Postman api-engineer/api-testing, reutilizando OpenAPI, validadores y runners existentes, sin crear ni publicar recursos Postman.

## 2. SHA integrados seleccionados

- API main: `cf6105b15f0b84d522ef04a7d5bcf4ac23516f96`.
- Dashboard main antes del correctivo: `6609ea43e4be20f42ff6ce47974aec721ca2bcb9`.
- Árbol API integrado y HEAD M3: ambos `403342b3c5e907a3d39a24f84980ee3a08cf4dfb`; diff vacío.

## 3. Causa exacta y corrección

`scripts/generate-cabinets-contract.mjs` lee `docs/openapi.yaml` del checkout API indicado, selecciona los esquemas CabinetAdmin y sus referencias (33), y genera `cabinets.generated.ts` y `cabinets.schemas.json`. Obtiene el SHA con `git rev-parse HEAD` y lo conserva en el encabezado TypeScript. Si OpenAPI tiene cambios locales, añade una marca de contrato sucio que no satisface el gate final. `--check` compara profundamente los esquemas, comprueba ocho GET y las tres rutas de escritura, y exige el encabezado exacto del HEAD API comprometido.

Tras un merge commit, la identidad Git cambia aunque su árbol completo coincida con el HEAD de origen. Dashboard seguía apuntando al HEAD M3; fallaba la comprobación de identidad, sin diferencias en DTOs, rutas o schemas. No se debilitó ni modificó el generador.

Comandos oficiales ejecutados desde Dashboard, API checkout main:

```powershell
node scripts/generate-cabinets-contract.mjs ../ddr001_api_rv
npx prettier --write src/features/cabinets/cabinets.generated.ts
node scripts/generate-cabinets-contract.mjs ../ddr001_api_rv --check
```

Diff funcional completo:

```diff
-// Generated from ddr001_api 3fb381a25c2b9639050d84a6d1b0e8fe900f04e8.
+// Generated from ddr001_api cf6105b15f0b84d522ef04a7d5bcf4ac23516f96.
```

JSON sin diferencias; TypeScript sólo una sustitución de línea. Segunda generación + formato reproduce el mismo SHA256 `6d03fb0f458539433e221e4d8fdbfb89cb0d6d3847a59d9f96f45569cc771739`. Check PASS: 33 esquemas, ocho GET y SHA integrado exacto. Ensayo negativo temporal con SHA de ceros rechazado por API reference drift; archivo original restaurado en finally y check positivo posterior. No pruebas nuevas artificiales para una modificación del encabezado.

## 4. Matriz contractual y seguridad cruzada

Prefijo: `/api/v1/admin/dashboard/construction/cabinets`. Axios conserva Bearer; mutaciones envían Idempotency-Key igual a operationId. Respuestas se validan antes de presentarse.

| Operación | Request / respuesta | Comprobación |
| --- | --- | --- |
| GET listado | Filtros y page/pageSize; items,page,pageSize,total,totalPages | Datos SQL actuales, dos páginas, filtro exacto, enums y rechazo de corruptos |
| GET summary/metrics/map | Filtros; schemas administrativos respectivos | HTTP actual y parser Dashboard; archivados excluidos |
| GET expediente | UUID; CabinetAdminDossier | Historia v1/v2, metadatos opcionales/null explícito, ETag/versión y evidencia |
| GET opciones | Sin body; modelos y empresas activas | Catálogo servidor; sólo admin |
| PATCH UUID | operationId,expectedVersion,reason,changes | Allowlist estricta; CabinetAdminMutationResult |
| POST UUID/cancel-installation | operationId,expectedVersion,reason,confirm:true | Misma respuesta; autorización actual y recibo transaccional |
| DELETE UUID | operationId,expectedVersion,reason,confirm:true,confirmUid | Eliminación lógica independiente; misma respuesta |
| GET móvil construction/cabinets/UUID | Wrapper cabinet,visibleUid | Instalación/cierre/aprobación nulos tras cancelar, versión/updated_at/ETag actualizados |

401 sin autenticación; 403 rol indebido/revocado; 422 payload/catálogo/fecha/confirmación; 409 versión u operación/referencias activas; 410 gabinete archivado; 503 proyección/migración incoherente. UI presenta problemMessage o error contractual con ruta, sin convertir errores en listas vacías.

`crew.source` conserva linked_base, registration_profile y session_history_consensus. Los tres tienen prueba unitaria; en los datos persistentes actuales se observaron los dos primeros y empresa null. No se afirma haber observado el tercero en SQL.

Cancelación: admin activo revisado dentro de SERIALIZABLE antes del replay; UPDLOCK/HOLDLOCK sobre agregado, HOLDLOCK sobre administrador, versión optimista, motivo/confirmación. Se libera exclusive_base_id sin modificar/eliminar base; se invalidan instalación/cierre/aprobación actuales y se conservan historia/fotos/hashes/auditoría. Un replay después de reservar la base en otro gabinete no modifica esa nueva reserva. Competencia entre administradores da un éxito/un conflicto; fallo SQL tardío revierte datos, proyección, auditoría y recibo.

Eliminación: sólo marca archived_at; bloquea instalación incluso invalidada aún no cancelada, reserva y aprobación. Confirmación separada con UID; no encadena cancelación y eliminación. Tombstone excluido de listados/métricas/móvil; consultas históricas y evidencia conservadas. Comandos/uploads atrasados y descarte físico de historia administrada bloqueados.

Edición: model,automated,companyId,installationDate,administrativeNotes,installationObservations. Catálogo existente, empresa activa, fechas datetime2 0001–9999. UID/QR/series/base/IDs/evidencia/auditoría no editables. Cambios reales de observaciones invalidan aprobación; texto idéntico la conserva. Auditoría rv.audit_log antes/después y actor; una operación revertida no publica un éxito ficticio. UI exclusiva admin, motivo/confirmaciones, diferencias precargadas y recarga de expediente sin reload manual.

## 5. Pruebas actuales

Suites locales completas finalizadas; los SKIP permanecen explícitos. Conteos iguales a M3: no hubo cambios funcionales ni nuevas pruebas para el pin.

| Comando / alcance | Resultado |
| --- | --- |
| API npm test -- --maxWorkers=1 | 1104 PASS / 95 archivos / 0 FAIL / 0 SKIP |
| API npm run test:integration | 17 PASS / 125 SKIP, 3 archivos aprobados y 24 omitidos |
| API cabinets-flow.integration.test.ts, TEST explícito | 27 PASS / 0 FAIL |
| Dashboard npm test -- --maxWorkers=2 | 399 PASS / 47 archivos / 0 FAIL |
| API lint / type-check / build | PASS, cero errores |
| Dashboard lint / typecheck / build / build:iis | PASS; 2965 advertencias de estilo existentes y warning bundle >500kB |
| Browser e2e:cabinets-ui | 6 recorridos HTTP simulado PASS |
| Browser e2e:administration-ui | 6 recorridos HTTP simulado PASS |
| Cruce API/SQL TEST → parser actual | 11/11 registros, 2 páginas, 1 filtro, 16 GET y 3 respuestas reales de mutación PASS; verificador writes=0 |
| Generador positivo / negativo / repetición | PASS / rechazo esperado / reproducible |
| git diff --check ambos repositorios | PASS |

Los 125 SKIP de la ejecución general incluyen los 27 casos de gabinetes ejecutados por separado; quedan 98 casos optativos de otros módulos en 23 archivos sin ejecutar. Requieren sus flags/entornos específicos y no se habilitaron indiscriminadamente. Los scripts aislados de migraciones globales de otros módulos tampoco se ejecutaron. Browser real SQL antiguo no se ejecutó ni se saltó su guarda de identidad; se combinó navegador simulado con HTTP/SQL real en proceso. No certifica teléfono físico ni NAS real.

La invocación de integración dentro de un wrapper inicial no pudo abrir un log Windows con dos puntos en el nombre; esa invocación no inició la suite. Se ejecutó de nuevo con nombre válido: 17 PASS /125 SKIP. No se modificó ninguna prueba ni expectativa.

### Condiciones de TEST

NODE_ENV=test; CONFIG_PROFILE=construction-test; SQL_DATABASE=DDR001_Hidrantes_TEST; STORAGE_ROOT=.storage/construction-test; ARCHIVE_STORAGE_ENABLED=false; PHOTO_INTEGRITY_JOB_ENABLED=false; RUN_CABINETS_E2E=true; CAPTURE_CABINET_ADMIN_CONTRACT=true. Sólo overrides del proceso, sin modificar .env. Antes de escribir, el beforeAll verifica configuración, root local y DB_NAME real; motor 12.0.4237.0, nivel120. Sin NAS compartido: archivado real deshabilitado; pruebas archivo/local emplean directorios sintéticos locales.

Negocio/borrados de la suite limitados a UUIDs sintéticos y cleanup acotado; tests existentes de rebuild también actualizan proyecciones/comprobaciones derivadas de TEST persistente, sin modificar capturas ni evidencia física histórica. La suite comprueba migración repetida y rollback conservador sólo en esa DB. Respuestas reales capturadas sin tokens quedan en storage ignorado para que el parser actual valide edición/cancelación/archivo; no son fixtures frontend antiguos. El verificador posterior no hace escrituras ni inicia workers.

Logs locales: TEMP/ddr001-M41-api-unit.log, api-integration.log, api-sql.log, api-lint.log, api-type-check.log, api-build.log; dashboard-unit.log, dashboard-lint.log, dashboard-typecheck.log, dashboard-build.log, dashboard-build-iis.log, dashboard-e2e-cabinets-ui.log, dashboard-e2e-administration-ui.log; cross-contract.log, todos con prefijo ddr001-M41-. No se publican logs privados.

## 6. GitHub y automatizaciones

CI main API [40609966949](https://github.com/MartinDavidOsuna/ddr001_api/actions/runs/40609966949): completed/success en cf6105b, 1102 PASS /2 SKIP Linux; las dos omisiones son DACL/sharing violation exclusivas de Windows, ejecutadas dentro de las 1104 PASS locales Windows. CI main Dashboard [40610225556](https://github.com/MartinDavidOsuna/ddr001_dashboard/actions/runs/40610225556): completed/success en 6609ea4, 399 PASS y seis etapas browser mock. Logs/jobs consultados actualmente, no sólo resumen M3. CI del correctivo [40612107048](https://github.com/MartinDavidOsuna/ddr001_dashboard/actions/runs/40612107048): completed/success para HEAD 4bc6b0b2ff690dcdb66b9069feb4b4287b61946d, 399 PASS y seis etapas browser mock; instalación, typecheck, lint y build también aprobados. Todos los steps del job final comprobados, sin pasos fallidos.

Workflows versionados revisados completos: API CI instala/lint/typecheck/tests/build; SQL workflow_dispatch sólo TEST y no activado; Dashboard instala/valida/build/preview Vite local, seis etapas browser y artefactos. Ninguno contiene despliegue/migración productiva automático. No se modificaron workflows.

MANUAL_VALIDATION_REQUIRED: GET branch protection devuelve 403 Resource not accessible by integration en ambos; rulesets API devuelve 403 por disponibilidad del plan, Dashboard devuelve []; hooks es endpoint no admitido por connector (400). No se intentó eludir restricciones. Estos límites no prueban ausencia de reglas/webhooks ni certifican otras automatizaciones externas.

El propietario debe revisar, en AMBOS repositorios:

1. Settings → Branches → Branch protection rules → main: checks exigidos, PR/revisiones, aprobación/CHANGES_REQUESTED, descarte de approvals antiguos, resolución de conversaciones, actualización de base y bypass/direct push/force/delete.
2. Settings → Rules → Rulesets: reglas de repositorio y heredadas activas sobre main, checks y revisiones; confirmar la limitación del plan en API. La lista vacía de Dashboard no acredita ausencia de políticas externas.
3. Settings → Webhooks: eventos push/pull_request/workflow_run, destinos y entregas recientes; confirmar que no activan operaciones productivas sin aprobación.
4. Actions → workflows y Settings → Environments / Actions General: triggers en main, protección/aprobación de entornos, permisos de workflow y runners; Settings → Integrations → GitHub Apps: CI/CD externo y despliegues por merge. No copiar secretos a informes.

Son pendientes explícitos del propietario, no aprobaciones automáticas ni autorización de producción.

## 7. Compatibilidad, SQL y recuperación

El correctivo no cambia JavaScript de runtime, endpoints, modelos, payloads, esquemas, permisos SQL, auditoría ni storage. RV/Construction/Gabinetes/Diagnósticos conservan contratos. Unitarias completas, SQL gabinetes/base y HTTP/parser actual aportan evidencia; SQL específico optativo RV/Diagnósticos, teléfono y NAS reales permanecen no certificados.

Sin migraciones nuevas. Revisadas `database/migrations/20261027_cabinet_administration.sql` y `_rollback.sql`, dependencias y permisos TEST/production: SQL2014/120, XACT_ABORT/TRY/CATCH, columnas datetime2 nullable, recibos con PK/UNIQUE/FK sin cascadas. Rollback no borra esquema y rechaza recibos; decisiones administrativas no reversibles automáticamente. No nuevos GRANT ni DELETE sobre negocio. Archivos de permisos revisados, no ejecutados. El runtime efectivo debe comprobarlo el responsable.

El orden existente revisable es 20261005_construction_cabinets → 20261012_cabinet_admin_projection → 20261015_cabinet_missing_parts → 20261016_cabinet_deletions → 20261019_cabinet_photo_deletions → 20261023_cabinet_company_and_archive_delete → 20261027_cabinet_administration; aplicar posteriormente sólo lo realmente faltante bajo procedimiento aprobado. No rebuild global necesario por este pin. No se modifica runbook: no cambia ninguna dependencia operativa. Su nota de versiones históricas debe leerse junto al manifiesto M4 y los SHA certificados actuales, nunca como autorización de despliegue.

La comprobación cruzada del SHA y las respuestas actuales se ejecutó localmente con ambos checkouts; el workflow Dashboard no descarga el repositorio API ni sustituye ese gate. Cualquier avance futuro del HEAD API, incluso sólo documental, exige revisar/regenerar el pin contra la versión seleccionada y repetir --check: esa estricta identidad es intencional y no se elimina en este correctivo.

Volver a una API previa tras cancelaciones/archivados/recibos no es seguro: puede ignorar tombstones; requiere contención/análisis y preferentemente fix-forward, sin borrar recibos ni restaurar vínculos/aprobaciones por SQL improvisado. Ninguna operación del runbook fue ejecutada.

## 8. Cierre y límites

Commit correctivo: `4bc6b0b2ff690dcdb66b9069feb4b4287b61946d`, `fix(cabinets): align generated API contract with merged main`. Rama publicada: `fix/cabinets-api-contract-pin-postmerge-20261027`. [Dashboard PR #7](https://github.com/MartinDavidOsuna/ddr001_dashboard/pull/7), OPEN, no Draft, base main; un archivo, una inserción/una eliminación. Sin conflictos, revisiones ni comentarios bloqueantes; auto_merge null. Informes locales fuera del commit. CI del PR completed/success verificado. Decisión: **M4.1 — READY_FOR_CORRECTIVE_PR_MERGE**. PR no fusionado; revisión y decisión humana pendientes.

No se accedió a servidor/SQL/endpoints/NAS productivos; no migraciones ni despliegues productivos, cambios IIS/NSSM/servicios/.env, push main, merge/auto-merge, force push, eliminación de ramas, reescritura ni publicación de secretos. Cambios ajenos preservados. La aceptación humana de PR y las verificaciones físicas/operativas siguen siendo independientes. Esta entrega no declara la plataforma lista para producción.

## 9. Matriz de cierre M4.1

| Área | Estado | Evidencia |
| --- | --- | --- |
| API main | PASS | cf6105b, PR29 integrado y CI main success |
| Dashboard main | PASS_WITH_WARNINGS | 6609ea4 integrado; el pin histórico requiere PR7 |
| Generador de contratos | PASS | Generación reproducible y prueba negativa |
| Contrato actualizado | PASS | cf6105b exacto, 33 esquemas/8 GET |
| Pruebas API | PASS_WITH_WARNINGS | 1104 unitarias; integración 17 PASS/125 SKIP |
| Pruebas Dashboard | PASS_WITH_WARNINGS | 399 PASS, 12 browser mock; warnings estilo/bundle existentes |
| Integración cruzada | PASS | SQL/HTTP27; parser actual 11/11, 16 GET/3 mutaciones |
| Seguridad admin | PASS | Roles/revocación, allowlist, confirmaciones y auditoría probados |
| SQL Server2014 | PASS | Motor12.0.4237.0/nivel120; migración repetida y rollback seguro |
| CI GitHub | PASS | Main API/UI success; correctivo 40612107048 success para HEAD publicado |
| PR correctivo | PASS | #7 OPEN/no Draft, base main, sin auto-merge |
| Protecciones GitHub | MANUAL_VALIDATION_REQUIRED | 403; pantallas y reglas identificadas |
| Webhooks | MANUAL_VALIDATION_REQUIRED | Endpoint no disponible; validar con propietario |
| Producción | PASS | Sin acceso/sin cambios; no certifica readiness productiva |

Sin hallazgos críticos ni altos nuevos. M41-01: drift de identidad Git resuelto; sin cambio contractual de contenido. M41-02: límites administrativos GitHub documentados. Ramas históricas, stash y dos archivos M4 preservados. **M4.1 — READY_FOR_CORRECTIVE_PR_MERGE** con validaciones manuales explícitas, sin bloqueos técnicos/contractuales/CI conocidos para recomendar revisión. No confundir validación de revisión de PR con autorización productiva.
