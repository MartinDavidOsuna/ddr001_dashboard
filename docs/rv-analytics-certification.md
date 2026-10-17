# RV Analytics - Macroetapa 3: registro de certificacion

Estado: **NO CERTIFICADO - BLOQUEADO POR AUTENTICACION TEST**.
Fecha: 2026-10-17 (America/Hermosillo). Fuente numerica: consultas independientes de `scripts/sql/rv-analytics-certification.sql` en API. No hay escrituras en tablas de aplicacion.
## Identidad y Git
- SQL: `WIN-5RQE8N8NQ9V`; DB `DDR001_Hidrantes_TEST`; motor `12.0.4237.0`; compatibilidad `120`.
- API origin/main inicial: `1d3f968268da995b9dd5aee4578c5b6bf91e8f07`. RV original: `665f747d8428ad938f88977b17b7fce1ba97916a`. Divergencia inicial: 2 commits main / 1 RV.
- API candidata: `integration/rv-analytics-certification`, codigo `931319ea1e2631077c2b15989a3e1ee2f135d4cf`. Diff RV revisado y aplicado desde merge-base `f2d9ca1`; sin solapamientos por archivo con Stage 4G. No merge/rebase/reset.
- Frontend origin/main inicial: `dec549e499aa633d2ceab8fe56b033427749a9af`. RV original: `5e66ffe34a50792f8908c412f75131c5f5bc1feb`. Adelante limpia: 1/0.
- Frontend candidata: `integration/rv-analytics-dashboard-certification`, codigo `9ac7bbb712f18076e6907e9d6d00211d589c2e2f`.
- PR abiertos ajenos: API #19 y dashboard #4 (Gabinetes), no incorporados. No PR RV existente al auditar; no se publica PR de certificacion mientras falten gates reales.
- Ambos arboles iniciales limpios. Fetch origin correcto; fetch --all informa el remoto deliberadamente invalido LOCAL_ONLY_DO_NOT_PUSH.
## Validacion numerica real
La columna Motor compara el SQL independiente con la invocacion real de los batches y formateador API sobre TEST. **No equivale a HTTP autenticado**. Las columnas API y Frontend permanecen pendientes.
| Indicador | Universo SQL | Afectados SQL | Evaluados SQL | % SQL | Motor | API HTTP | Frontend | Resultado |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `cabinet_doors` | 543 | 63 | 543 | 11.60 | Coincide | Pendiente | Pendiente | SQL/Motor PASS |
| `flow_meter_pulse_cable` | 543 | 53 | 366 | 14.48 | Coincide | Pendiente | Pendiente | SQL/Motor PASS |
| `filter_element` | 543 | 4 | 499 | 0.80 | Coincide | Pendiente | Pendiente | SQL/Motor PASS |
| `flow_meter_works` | 543 | 26 | 509 | 5.11 | Coincide | Pendiente | Pendiente | SQL/Motor PASS |
| `internal_leaks` | 543 | 343 | 543 | 63.17 | Coincide | Pendiente | Pendiente | SQL/Motor PASS |

| Caso | SQL real TEST | Motor | API/UI | Resultado |
| --- | --- | --- | --- | --- |
| true | internal_leaks: 343/543, 63.17% | Coincide | Pendiente | Parcial |
| false | cabinet_doors: 63/543, 11.60% | Coincide | Pendiente | Parcial |
| No aplica | flow_meter_works: 34 NA; 26/509, 5.11% | Coincide | Pendiente | Parcial |
| Sin dato | flow_meter_pulse_cable: 143 noData; 53/366, 14.48%; 34 NA | Coincide | Pendiente | Parcial |
| undefined | 0 casos reales; filtro ausente: 4/499, 0.80%; 44 NA | Undefined=0 separado de absent | Pendiente | Caso positivo real no disponible; fixture temporal PASS |
| inactive | 0 casos reales; alcance actual 543/1301 cubiertos | inactive=0 | Pendiente | Caso positivo real no disponible; fixture temporal PASS |
| Multiples revisiones | 45 hidrantes actuales tienen varias revisiones almacenadas; 0 duplicados actuales | 543 inspecciones / 543 hidrantes | Pendiente | SQL/Motor PASS |
| Retirada | 1 retirada almacenada; 0 en alcance actual | Respeta vista visible | Pendiente | SQL/Motor PASS |
| v1/v2 | Catalogos v1=79 items/12 secciones y v2=86/9; todas las capturas reales son v2 | Actual v2 | Pendiente | No hay captura real v1; fixture temporal versionado PASS |
| Parcelarias | 165 hidrantes sin solenoide; 381 componentes sin solenoide / 1481 componentes observados | Coincide | Pendiente | SQL/Motor PASS, unidades separadas |

Se observaron 0 fuentes tecnicas editadas posteriores a version 1 en current; por eso el contraste relacional independiente es valido. El runner se detiene si aparecen snapshots editados que requieran auditoria independiente adicional. Definiciones de dependencia reales verificadas antes del conteo. No se deduce aplicabilidad desde preguntas actuales de otra version.

Resumen entregado por motor: {"selectedInspections": 543, "selectedHydrants": 543, "evaluatedHydrants": 543, "hydrantsWithFindings": 543, "hydrantsWithoutFindings": 0, "findingCount": 5117, "inactiveHydrants": 0, "noEvaluableDataHydrants": 0, "catalogHydrants": 1301, "coveragePercent": 41.74}

Parcelarias reales: {"observedValves": 1481, "withoutSolenoid": 381, "withoutPilot": 178, "withoutGauge": 262, "disconnectedPilots": 212, "specializedHydrantsWithoutSolenoid": 165, "specializedHydrantsWithoutPilot": 91}

