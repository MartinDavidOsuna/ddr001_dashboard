# RV Analytics — preparación de despliegue y rollback

Estado al 17 de octubre de 2026: **BLOQUEADO**. No ejecutar merge ni deployment productivo con esta evidencia parcial. Ver `rv-analytics-certification.md`.

## Entorno autorizado actual

Por instrucción posterior del usuario, no se usa IIS; se sirven candidatos locales desde el entorno de VS Code:

- API: `http://127.0.0.1:3017/api/v1`, DB verificada `DDR001_Hidrantes_TEST`, SQL Server 2014/120. Sin workers, cambios de esquema o roles.
- Frontend: `http://127.0.0.1:4189/ddr001/`, build de certificación con API TEST. No hay mocks de API en este preview.
- No confundir abrir el formulario de login con certificar el dashboard autenticado.

Desde el repositorio API:

```powershell
npm ci
npm run type-check
npm run lint
npm test -- --maxWorkers=2
npm run build
$env:RUN_RV_ANALYTICS_SQL_INTEGRATION='true'
npx vitest run tests/integration/rv-analytics.integration.test.ts --maxWorkers=1
npx tsx scripts/certify-rv-analytics-test.ts
npx tsx scripts/start-rv-analytics-certification.ts
```

El launcher exige `NODE_ENV=test`, DB configurada TEST e identidad real TEST/120. Sólo escucha loopback. No cargar un `.env` de producción. Los procesos de limpieza, integridad y archivado no se arrancan. El `.env` existente no se reescribe: las restricciones del proceso son locales.

Desde frontend, en otra terminal:

```powershell
npm ci
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
$env:VITE_API_BASE_URL='http://127.0.0.1:3017/api/v1'
npm run build:iis
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4189 --strictPort --base=/ddr001/
```

`build:iis` sólo produce un build con base `/ddr001/`; no instala ni configura IIS. La base no depende de ediciones manuales en `dist`.

Con correo/contraseña de cuentas TEST existentes en variables E2E del proceso o `.env.rv-cert.local` ignorado del repositorio API:

```powershell
npm run e2e:edge -- --rv-real
```

El runner usa HTTP real y Edge, sin respuestas mock ni JWT creados a mano. Lee credenciales por rol (`E2E_VIEWER_EMAIL/PASSWORD`, equivalentes SUPERVISOR/ADMIN) sin registrarlas. No usar prefijo `VITE_` para secretos. Falta ejecutar el runner más allá del preflight por ausencia de estas credenciales. Una cuenta o rol faltante se debe informar; no cambiar roles para completar el informe.

## Gates para PR y aprobación

1. Completar SQL → HTTP autenticado → UI con los mismos filtros y denominadores.
2. Completar la matriz current/history, estados, granularidad, fechas, técnico, cuadrilla y vacío. Documentar casos positivos reales que faltan en TEST (v1, undefined, inactive/validated).
3. Ejecutar Edge real, roles, responsive 1440/768/390 y regresión global, incluidas fotografías. No reparar fotos ni modificar integridad/storage.
4. Medir HTTP current, periodo, cuadrilla, history, cinco muestras secuenciales por escenario y un lote de tres solicitudes concurrentes. Reportar percentiles aproximados, máximo y bytes; no stress test.
5. Actualizar el documento de certificación con evidencia real y SHAs. Pasar CI después de publicar PRs.
6. Obtener autorización expresa antes de merges o producción.

Los PR ajenos API #19/frontend #4 siguen fuera de alcance. API candidata parte del `main` con Stage 4G; la portabilidad RV no alteró esos archivos.

## Borradores de PR — no publicados

### API: integration/rv-analytics-certification → main

Título: `feat(admin): integrar y certificar el motor analítico RV de lectura`

El dashboard RV necesita agregados institucionales versionados sin descargar respuestas crudas. Integra el motor RV ya implementado sobre el main actual, conservando Stage 4G y hardenings posteriores. Agrega consultas independientes de certificación y un launcher TEST aislado; sin cambios móviles, checklist, escrituras de captura, migraciones persistentes ni workers.

Validación local: npm ci, type-check/lint/build, 907 unitarias y cinco integraciones SQL2014 en TEST. SQL independiente coincide con el motor para fugas, puertas, aplicabilidad, campos sin dato, scope y componentes parcelarios. **HTTP autenticado, roles, UI y performance HTTP pendientes; PR no listo para merge/deployment.**

Riesgos: transacción REPEATABLE_READ, límite de consulta y latencia bajo concurrencia aún por medir vía HTTP. Rollback: restaurar artefacto API anterior y su configuración, reiniciar únicamente el proceso autorizado. No hay migraciones RV que revertir. Se preserva la compatibilidad móvil.

### Frontend: integration/rv-analytics-dashboard-certification → main

