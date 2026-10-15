# Diagnóstico de cabinets y visor global — 2026-10-14

## Causa comprobada en el runtime publicado

Plataforma: `http://cifra.aquafim.com:8080/ddr001/dashboard`.
El bundle público configura `http://cifra.aquafim.com:3002/api/v1`. No hay doble `/api/v1`.
Se consultaron referencias remotas antes de editar. Dashboard y API estaban limpios.
API `/version` reportó `3802e4af7d7046944d9b48fb6195bffa025b5fdb`, igual al `origin/main` actualizado.
No se presume que el HEAD del dashboard sea la identidad de su compilación publicada.

Las dos peticiones autenticadas se comprobaron directamente, usando la sesión facilitada por el usuario únicamente para estos GET. No se guardó el bearer:

| GET bajo `/api/v1/admin/dashboard/construction/cabinets` | HTTP | API |
| --- | --- | --- |
| `/summary` | 503 | `Cabinet projection incomplete` |
| `/metrics` | 503 | `Cabinet projection incomplete` |

Tipo de Problem Details: `https://rvs.example/problems/cabinet-projection-incomplete`.
Detail: `Rebuild the read model before consuming administrative statistics.`

`coherentCabinetRead` en `src/modules/admin/cabinets-admin.repository.ts` rechaza ambos endpoints antes de consultar sus métricas cuando existe un gabinete sin proyección, con `document_version <> version`, o una operación sin evento derivado. La tabla principal de proyección existe: su ausencia produciría el título distinto `Cabinet projection unavailable`. La respuesta no distingue cuál de los contadores internos es mayor que cero; hay que medirlos con las consultas siguientes antes del mantenimiento.

Esto es una **proyección DB incompleta/desactualizada**, pendiente de rebuild/backfill. No es una petición incorrecta de Vue ni evidencia de una API antigua: su commit publicado coincide con main. La salud general 200 sólo comprueba conectividad/configuración/storage, no coherencia de cabinets. Los OPTIONS 204 que compartió el usuario eran preflight de otros módulos. El summary con `targetBases/accepted/delivered` correspondía a Bases y no certifica cabinets.

No se modificó la API, no se ejecutaron SQL, migraciones, rebuild, cambios de configuración ni despliegues productivos. No se sustituyeron errores por ceros ni fixtures. Los mocks siguientes pertenecen exclusivamente a pruebas locales. **La indisponibilidad productiva sigue pendiente; no se certifican datos reales 200 mientras no se ejecute y valide el mantenimiento.**

## Cambios frontend

- `CabinetDashboardSection.vue`: reintentos independientes para summary y metrics; el filtro sigue cargando ambos recursos.
- `cabinets.resource.ts`: diagnóstico sólo en desarrollo con HTTP y categoría; permite reconocer los títulos conocidos de proyección. Nunca imprime error/config/response, SQL, bearer, stack, rutas o datos arbitrarios. Los mensajes amigables por 400/401/403/404/409/422/500/503 se conservan.
- `ImageViewer.vue` y `image-viewer.geometry.ts`: único visor en ejecución. Imagen inicialmente ajustada por dimensiones naturales ya orientadas por el navegador; máximo 5× del fit, mínimo 1×. Área acotada, zoom sólo en imagen, metadata separada con scroll propio si lo necesita. Rueda focal, teclado +/− y numpad, Escape, navegación, reset, pan con mouse, Pointer Events para pinch/pan táctil. No intercepta campos editables ni modificadores Ctrl/Meta/Alt. Dialog nativo conserva modal/foco; listeners y ResizeObserver se retiran al cerrar/desmontar, incluso durante una apertura asíncrona.
- Fotografía global, RV, Bases, cabinets y Diagnósticos usan el componente. El expediente de hidrante enlaza a su revisión; no tenía visor propio. No se tocaron los diálogos administrativos que no muestran fotografías.
- Se conservaron metadata/enlaces de galería y dimensiones/fecha de RV. Se agregaron contexto/integridad/actor/fecha a cabinets y tipo/fecha/integridad a Diagnósticos.
- Originales siguen descargándose al abrir; cargadores de cabinets conservan allowlist, AbortController, generaciones y revocaciones. Diagnósticos ahora cancela también el original al cerrar/reintentar y rechaza respuestas antiguas. El visor recibe object URLs y no descarga recursos ni agrega tokens.
- `gallery-lightbox.ts` conserva sus exports históricos y toma el máximo del helper compartido; ya no gobierna una implementación separada.
- Marco blanco de 2 px y tag exacto `Zoom: Rueda del mouse ó en teclado +,-`; ayuda oculta en 390 px y en puntero táctil.
- E2E nuevo y workflow CI: Fotografías, cabinets y Bases en `/ddr001/`, cuatro tamaños, JPEG horizontal grande y JPEG con orientación EXIF 6. Fixtures sintéticos pequeños, no fotografías ni datos productivos.