No se crearon capturas ficticias persistentes para completar casos ausentes. Las 5 pruebas SQL temporales verifican NA, unknown, versiones, ausencia, retirada, filtros y snapshots; no reemplazan evidencia real SQL->HTTP->UI.
## Checks ejecutados
| Componente | Check | Resultado |
| --- | --- | --- |
| API | npm ci | PASS |
| API | type-check / lint / build / diff-check | PASS |
| API | npm test -- --maxWorkers=2 | PASS: 79 archivos, 907 pruebas |
| API | RUN_RV_ANALYTICS_SQL_INTEGRATION=true, suite RV | PASS: 5 pruebas TEST SQL2014 |
| Frontend | npm ci | PASS; primer intento EPERM por Vite local usando binding nativo; proceso identificado por modulo del workspace y detenido antes de repetir |
| Frontend | typecheck / lint / unit tests | PASS: 45 archivos, 383 pruebas; cero errores lint |
| Frontend | build:iis con API TEST y base /ddr001/ | PASS; solo build local, no IIS |
| Frontend | warnings | main=3044; candidato=2921; 7 warnings nuevos RV corregidos; sin limpieza masiva |
| Bundle | chart-engine | main y candidato identicos: 552398 bytes, gzip 184770; hash Bumd8TgV |
| Edge real | npm run e2e:edge -- --rv-real | BLOQUEADO en preflight: No configured TEST accounts; ningun resultado mock presentado como real |
## HTTP, CORS y performance
- API de certificacion aislada: http://127.0.0.1:3017/api/v1. Identidad TEST verificada; workers/cleanup desactivados. No reinicia ni usa API productiva.
- health/live=200; version=200 (1.1.2, proceso de desarrollo candidato); analytics anonimo=401.
- OPTIONS login=204; Access-Control-Allow-Origin=http://127.0.0.1:4189. No se modifica CORS productivo. Origin no contiene /ddr001. POST login y GET analytics autenticados: pendientes.
- Motor SQL real: 4710 ms en integracion; 5173 ms y 5126 ms en auditorias sucesivas para 543 inspecciones/hidrantes. Son observaciones del motor, no latencia HTTP ni percentiles API.
- p50/p95/max/payload/concurrencia HTTP: pendientes de autenticacion. No se optimiza SQL, no se crean indices ni se ejecuta stress test.
- Matriz HTTP preparada para current/history, submitted/validated/inactive, day/week/month, periodo, tecnico, cuadrilla y vacio. No ejecutada autenticada. 422/503 cubiertos por unitarias/fixtures existentes; no se altero TEST para forzar limites o snapshots invalidos.
## Frontend y responsive real
- KPIs, Pareto, sistemas, disponibilidad/distribuciones, tendencia, calidad, parcelarias, ultimas 10 y listado: codigo preservado; sus unitarias pasan.
- SQL->HTTP->UI, filtros reales, orden/fotos/GPS/senal de ultimas 10, login/me/refresh y roles: pendientes de credenciales. No se firman tokens artificialmente ni se cambian passwords o roles.
- 1440/768/390 sobre datos reales: pendientes. La evidencia mock de Macroetapa 2 no cuenta para esta certificacion.
- Detalle, comparador, archivo, hidrantes, fotografias, exportaciones, usuarios, cuadrillas, jornadas, dispositivos, mapa, diagnosticos, Bases y Gabinetes: unitarias y rutas conservadas; regresion autenticada real pendiente. No se modifica integridad fotografica, NAS, Stage 4E/4G ni workers.
## Base path y entorno local
- Router mantiene createWebHistory(import.meta.env.BASE_URL). Build reproducible: npm run build:iis con VITE_API_BASE_URL de TEST.
- dist/index.html referencia /ddr001/assets/ y /ddr001/favicon.svg. chart-engine sin regresion material. public/web.config versionado como candidato de fallback, copiado al dist, no instalado.
- Preview local desde entorno VS Code: http://127.0.0.1:4189/ddr001/. GET /, revisiones, listado, detalle, comparar y archivo devuelve 200 y shell SPA con assets bajo /ddr001/. Esto prueba fallback estatico local, no contenido autenticado ni IIS.
- Instruccion posterior del usuario: no usar IIS; servir desde VS Code. No se creo sitio, no se instalo URL Rewrite ni se copiaron archivos a inetpub. IIS real no certificado.
## Bloqueos y siguiente ejecucion
1. API .env tiene SQL_USER/SQL_PASSWORD y secretos JWT, pero no E2E_VIEWER_EMAIL/PASSWORD ni cuentas equivalentes supervisor/admin. Los .env frontend solo tienen configuracion Vite. Se solicito ubicacion de credenciales de login sin revelarlas en chat.
2. Faltan casos reales v1, undefined e inactive en esta DB; no se confunden conteos cero con certificacion del caso positivo. Validated tambien carece de registros.
3. E2E/roles/responsive/performance autenticados sin ejecutar; no publicar PR listo para merge/deployment ni declarar CERTIFICADO.
4. IIS se omite por instruccion expresa posterior.

Preparar credenciales solo en archivo local ignorado de API (.env.rv-cert.local) o variables del proceso: E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD, E2E_SUPERVISOR_EMAIL, E2E_SUPERVISOR_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD. Nunca prefijarlas VITE_. El runner tambien acepta RV_CERT_CREDENTIALS_FILE (JSON local, no versionado). Reejecutar npm run e2e:edge -- --rv-real. Los resultados reales se escriben en .artifacts/rv-analytics-real/, sin tokens o passwords.

Deployment: **BLOQUEADO**. PRs: cuerpos preparados localmente; no publicados al faltar gates TEST. Merge y produccion requieren autorizacion expresa futura. Ver rv-analytics-deployment.md.