Título: `feat(rv): integrar el dashboard analítico RV y preparar certificación real`

`/revisiones` presenta el contrato server-side; el listado completo vive en `/revisiones/listado`. Conserva detalle, comparador, archivo y dashboard general. Incluye runner Edge real, build reproducible `/ddr001/` y corrección de siete warnings nuevos de labels, sin funcionalidad adicional ni recálculos en Vue.

Validación local: npm ci, typecheck, 383 unitarias, lint sin errores (2921 warnings frente a 3044 de main), build y rutas SPA locales. ECharts idéntico a main (552398 bytes). **Certificación real autenticada y responsive contra TEST pendientes por credenciales; no presentar mocks como evidencia real.**

Riesgos: disponibilidad de API Analytics antes de publicar frontend; las últimas revisiones son actividad general independiente del universo analítico. Rollback: restaurar el sitio/artefacto frontend previo; conservar configuración del servidor. Sin cambios móviles o de captura.

## Futuro merge — sólo después de autorización

Orden: API → CI aprobado → autorización → merge API → verificar HEAD main → frontend → CI aprobado → autorización → merge frontend. No usar reset/rebase destructivo ni incorporar ramas ajenas. Si origin/main avanza, repetir comparación, reconciliación y checks pertinentes antes de aprobar.

## Futuro deployment API — NO ejecutado

Antes de empezar, registrar commit/tag actualmente desplegado, nombre exacto del proceso/servicio, comando de reinicio, ubicación del artefacto anterior y copia protegida de su configuración. Esos datos productivos no se inventan; su ausencia bloquea deployment.

```powershell
git checkout main
git pull --ff-only origin main
npm ci
npm run type-check
npm run lint
npm test -- --maxWorkers=2
npm run build
```

Confirmar privadamente `.env`, DB/servidor autorizados, secretos, CORS y flags de workers existentes. No modificar CORS, Stage 4E/4G ni migraciones por esta entrega. Respaldar `dist`, build-info y configuración vigente antes de sustituir artefactos. Reiniciar sólo el proceso autorizado mediante el comando previamente registrado; no hay autorización actual para ello.

Comprobar GET `/api/v1/health/live`, `/health/ready`, `/version` y analytics autenticado. No ejecutar seeds, migraciones o reparaciones para un smoke.

## Futuro deployment frontend — NO ejecutado

La instrucción actual excluye IIS. Los pasos siguientes son sólo el plan solicitado para una futura autorización diferente; no se copiaron archivos a `inetpub`.

```powershell
git checkout main
git pull --ff-only origin main
npm ci
$env:VITE_API_BASE_URL='<URL API autorizada>/api/v1'
npm run build:iis
```

Inspeccionar `dist/index.html`, URLs `/ddr001/assets/`, API embebida, versión/commit y manifest de checksums. Respaldar íntegramente `C:\inetpub\wwwroot\ddr001` con fecha UTC y guardar el artefacto desplegado anterior; confirmar que puede leerse/restaurarse ANTES de copiar. Conservar el `web.config` existente y comparar el candidato versionado, sin sobrescritura automática. URL Rewrite debe estar disponible para el fallback propuesto; no se instaló ni certificó aquí.

Copiar únicamente tras autorización y respaldo verificado. Probar acceso/refresh directo a dashboard, listado, detalle, comparador y archivo. CORS usa el Origin del sitio, por ejemplo `http://cifra.aquafim.com:8080`, nunca `/ddr001` en CORS_ORIGINS. No modificar CORS productivo automáticamente.

## Rollback preparado antes de desplegar

- API: conservar el `dist` y build-info anterior, commit/tag y configuración protegida. Ante fallo, restaurar ese artefacto, restaurar configuración si cambió y reiniciar sólo el proceso documentado. No depender de reconstruir o descargar dependencias durante la emergencia. No deshacer Stage 4G ni tocar DB por rollback RV.
- Frontend: conservar copia completa del sitio anterior, incluidos assets y `web.config`. Restaurarla inmediatamente si falla login, assets o deep links. No mezclar assets nuevos con el index antiguo. Validar rutas y versión restauradas.
- Un rollback de código no requiere escrituras en revisiones, integridad fotográfica, NAS o checklist.

## Smoke productivo futuro, sólo lectura de negocio

GET health/live, health/ready y version; login administrativo autorizado; auth/me; GET rv-analytics; GET inspections?page=1&pageSize=10; abrir dashboard; GET metadata de fotografías. Login/refresh sólo generan estado de autenticación; no escribir sobre revisiones reales. No marcar validaciones, rechazos, retiros, exportaciones nuevas ni reparaciones de almacenamiento durante el smoke.

No se declara LISTO PARA DEPLOYMENT mientras falte autenticación TEST, E2E/roles/responsive/performance reales y revisión final de artefactos/rollback. No se hizo merge ni despliegue productivo.
