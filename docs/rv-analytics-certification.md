# RV Analytics - certificacion Macroetapa 3

Fecha: 2026-10-17, America/Hermosillo. **VALIDACION REAL TEST COMPLETADA CON LIMITACIONES HISTORICAS; IIS OMITIDO POR INSTRUCCION DEL USUARIO.** No se declara certificacion productiva completa.

## Git y ambiente

- API: origin/main inicial `1d3f968268da995b9dd5aee4578c5b6bf91e8f07`; RV original `665f747d8428ad938f88977b17b7fce1ba97916a`. Divergencia inicial 2/1; diff RV auditado sobre merge-base f2d9ca1 y portado sin solaparse con Stage 4G. Rama `integration/rv-analytics-certification`. Sin merge/rebase/reset.
- Frontend: origin/main inicial `dec549e499aa633d2ceab8fe56b033427749a9af`; original RV `5e66ffe34a50792f8908c412f75131c5f5bc1feb`, adelante limpia 1/0. Rama `integration/rv-analytics-dashboard-certification`.
- Fuentes candidatas anteriores a esta pasada: API cf0297a y frontend 8c1c842; esta pasada agrega fixtures de autenticacion, runners y una correccion CSS de overflow descubierta con datos reales. Los HEAD finales y checksums se registran en entrega/PR y manifest local de build.
- SQL confirmado antes de pruebas y fixtures: servidor WIN-5RQE8N8NQ9V, DB DDR001_Hidrantes_TEST, version 12.0.4237.0, compatibilidad 120. No produccion.
- API 1.1.2 servida en http://127.0.0.1:3017/api/v1 mediante launcher TEST, trabajadores y limpieza desactivados. Frontend construido con esa API y servido desde VS Code/preview en http://127.0.0.1:4189/ddr001/.
- PR ajenos API #19/frontend #4 de Gabinetes no incorporados. Fetch origin correcto; remoto deliberadamente invalido LOCAL_ONLY_DO_NOT_PUSH documentado.

## Cuentas temporales autorizadas

El usuario autorizo crear un usuario TEST para completar la certificacion. Se crearon tres fixtures nuevos (viewer/supervisor/admin) para comprobar los roles requeridos. Passwords aleatorios Argon2, credenciales solo en reports ignorado, sin valores en logs ni Git. No se cambiaron cuentas existentes.

Creacion/limpieza reproducible: `npx tsx scripts/rv-analytics-test-accounts.ts` y `--cleanup`, siempre con guardas de identidad TEST/120. Al finalizar: **0 cuentas propias y 0 refresh sessions propias restantes**; archivo de passwords eliminado. Cuentas activas originales restauradas: admin 5, supervisor 4, viewer 4. Evidencia privada local en reports/rv-analytics/cleanup-proof.json. No se insertaron capturas RV ni se alteraron roles existentes.

## SQL -> HTTP -> frontend

Consultas independientes: scripts/sql/rv-analytics-certification.sql. Solo SELECT y #temp para cifras; no se reutiliza el motor para calcular el resultado esperado. Definiciones reales auditadas: raices o dependencia booleana simple. Cero fuentes tecnicas editadas posteriores a v1 en current; el runner rechaza asumir respaldo relacional si aparecen.

| Indicador | Universo SQL | Afectados SQL | Evaluados SQL | % SQL | API HTTP | Frontend real | Resultado |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `cabinet_doors` | 543 | 63 | 543 | 11.60 | Coincide | Coincide | PASS |
| `flow_meter_pulse_cable` | 543 | 53 | 366 | 14.48 | Coincide | Coincide | PASS |
| `filter_element` | 543 | 4 | 499 | 0.80 | Coincide | Coincide | PASS |
| `flow_meter_works` | 543 | 26 | 509 | 5.11 | Coincide | Coincide | PASS |
| `internal_leaks` | 543 | 343 | 543 | 63.17 | Coincide | Coincide | PASS |