## Procedimiento posterior de producción — NO ejecutado

### 1. Comprobar identidad y planificar mantenimiento

Confirmar host, instancia SQL, **base efectiva**, storage configurado y backup/restauración. Revisar `/api/v1/version`, configuración del proceso y release aprobado; no usar un SHA histórico como identidad actual. Inventariar y detener temporalmente TODOS los escritores Field/workers/instancias antiguas para evitar que un runtime anterior vuelva a dejar la proyección obsoleta. Los clientes móviles conservan sus contratos; coordinar la ventana de disponibilidad con la operación existente.

En la conexión SQL verificada, ejecutar únicamente estas lecturas inicialmente (SQL Server 2014):

```sql
SELECT DB_NAME() AS database_name,
       SERVERPROPERTY('ProductVersion') AS engine_version;
SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME();
SELECT OBJECT_ID(N'construction.cabinet_admin_projection',N'U') AS projection_id,
       OBJECT_ID(N'construction.cabinet_admin_events',N'U') AS events_id,
       OBJECT_ID(N'construction.cabinet_photo_checks',N'U') AS photo_checks_id;
```

Sólo después de confirmar los objetos, medir:

```sql
SELECT COUNT_BIG(*) AS missing_or_stale_projection
FROM construction.cabinets c
LEFT JOIN construction.cabinet_admin_projection p ON p.cabinet_id=c.cabinet_id
WHERE p.cabinet_id IS NULL OR p.document_version<>c.version;
SELECT COUNT_BIG(*) AS missing_events
FROM construction.cabinet_operations o
LEFT JOIN construction.cabinet_admin_events e ON e.operation_id=o.operation_id
WHERE e.operation_id IS NULL;
```

### 2. Código y migración (condicionales)

El runtime observado ya incluye la API de main; este trabajo **no requiere una API nueva**. Si la identidad cambió o hay instancias antiguas, desplegar el release vigente mediante el proceso habitual antes de reabrir servicio.

Comprobar que se aplicó completa `database/migrations/20261012_cabinet_admin_projection.sql`, después de sus prerrequisitos vigentes, especialmente `20261005_construction_cabinets.sql`. Si faltan objetos/índices, revisar y aplicar el archivo aprobado en mantenimiento con la conexión verificada; no reaplicar por asumir que todo 503 significa migración faltante.

Ejemplo para el operador, usando autenticación integrada ya autorizada y sustituyendo los marcadores:

```powershell
sqlcmd -S '<INSTANCIA_VERIFICADA>' -d '<DB_PROD_VERIFICADA>' -E -b -i 'database/migrations/20261012_cabinet_admin_projection.sql'
```

El archivo contiene batches SQL/GO. No cambiar nivel de compatibilidad ni usar funciones JSON de SQL modernas.

### 3. Rebuild/backfill requerido

Con escritores detenidos y el entorno/storage productivos **verificados**, ejecutar la función existente `rebuildCabinetAdminProjection`. No usar `scripts/rebuild-cabinet-admin-test.ts` en producción ni quitar sus guardas TEST.

Desde el directorio del release API compilado, con el mismo entorno seguro del servicio y un archivo de configuración verificado:

```powershell
$env:DOTENV_CONFIG_PATH='<ARCHIVO_DE_ENTORNO_VERIFICADO>'
node --input-type=module -e "import { rebuildCabinetAdminProjection } from './dist/modules/cabinets/admin-rebuild.js'; import { closeDb } from './dist/db/pool.js'; try { console.log(await rebuildCabinetAdminProjection()); } finally { await closeDb(); }"
```

