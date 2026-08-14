# Validación de Fase 1

Fecha: 2026-08-13. Estado: **IMPLEMENTADA — API CERTIFICADA — PENDIENTE CERTIFICACIÓN E2E VISUAL RESPONSIVE**.

Ambiente de certificación: dashboard local Vite y servicio real `http://cifra.aquafim.com:3002` (`/api/v1`). Autenticación realizada con usuario READ_ONLY configurado para certificación. No se almacenaron ni documentaron contraseña, tokens o headers Authorization.

## Implementado

- Vue 3/TypeScript/Vite con Pinia, Router, PrimeVue theme, ECharts y Leaflet/OSM.
- Login exclusivamente administrativo, refresh rotatorio, cola de reintento 401, logout, guard y restauración de sesión.
- Layout alineado a Figma: sidebar colapsable/drawer, header compacto, alta densidad, tarjetas móviles y tabs navegables.
- Dashboard con KPIs, estados, actividad, técnicos y fotos verificados desde agregados reales.
- Lista RV paginada y filtrada server-side por búsqueda, técnico, cuadrilla, estado, fechas y presencia GPS.
- Detalle con encabezado, completitud dinámica, resumen, checklist por versión, fotografías, miniaturas, lightbox/original bajo demanda, mapa, señal, historial y auditoría JSON expandible.
- Estados loading/skeleton, vacío, error, not found, forbidden por Problem Details e imagen no disponible.
- Rutas futuras preparadas sin mocks.

## Endpoints reutilizados

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/refresh`
- `POST /api/v1/admin/auth/logout`
- `GET /api/v1/admin/auth/me`
- Los endpoints admin originales se conservaron; `/admin/summary` sirvió para mantener la fórmula autoritativa de “revisado”.

## Endpoints creados

- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/filters`
- `GET /api/v1/admin/dashboard/inspections`
- `GET /api/v1/admin/dashboard/inspections/:id`
- `GET /api/v1/admin/dashboard/inspections/:id/photos/:photoId/thumbnail`
- `GET /api/v1/admin/dashboard/inspections/:id/photos/:photoId/content`

Todos son lecturas protegidas por JWT administrativo. No se cambió ruta/body/response/autenticación de campo, no hubo DDL ni migración.

## Diferencias Figma/backend

- Municipio y localidad se eliminaron por decisión funcional, aunque existen en Figma/DDL legacy.
- 77/77 se sustituyó por el conteo de la versión real. Fotografías distingue los siete slots obligatorios de N fotos totales.
- No se muestran tipo de hidrante, meta diaria ni anomalías derivadas sin fuente vigente.
- Señal muestra generación/dBm/nivel literal sin inventar calidad humana.
- En móvil la tabla se transforma en tarjetas y los filtros son un panel compacto.

## Decisiones del diccionario

El identificador operativo es `account_number`; la cuadrilla histórica proviene de `work_session`; GPS de revisión proviene de `location_samples` y se diferencia de coordenada maestra; respuestas se interpretan por `field_type`; fotos sólo son disponibles cuando están activas/verificadas y el archivo privado existe. La divergencia entre `main` y ramas recientes quedó registrada en `dashboard-data-dictionary.md`.

## Pruebas ejecutadas