| Caso | SQL | API | UI | Resultado |
| --- | --- | --- | --- | --- |
| true | Fugas 343/543 | Coincide | Coincide | PASS |
| false | Puertas 63/543 | Coincide | Coincide | PASS |
| No aplica | Medidor funciona: 34 NA, 26/509 | Coincide | Coincide | PASS |
| Sin dato | Cable de pulsos: 143 noData, 34 NA, 53/366 | Coincide | Coincide | PASS |
| undefined | 0 reales; elemento ausente 4/499, 44 NA | Separado de absent | Calidad separada | Cero real verificado; caso positivo solo fixture SQL temporal |
| inactive | 0 reales | 200, scope vacio | Etiqueta Ausente disponible | Caso positivo solo fixture SQL temporal |
| Multiples revisiones | 45 hidrantes con varias revisiones; 0 duplicados actuales | Current 543/543; history 543/547 | Modos y unidades correctos | PASS |
| Retirada | 1 almacenada, 0 en alcance | Vista vigente respetada | Sin restaurar historial retirado en analytics | SQL/Motor PASS; sin publicar IDs |
| v1/v2 | Definiciones v1 79/12 y v2 86/9; capturas reales solo v2 | Datos reales v2 | Render real v2 | No hay caso real v1; fixture SQL temporal versionado PASS |
| Parcelarias | 165 hidrantes sin solenoide vs 381 componentes / 1481 observados | Coincide | Unidades separadas | PASS |

Los casos positivos v1, undefined e inactive siguen sin existir en capturas reales de esta DB. No se inventaron ni crearon revisiones para ocultar la limitacion. Validated tambien devuelve vacio real. Las cinco integraciones SQL temporales verifican estos caminos y snapshots versionados, sin sustituir evidencia de una captura real futura.

## Matriz API autenticada real

| Filtro | HTTP | Hidrantes | Inspecciones | Payload bytes | ms observados |
| --- | ---: | ---: | ---: | ---: | ---: |
| current | 200 | 543 | 543 | 63087 | 5421 |
| history | 200 | 543 | 547 | 63530 | 5178 |
| submitted | 200 | 543 | 543 | 63094 | 5454 |
| validated | 200 | 0 | 0 | 26047 | 357 |
| inactive | 200 | 0 | 0 | 26046 | 354 |
| day | 200 | 543 | 543 | 65201 | 5190 |
| week | 200 | 543 | 543 | 63415 | 5321 |
| month | 200 | 543 | 543 | 63087 | 4956 |
| period | 200 | 1 | 1 | 30476 | 291 |
| empty | 200 | 0 | 0 | 26084 | 294 |
| technician | 200 | 1 | 1 | 30466 | 303 |
| crew | 200 | 1 | 1 | 30466 | 281 |

Todos los bloques del contrato v1 presentes, sin NaN. 422/503 cubiertos por unitarias/fixtures existentes; no se corrompio TEST ni se fabricaron miles de capturas para forzarlos por HTTP.

## Performance HTTP real

Cinco muestras secuenciales por escenario; p95 aproximado es el maximo de esa muestra pequena, no un SLA. Un solo lote concurrente de tres lecturas; sin stress test ni optimizaciones de SQL/indices. Periodo y cuadrilla seleccionados tienen un solo hidrante: se informa su cardinalidad, no se extrapola.

| Escenario | Hidrantes | Inspecciones | Bytes | p50 ms | p95 aprox ms | Max ms | Concurrencia |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 543 | 543 | 63087 | 5305 | 5442 | 5442 | 1 |
| period | 1 | 1 | 30476 | 280 | 287 | 287 | 1 |
| crew | 1 | 1 | 30466 | 270 | 274 | 274 | 1 |
| history | 543 | 547 | 63530 | 5271 | 5316 | 5316 | 1 |
| current concurrent | 543 | 543 | 63087 | - | - | 12591 | 3 |

Latencias concurrentes: 12591, 11597 y 12550 ms. Current secuencial sigue cerca de la referencia 4.6-5.6 s; concurrencia amplifica latencia, sin 5xx. No se obtuvo evidencia que justifique tocar el motor.

## Edge, filtros, roles y responsive reales