El layout `dist/modules/...` corresponde a `tsconfig.build.json` de la API actual: verificar que ambos archivos existen en el release antes de ejecutar. Las variables ya definidas en el entorno del proceso prevalecen sobre dotenv: comprobarlas sin imprimir secretos. El ejemplo no despliega ni migra implícitamente.

El rebuild procesa lotes de 50, bloquea un agregado a la vez en transacción SERIALIZABLE, reconstituye eventos/hitos de los snapshots históricos y registra checks de fotos. No cambia estados ni documentos Field y no copia/borra/repara archivos. Puede repetirse. Guardar el resultado `documents/checkedPhotos` y logs operativos en destino protegido; no publicarlos en la interfaz.

### 4. Metas y restart

Verificar metas aprobadas `CONSTRUCTION_TARGET_CABINETS_A1/A2/A3/A4`; los defaults actuales son 41/105/290/24 (total 460). Su ajuste no reconstruye ni repara la proyección. No cambiarlas sin una meta operativa real.

Repetir las consultas de coherencia: ambos contadores deben ser cero. Reiniciar/reabrir todas las instancias con el release vigente y su configuración verificada mediante el gestor habitual del servicio. No basta reiniciar para reparar filas faltantes. Evitar escritores antiguos en despliegue mixto.

### 5. Validar datos reales antes de declarar resuelto

Con sesión vigente admin y supervisor, consultar ambos GET exactos `/api/v1/admin/dashboard/construction/cabinets/summary` y `/metrics`: **HTTP 200**, JSON con los contratos `CabinetAdminSummary/CabinetAdminMetrics`, sin Problem Details. Comparar los conteos con la DB bajo los mismos filtros; verificar `targets`, hitos, estados, modelos y eventos. Confirmar autorización (viewer 403; sin sesión 401) y que el dashboard muestra los datos reales sin fixtures. Si reaparece 503, repetir contadores y revisar escritores/releases mixtos; no desactivar el control de coherencia.

El dashboard puede validar respuestas guardadas sin tokens con `assertContract` de `src/features/cabinets/cabinets.contract.ts`. No usar las suites TEST históricas como prueba de producción: sus identidades/SHAs almacenados no describen el runtime actual.

### 6. Publicar frontend por separado

Publicar posteriormente el build revisado del dashboard con la API base correcta y `--base=/ddr001/`, conservando proxy/CORS y autenticación actuales. El despliegue del visor/reintentos es independiente del mantenimiento DB. Este trabajo no publicó `dist` ni hizo push.

## Validación ejecutada

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS: 0 errores, 3044 warnings de las reglas actuales |
| `npm run typecheck` | PASS |
| `npm test` | PASS: 359 pruebas / 43 archivos |
| `npm run build` | PASS; aviso de chunks mayores de 500 kB |
| `git diff --check` | PASS en ambos repositorios |
| `npm run e2e:image-viewer` | PASS: 12 recorridos, Fotografías/cabinets/Bases × 1440/1024/768/390; `/ddr001/`, JPEG horizontal y EXIF vertical; HTTP simulado, navegador real |
| `npm run e2e:cabinets-ui` | PASS: 4 viewports + supervisor/viewer |
| `npm run e2e:construction-ui` | PASS: 15 recorridos; servidor local con `VITE_CONSTRUCTION_DATA_MODE=mock` |
| `npm run e2e:functional-diagnostics-ui` | PASS: 9 recorridos |
| `npm run e2e:global-map` | PASS: 5 recorridos |
| `npm run e2e:administration-ui` | PASS: 6 recorridos |
| API: `npx vitest run tests/unit/cabinets-admin.test.ts tests/unit/cabinets-admin-openapi.test.ts` | PASS: 28 pruebas / 2 archivos |