### Frontend

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm test`: 5 pruebas correctas (false booleano, N/A, unidad/arrays, agrupación/conteo dinámico y siete slots obligatorios).
- `npm run build`: correcto con chunks por ruta.

Resumen exacto: 1 archivo de pruebas, 5 tests passed, 0 failed, 0 skipped. Typecheck, lint y build terminaron con exit code 0.

### API

- `npm run type-check`: correcto.
- `npm run lint`: correcto.
- `npm test`: comando correcto; 13 integraciones existentes omitidas por configuración de entorno, ninguna falla.
- `npm run build`: correcto.
- Test unitario de clasificación fotográfica ejecutado directamente: 1 archivo, 2 passed, 0 failed, 0 skipped.
- Readiness local contra DB configurada: HTTP 200.
- Acceso anónimo a endpoint nuevo: HTTP 401 Problem Details, confirmando protección administrativa.

Resumen exacto de `npm test`: 0 passed, 0 failed y 13 skipped en 7 archivos de integración excluidos por el script. La configuración confirmó una base local separada `RevisionVisualStarter_Test`; se ejecutó además `RUN_SQL_INTEGRATION=true npm run test:integration` exclusivamente contra esa base: 8 archivos passed, 14 tests passed, 0 failed, 0 skipped. Ninguna integración se apuntó al servicio real.

## Certificación autenticada contra servicio real

- Contrato confirmado: `POST /api/v1/admin/auth/login`, no autenticación de campo.
- Login: HTTP 200; access token y refresh token recibidos correctamente.
- Rol real: `viewer`, principal `kind=admin`.
- Expiración presente en el JWT; no se registró el token.
- Refresh: HTTP 200; nuevo access y refresh recibidos; `/admin/auth/me` posterior HTTP 200.
- Logout: HTTP 204. La SPA elimina ambos tokens y el usuario de Pinia en `finally`; un access JWT ya emitido sigue siendo válido hasta expirar, comportamiento normal del contrato actual.
- CORS desde `http://localhost:5173`: preflight HTTP 204 y origen permitido correcto.
- No hubo loops de refresh ni tokens impresos por el código frontend; no existen `console.log`/`console.debug` en `src`.

### Bloqueo de despliegue detectado

> Registro histórico previo al despliegue. El bloqueo quedó resuelto en la certificación post-deploy descrita al final de este documento.

El servicio real responde HTTP 404 para:

- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/filters`
- `GET /api/v1/admin/dashboard/inspections`

Detalle devuelto: la ruta no fue encontrada. Esto demuestra que `feature/dashboard-fase-1-api` no está desplegada en el ambiente de certificación. No es un rechazo del rol READ_ONLY: el mismo usuario `viewer` obtuvo HTTP 200 en las lecturas administrativas legacy.

Endpoints reales legacy verificados como lectura:

- `GET /api/v1/admin/summary`: HTTP 200; 1,216 hidrantes, 299 revisados, 917 pendientes, avance 24.59%.
- `GET /api/v1/admin/inspections?page=1&pageSize=10`: HTTP 200; página 1, 10 elementos, total 372.
- `GET /api/v1/admin/inspections/:id`: HTTP 200 para la revisión seleccionada.

## Revisión real utilizada

Identificador: `89E9B8A5-2517-4642-9E03-0162688426F6`.

Comparación JSON disponible en API legacy:

| Campo | Lista | Detalle | Resultado |
|---|---|---|---|
| Hidrante | `002` | `002` | Coincide |
| Técnico | BRAYANJESUS CAMPOS CORNEJO | mismo | Coincide |
| Cuadrilla | CUADRILLAAQUAFIM | misma | Coincide |
| Estado | `submitted` | `submitted` | Coincide |
| Revisión | 2 | 2 | Coincide |
| Respuestas | — | 19 | Presentes |
| Fotografías | 9, todas verificadas | 7 obligatorias + 2 adicionales; 9 total | Coincide |
| GPS | — | presente | Presente |
| Señal | — | presente | Presente |
| Historial | — | 1 evento | Presente |
| Auditoría | — | 7 eventos | Presente |

No fue posible comparar estos datos con la UI: ésta consume correctamente los contratos nuevos, que aún no existen en el servicio desplegado. Tampoco fue posible abrir una fotografía mediante la ruta administrativa nueva por el mismo 404; no se sustituyó con un placeholder ni con un endpoint de campo.

Clasificación confirmada contra los registros reales: los siete slots obligatorios `front_closed`, `left_side`, `right_side`, `back`, `top`, `front_open` y `serial_plate` están cubiertos; faltantes: ninguno. Existen dos fotos adicionales: una con código `general:<UUID>` y un segundo registro `right_side`. Resultado: **7/7 obligatorias, 2 adicionales, 9 totales**. Ningún registro fue modificado, eliminado u ocultado.

## E2E obligatorio

| Paso | Resultado |
|---|---|
| Arranque API + DB | Correcto, API escuchando y readiness 200 |
| Arranque SPA | Correcto en Vite |
| Login admin READ_ONLY | Correcto: HTTP 200, rol `viewer` |
| Renovación | Correcta: HTTP 200 y `/auth/me` HTTP 200 con el par rotado |
| Dashboard y Revisiones en UI | Bloqueado: endpoints dashboard HTTP 404 en servicio real |
| Inspección de revisión real/fotos/checklist/GPS/señal/historial/auditoría | Datos confirmados en endpoint legacy; UI bloqueada antes de poder abrirlos |
| Responsive visual 1440/768–1024/390 | No certificable: navegador conectado reportó `No browser is available`; además falta el despliegue API |
| Refresh en ruta detalle | Lógica validada por build y refresh real, pero recorrido visual bloqueado |
| Logout/protección SPA | Logout API HTTP 204 y limpieza/guard implementados; recorrido visual bloqueado |

No se usaron mocks para reemplazar esta evidencia y no se marcó el E2E como aprobado artificialmente.

## Riesgos conocidos y pendientes

- Fase 1 queda implementada, pero no puede declararse CERTIFICADA hasta desplegar `feature/dashboard-fase-1-api` en el ambiente indicado y repetir el recorrido visual con navegador disponible.
- `main` de API contiene DDL de fotos condicionales cuyo uploader de campo aún enumera siete slots. El visor tolera datos/slots dinámicos; la corrección del flujo de carga corresponde a coordinación móvil/API y no fue alterada aquí.
- La persistencia de refresh en `sessionStorage` es una solución razonable SPA, pero una cookie HttpOnly requeriría un cambio contractual coordinado.
- El filtro de completitud fotográfica no se expuso: la aplicabilidad condicional no puede resolverse correctamente con una simple comparación de conteos en el contrato `main`. Se evitó un filtro falso.
- READ_ONLY usa el rol real `viewer` del backend; no se implementó seguridad simulada sólo en UI.

## Integración y pre-deploy

- Commit de implementación API: `0f93b6b`.
- PR de integración: `#5`, integrada a `main`.
- Merge commit en `main`: `28ca304`.
- Commit dashboard publicado: `3aad950`.
- No existen migraciones, DDL, seeds, dependencias o configuración productiva en el diff.
- Pre-deploy público posterior al merge: `health/live` HTTP 200, `health/ready` HTTP 200 y `version` HTTP 200.
- La ruta protegida `/api/v1/admin/dashboard/summary` continúa HTTP 404, por lo que el merge de GitHub todavía no está desplegado.
- El endpoint de versión del servidor reporta commit y fecha de build desconocidos. La documentación admite NSSM o PM2, pero este entorno no permite identificar el proceso, directorio/artefacto activo ni un respaldo recuperable. Se detuvo el despliegue antes del restart conforme al checklist; no hubo incidente ni rollback.
- Rollback previsto cuando el operador identifique el servicio: respaldar el artefacto activo, restaurar ese `dist`/commit si falla, reiniciar mediante el gestor confirmado y repetir live/ready/ruta móvil.

## Certificación post-deploy contra API productiva

Fecha efectiva: 2026-08-13 (zona America/Hermosillo). API: `http://cifra.aquafim.com:3002/api/v1`.

### Salud, versión y regresión

- `GET /health/live`: HTTP 200.
- `GET /health/ready`: HTTP 200.
- `GET /version`: HTTP 200, versión `1.0.0`, ambiente `production`; `commit` y `builtAt` continúan como `unknown`.
- `GET /hydrants` sin token: HTTP 401.
- `GET /checklists/rv/active` sin token: HTTP 401.
- `GET /admin/dashboard/summary` sin token: HTTP 401, no 404. Las rutas nuevas están montadas y protegidas.
- Preflight CORS desde `http://localhost:5173`: HTTP 204.

### Autenticación viewer

- Login administrativo: HTTP 200; access y refresh recibidos sin imprimirlos ni persistirlos.
- `GET /admin/auth/me`: HTTP 200, `kind=admin`, rol `viewer`.
- Refresh: HTTP 200; ambos tokens rotados.
- Logout con access y refresh vigentes: HTTP 204.

### Summary, filtros y revisiones