- Viewer/supervisor/admin: login 200, auth/me 200, analytics 200 y CORS correcto. Viewer recibe 403 en archivo administrativo protegido; no se intentan escrituras de negocio.
- Edge real sin mocks: SQL/API->KPIs y valores textuales del Pareto, afectados/evaluados/porcentaje/NA/noData; filtros de modo, fechas, tecnico, cuadrilla, estado y granularidad. Una request analytics inicial y una al aplicar; Actualizando visible. Cancelacion/generacion siguen cubiertas por unitarias.
- 1440/768/390: PASS con datos reales, canvas visibles y capturas revisadas, cero overflow y pageerrors. Se encontro un overflow de 14 px causado por el min-content del listado real; corregido solo con minmax(0,1fr) y min-width:0 en hijos del grid RV.
- Ultimas revisiones: 10 rows/cards, maximo diez, orden started_at descendente; actividad general independiente de analytics. Listado completo, detalle, comparador, archivo y refresh autenticado PASS.
- El runner espera auth/me antes de repetir refresh: evita cancelar una rotacion de refresh antes de persistir su respuesta. No cambia la autenticacion de la aplicacion. Logout 204 y nuevo login comprobados.
- API/performance se ejecuto una vez; tras corregir layout se reanudo solo UI con --rv-ui-only y se conservaron resultados HTTP previos. Artefactos locales privados: .artifacts/rv-analytics-real/results.json, api-current.json, capturas y regression.json.

## Regresion real y fotografias

Admin: dashboard, hidrantes, fotografias, filtros de exportaciones, usuarios, cuadrillas, jornadas, dispositivos, mapa, diagnosticos, Bases y Gabinetes: GET representativo 200 y navegacion autenticada real. Detalle/comparador/archivo revisados tambien en los tres anchos.

Metadata fotografica 200; muestra existente de TEST: thumbnail 200 image/webp (72 bytes), content 200 image/jpeg (278 bytes). Edge verifica imagen decodificada, abre/cierra visor; cero pageerrors. Es una muestra, no auditoria completa de todo NAS. No se modifica integridad, mapping, storage_verified_at, Stage 4E/4G, workers ni fotos. Analytics usa agregados SQL y no necesita leer archivos fisicos.

## Checks y build

- API: npm ci, type-check, lint, build, diff-check PASS; 907 unitarias y 5 integraciones reales SQL2014 PASS. Fixture nuevo de cuentas: type-check/lint, creacion y limpieza reales PASS.
- Frontend: npm ci, typecheck, lint y build /ddr001/ PASS; suite completa 383 pruebas. Lint 2921 warnings vs 3044 de main; se corrigieron solo los siete warnings nuevos RV.
- ECharts identico a main: chart-engine-Bumd8TgV.js, 552398 bytes, gzip 184770. Advertencia de chunk registrada, sin cambiar bundler.
- Router BASE_URL preservado. dist/index.html y assets apuntan a /ddr001/. SPA refresh local 200 en todas las rutas RV; API embebida solo TEST. Version frontend 0.3.0; API 1.1.2.
- public/web.config es candidato versionado copiado al dist, no instalado. No se uso IIS por instruccion expresa posterior del usuario. No se afirma certificacion IIS.

## Deployment y limites pendientes

**Deployment productivo BLOQUEADO**: IIS no certificado/omitido por instruccion, casos positivos historicos reales no disponibles, CI/PR y autorizacion de merge/deployment pendientes. Entorno local VS Code funcional y probado contra TEST. No hay merge ni deployment productivo, cambios moviles, checklist, migraciones productivas, CORS productivo o reinicios productivos.

Ver rv-analytics-deployment.md para candidatos, PR, checklist y rollback. Los datos de autenticacion temporales ya fueron eliminados.

## PR de revision

- API, borrador: https://github.com/MartinDavidOsuna/ddr001_api/pull/21
- Frontend, borrador: https://github.com/MartinDavidOsuna/ddr001_dashboard/pull/5

Sin merge ni deployment productivo. CI se consulta en los PR; no confundir checks locales/TEST aprobados con CI remoto.