La primera ejecución de construction-ui usó un servidor en modo API y falló por ausencia de sus charts: se repitió con el modo mock que la suite exige, sin cambiar assertions históricas. Nuevos tests cubren rueda, teclado/numpad, límites, reset, cambio de foto/pan, Escape/navegación, pinch, exclusión de inputs, teardown y apertura seguida de desmontaje inmediato. Suites históricas de fotos/cabinets siguen comprobando carga bajo demanda, respuestas atrasadas, revocaciones y 404/409/503. Capturas revisadas visualmente en los cuatro tamaños bajo `.artifacts/image-viewer-ui/`.

E2E ejecutado en Microsoft Edge/Chromium Windows. Gestos táctiles verificados con Pointer Events sintéticos y configuración táctil del navegador; **no es una certificación física de Android/iPhone/iPad**. La orientación EXIF 6 sí se comprobó en el navegador con un JPEG real. `e2e:edge`, `e2e:cabinets-real` y `e2e:construction-api` no se ejecutaron: exigen bootstrap/credenciales y entorno TEST propio; el runner cabinets-real conserva una identidad histórica que no representa producción. Se revisaron sus selectores/contratos; la nueva suite local cubre la galería sin operar producción. Los únicos GET productivos autenticados realizados fueron summary y metrics para diagnosticar el fallo.

## Git al finalizar la corrección inicial, antes de la integración local

- Dashboard: rama inicial `main`, rama de trabajo `fix/cabinet-diagnostics-global-photo-viewer`; HEAD inicial/final `2a2bb2a02af25f4e9f84c19834297b2660573b7f`, igual al `origin/main` consultado antes de editar. Cambios locales de este trabajo pendientes de commit/revisión; no había cambios previos que sobrescribir.
- API (`C:/DEV/AQAGS/ddr001_api_rv`): `main`, HEAD inicial/final `3802e4af7d7046944d9b48fb6195bffa025b5fdb`, igual al remoto; status limpio, sin modificaciones.
- No se crearon commits, PR ni push. No se modificaron archivos de entorno, contratos móviles, migraciones, códigos persistidos o ruta base.

## Revisión e integración local posteriores

El usuario retiró el acceso productivo de esta tarea y pidió trabajar exclusivamente en local/Git hasta integrar completamente con main. No se ejecutaron preflight SQL, migración, rebuild ni validaciones nuevas contra producción. Los 503 y la necesidad de rebuild documentados arriba siguen pendientes; integrar el frontend no los resuelve.

Se verificaron de nuevo ambas referencias remotas y los cambios locales. No había archivos ajenos: Dashboard tenía los 19 archivos de la corrección inicial; API permaneció en main limpio. La revisión completa conservó metadata, navegación, lazy originals, generaciones/object URLs, AbortController de cabinets y Diagnósticos, autenticación, estados y ruta base.

La revisión agregó una guarda al descargador compartido `dashboardService.photo`: acepta exclusivamente las rutas relativas administrativas de fotografías que emite la API, y rechaza URLs absolutas, protocol-relative, traversal, query strings y data URLs antes del cliente autenticado. Se agregaron 11 tests de destinos seguros/rechazados. Esto no cambia la autenticación ni el contrato. Se restauró además el estilo preexistente del icono del estado vacío, eliminado incidentalmente al retirar CSS del visor antiguo, y se corrigió el MIME del fixture E2E para reflejar sus JPEGs.

Los gates de integración de esta revisión son locales: lint/typecheck/tests/build/diff-check, seis suites E2E simuladas en navegador real, tests administrativos API, diff revisado y API limpia. El cierre solicitado es commit único y merge seguro con main local; no incluye push ni publicación de build. Las suites real/edge requieren su bootstrap remoto y no se ejecutan tras la instrucción de trabajar sólo localmente.

Resultados de la revisión local: `npm run lint` PASS (0 errores / 3044 warnings), `npm run typecheck` PASS, `npm test` PASS (370 pruebas / 44 archivos), `npm run build` PASS (aviso de chunk grande), `git diff --check` PASS. `e2e:image-viewer` PASS (12 recorridos), `e2e:cabinets-ui` PASS (6), `e2e:construction-ui` PASS (15), `e2e:functional-diagnostics-ui` PASS (9), `e2e:global-map` PASS (5), `e2e:administration-ui` PASS (6). API: 28 tests cabinets/admin PASS, sin cambios locales. No se presentan estas pruebas simuladas como validación productiva.