- Summary autenticado: HTTP 200. Métricas: `totalHydrants`, `reviewedHydrants`, `pendingHydrants`, `progressPercent`, `totalInspections`, `inspectionsToday`, `verifiedPhotos`, `byStatus`, `activity` y `byTechnician`. Coinciden con las fórmulas de `dashboard-metrics.md`.
- Valores al corte: 1,216 hidrantes, 300 revisados, 916 pendientes, 24.67% de avance, 376 inspecciones, 61 del día y 3,254 fotos verificadas.
- Filtros: HTTP 200; 21 técnicos, 25 cuadrillas y estados `conflict`, `in_progress`, `submitted`. No existen municipio ni localidad.
- Lista paginada: HTTP 200; total 376. Página 1 y página 2 solicitaron 10 y devolvieron 10 elementos cada una.
- Estado `submitted`: HTTP 200, total 300; todos los elementos comprobados coinciden.
- Búsqueda `002`: HTTP 200, total 2; todos los resultados contienen el identificador.
- Rango 2020–2030: HTTP 200, total 376 y sólo 10 elementos en la página; filtrado y paginación permanecen server-side.

### Revisión real y contratos

Revisión `89E9B8A5-2517-4642-9E03-0162688426F6`: HTTP 200; hidrante `002`, revisión 2, estado `submitted`.

- Checklist dinámico: 9 secciones, 86 items y 19 respuestas presentes; 0 respuestas N/A en esta inspección. Labels, tipos y orden de sección/item están incluidos y el orden fue validado. Tipos observados: boolean, coordinates, decimal, integer, photo, readonly, select, signal y text. El frontend itera este contrato; no contiene una lista fija de preguntas.
- Fotografías: 7 requeridas, 7 cubiertas, ninguna faltante, 2 adicionales y 9 totales. Slots obligatorios: `back`, `front_closed`, `front_open`, `left_side`, `right_side`, `serial_plate`, `top`. Adicionales: `general:<UUID>` y un segundo `right_side`.
- Una miniatura privada: HTTP 200, `image/webp`, transferencia chunked sin Content-Length.
- La misma foto completa: HTTP 200, `image/jpeg`, transferencia chunked. No se imprimieron ni descargaron masivamente bytes.
- GPS: presente; latitud 22.1493576, longitud -102.2816975, precisión horizontal 16.645 m, captura `2026-08-04T15:36:15.246Z`.
- Señal: presente; 4G/LTE, -104 dBm, captura `2026-08-04T15:36:15.634Z`. No se deriva una clasificación humana.
- Historial: 1 evento real, `in_progress → submitted`, actor de campo y fecha presentes; comentario ausente en este evento.
- Auditoría: 7 eventos; acciones de respuestas, ubicación, señal y envío. Actor/fecha presentes; 5 eventos tienen `beforeJson` y los 7 tienen `afterJson`, conservados para expansión.

### Frontend local y límites de certificación

- Vite levantó contra la API productiva usando `.env.local` ignorado; no contiene credenciales.
- Las rutas SPA `/`, `/login`, `/dashboard`, `/revisiones` y el detalle directo respondieron HTTP 200.
- No existen `console.log` o `console.debug` en `src`.
- Typecheck, lint y build: exit 0. Vitest: 1 archivo, 5 passed, 0 failed, 0 skipped.
- Build: `DashboardView` 535.64 kB minificado/182.02 kB gzip. La causa principal es ECharts en el chunk lazy del dashboard. Leaflet queda en el chunk lazy de detalle (166.93 kB); PrimeVue se inicializa globalmente y contribuye al chunk base (273.01 kB). Optimización futura: carga aún más granular de gráficas/componentes, sin bloquear Fase 1.
- La herramienta de navegador indicó `No browser is available`. Por ello no se certifican visualmente login/redirect, persistencia tras refresh, navegación/lightbox/logout desde UI ni breakpoints 1440/768/390. La autenticación, refresh, logout, contratos y rutas se certificaron programáticamente, pero no se presenta esto como E2E visual.

## Integridad de repositorios

- Dashboard: cambios sólo en `feature/fase-1-visor-rv`.
- API: cambios sólo en `feature/dashboard-fase-1-api`.
- Flutter: ninguna modificación, rama o commit; usado exclusivamente como lectura.
