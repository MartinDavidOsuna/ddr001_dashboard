# Validación de Fase 3 — Cierre funcional

Fecha de apertura: 2026-08-26. Estado: **SUBETAPA 3.2 — IMPLEMENTADA — PENDIENTE DEPLOYMENT Y CERTIFICACIÓN**.

## Línea base

- Dashboard: `feature/fase-2-hydrant-master-record`; Fases 1 y 2 certificadas, sin crear otra rama.
- API: `feature/fase-3-dashboard-api`, creada desde `main` `85265fd`; `main` permanece protegida.
- Flutter auditado en `main` `c01961d`; estrictamente sólo lectura.
- API productiva de referencia: `http://cifra.aquafim.com:3002/api/v1`; no se realizaron escrituras.
- No se creó ninguna rama adicional durante la implementación.

## Resultado de auditoría inicial

| Área | Resultado | Certificación Fase 3 |
|---|---|---|
| Galería | certificada: paginación, búsqueda, filtros, miniatura/original lazy, lightbox, metadata, navegación y responsive | certificada |
| Exportaciones | revisiones XLSX/CSV e hidrantes XLSX server-side con filtros y UI completa | pendiente deployment API y E2E |
| Usuarios | listado/detalle dashboard implementados; comandos controlados pendientes | implementación parcial; pendiente deployment/E2E/escrituras |
| Cuadrillas | endpoint genérico de lectura; sin módulo dashboard ni comandos controlados | pendiente |
| Jornadas | endpoint genérico de lectura; sin detalle administrativo | pendiente |
| Dispositivos | tabla existente, sin endpoint administrativo ni UI | pendiente |
| Mapa global | ausente | pendiente |
| Validación/rechazo | transición parcial existente para admin/supervisor; faltan código de rechazo, conflicto formal y UI | pendiente |
| CRUD controlado | ausente | pendiente |
| Comparador | ausente; detalles existentes pueden reutilizarse | pendiente |
| Roles/auditoría | roles y audit log reales existentes; requieren cobertura por operación | pendiente |

## Verificación HTTP de montaje

La comprobación anónima se utilizó sólo para distinguir rutas montadas de rutas ausentes; 401 significa protección y no certifica funcionalidad autenticada.

- Montadas/protegidas: galería, filtros de galería, XLSX de revisiones, usuarios, cuadrillas, jornadas y transición de estado.
- Ausentes (404): dispositivos y los nuevos recursos dashboard de usuarios, cuadrillas, jornadas, dispositivos y mapa.
- No se imprimieron credenciales, tokens, Authorization, cookies ni query strings.

## Contrato móvil congelado

El flujo Flutter usa `/field-sessions/start`, `/current`, `/refresh`, `/:id/end` y revocación/toma de sesión. El inicio puede crear o actualizar usuario, cuadrilla y dispositivo, y vincula la jornada. Fase 3 no modificará rutas, cuerpos, respuestas, auth, rotación de tokens, sincronización ni fotos de campo.

## Matriz de certificación por subetapa

| Subetapa | Implementación | Tests | Deployment API | E2E | Responsive | Estado final |
|---|---|---|---|---|---|---|
| 3.1 Galería global | completa | completos | desplegada | completo `viewer|admin` | 1440/768/390 | **CERTIFICADA** |
| 3.2 Exportaciones | completa | API/frontend completos; SQL definido no ejecutado | pendiente | preparado, no ejecutado | preparado 1440/768/390 | **IMPLEMENTADA — PENDIENTE DEPLOYMENT Y CERTIFICACIÓN** |
| 3.3 Usuarios | lectura completa; comandos pendientes | unitarios y build completos; SQL definido no ejecutado | pendiente | pendiente | UI responsive implementada | **LECTURA IMPLEMENTADA — PENDIENTE COMANDOS, DEPLOYMENT Y CERTIFICACIÓN** |
| 3.4 Cuadrillas | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.5 Jornadas | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.6 Dispositivos | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.7 Mapa global | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.8 Validación/rechazo | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.9 CRUD controlado | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.10 Comparador | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.11 Seguridad/performance | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.12 E2E general | pendiente | pendiente | no aplica por sí sola | pendiente | pendiente | pendiente |

## Evidencia requerida por módulo

Cada hito registrará endpoints reutilizados/nuevos, roles, escrituras permitidas, eventos de auditoría, pruebas y limitaciones. Las pruebas de escritura usarán DB local/test o fixtures aislados. Producción permanecerá en sólo lectura salvo autorización explícita. Si una extensión API queda pendiente de despliegue manual, la fase usará el estado **IMPLEMENTADA — PENDIENTE DESPLIEGUE API**.

## Hito 1 — Galería global

Código completado el 2026-08-26. La extensión aditiva de `GET /admin/dashboard/photos` agrega filtros server-side `technicianId`, `crewId` y `uploadStatus`, conserva búsqueda, slot, categoría, fechas y paginación, y no altera rutas móviles. `GET /admin/dashboard/photos/filters` devuelve opciones reales con conteos. Las fotografías no verificadas exponen metadata pero nunca se descargan mediante las rutas privadas, que permanecen limitadas a `verified`.

El dashboard carga miniaturas privadas al aproximarse al viewport mediante `IntersectionObserver`, solicita el original sólo al abrir el lightbox, cancela resultados obsoletos y libera cada object URL. Muestra técnico/cuadrilla/estado/dimensiones y enlaza tanto al hidrante como a la revisión. No usa el total como completitud: obligatoria/adicional continúa derivándose por los siete slots y ordinal.

Pruebas del hito: dashboard typecheck de TypeScript/Vue, lint de TypeScript y del harness E2E, 31/31 Vitest y build correctos; API type-check/lint, 235/235 unit tests y build correctos. La integración específica verificó 5/5 casos anónimos de auth/Problem Details; sus 3 casos SQL quedaron definidos pero no ejecutados porque no se habilitó `RUN_SQL_INTEGRATION`. `npm install` fue necesario en el checkout API; el árbol actual reportó 7 vulnerabilidades (3 moderadas, 4 altas), sin aplicar corrección automática.

### Corrección determinista de autenticación E2E

El bloqueo observado provenía del harness: la existencia de `E2E_REFRESH_TOKEN` decidía la ruta inicial y la siembra de `sessionStorage` aun cuando también había email/password. Esto abría `/dashboard`, disparaba `auth.restore()` y convertía `/admin/auth/refresh` en la primera petición antes de usar el formulario.

La selección ahora es explícita y está probada: email+password gana incluso si existe un refresh residual; sólo refresh usa restauración; ninguna configuración falla claramente. En modo credenciales se abre `/login` con sesión limpia, se exige específicamente `POST /api/v1/admin/auth/login` 200, navegación a `/dashboard`, rol administrativo soportado y refresh nuevo persistido. `/admin/auth/me` es la fuente del rol: admite exclusivamente `viewer|admin`, contrasta el indicador visual y exige que no cambie tras la recarga. La recarga exige después y por separado `POST /api/v1/admin/auth/refresh` 200. El diagnóstico sólo imprime booleanos de presencia, modo y rol, nunca valores secretos. La corrección no cambia store, cliente API, router, LoginView, API, producción o Flutter.

La búsqueda E2E se alineó con su contrato global real. El término debe viajar como parámetro `search` del `GET /admin/dashboard/photos`, y cada resultado debe coincidir al menos en cuenta, técnico, cuadrilla, etiqueta o código de slot, con normalización de mayúsculas. Ya no se supone que todas las coincidencias provienen exclusivamente de `accountNumber` ni que la primera cuenta sea única.

El recorrido Edge detectó que la imagen ampliada interceptaba los controles del lightbox. La imagen transformada ahora está confinada en un viewport recortado y separado; toolbar, navegación y cierre tienen capas superiores explícitas. El zoom mantiene límites 100%–300% y regresión unitaria para aumento, reducción y ambos límites. El E2E conserva clics reales, sin `force: true` ni ejecución directa de JavaScript.

### Certificación productiva posterior al deployment

El responsable confirmó integración a `main`, deployment manual y smoke tests. El precheck read-only del 2026-08-26 confirmó `GET /health/live` 200, `GET /health/ready` 200, galería y filtros 401 `application/problem+json` sin token, y la ruta móvil congelada `GET /hydrants` 401. No se realizaron escrituras ni un nuevo deployment.

Se amplió el único harness `scripts/edge-e2e.mjs` para login runtime seguro o refresh temporal, verificación estricta del rol `viewer|admin` antes y después del refresh, filtros individuales/combinados/limpieza, paginación/page size, clasificación obligatoria/adicional, lazy loading por patrón de red, original privado, caso no verificado cuando exista, lightbox, zoom, metadata, navegación, overflow responsive, consola/red, cuatro capturas obligatorias y logout. El script genera métricas sanitizadas en `.artifacts/edge/gallery-certification.json` y nunca persiste ni imprime secretos.

Las tarjetas distinguen visualmente `Obligatoria` o `Adicional`, y el lightbox incorpora la categoría en una línea compuesta de metadata. El E2E autenticado certificó la galería productiva, filtros, paginación, original, zoom, navegación, consola/red y responsive 1440/768/390. La categoría y el resto de metadata se validan contra la fotografía realmente abierta: rubro, cuenta, revisión, fecha, técnico, cuadrilla opcional, estado y dimensiones.

## Subetapa 3.2 — Exportaciones

Implementación completada el 2026-08-27. La API conserva y filtra `GET /admin/dashboard/exports/inspections.xlsx`, agrega `GET /admin/dashboard/exports/inspections.csv` y `GET /admin/dashboard/exports/hydrants.xlsx`, todos protegidos y de lectura para `viewer|admin|supervisor`. No se alteró Flutter, ninguna ruta móvil, base de datos o migración.

Las consultas construyen conjuntos filtrados y agregados en servidor, sin paginación ni N+1. Revisiones acepta los filtros reales de su listado; hidrantes los del expediente maestro. El XLSX separa Estado RV de Estado última revisión y expresa `x/7 obligatorias` junto al total; no contiene municipio/localidad. XLSX incluye freeze/autofilter/tipos/anchos y CSV incluye BOM UTF-8, CRLF y escape correcto. Ambos formatos neutralizan prefijos de fórmula mediante apóstrofo.

El dashboard permite Revisiones XLSX, Revisiones CSV e Hidrantes XLSX con filtros, carga, error y éxito. Descarga por Blob autenticado, valida Content-Disposition, usa fallback seguro y revoca el object URL. El Edge E2E existente se amplió bajo el opt-in `E2E_CERTIFY_EXPORTS=true` para validar las tres descargas, filtro server-side, MIME, filename, tamaño, consola/red y 1440/768/390; no se ejecutó contra producción porque las rutas nuevas aún requieren deployment manual.

Validación API: type-check y lint sin fallos; 238/238 unitarios; integración no SQL 7 passed y 14 skipped; build correcto. Las cinco integraciones SQL de exportación/galería permanecen definidas y omitidas porque `RevisionVisualStarter_Test` no fue confirmada mediante `RUN_SQL_INTEGRATION=true`. Validación frontend: typecheck, lint, Vitest y build correctos; se cubren filtros, selección, filename seguro, Blob/revocación y error sin stacktrace. El warning conocido de ECharts ~535 kB permanece sin cambio.

## Subetapa 3.3 — Usuarios

Se implementaron en la rama API de Fase 3 `GET /admin/dashboard/users` y `GET /admin/dashboard/users/:id`. Ambos requieren autenticación administrativa y son de sólo lectura para `viewer|admin|supervisor`. El listado valida búsqueda, cuadrilla, estado, actividad y tamaños 25/50/100; sus parámetros SQL son tipados y los agregados de revisiones, jornadas y dispositivos evitan N+1. El detalle incluye actividad agregada, diez revisiones recientes y diez jornadas recientes. No hubo migraciones, escrituras ni cambios en Flutter.

El dashboard incorporó listado y detalle responsive, búsqueda con debounce, filtros, paginación, estados de carga/error/vacío, enlaces a revisiones y representación explícita de datos ausentes. No inventa número de empleado ni rol operativo. Validación frontend: typecheck y lint correctos, 40/40 Vitest y build correcto; Vite conserva el warning conocido de ECharts y además avisa que el Node 20.14 del entorno es inferior a su recomendación 20.19+, aunque el build terminó correctamente. Validación API: type-check/lint, 241/241 unitarios y build correctos; integración no SQL 9 passed y 16 skipped. Las dos rutas nuevas respondieron 401 Problem Details sin token. Las dos pruebas SQL autenticadas quedan opt-in con `RUN_SQL_INTEGRATION=true` y exigen `RevisionVisualStarter_Test`.

Los comandos de usuario siguen pendientes: antes de habilitarlos deben fijarse concurrencia por `row_version`, auditoría before/after, roles de escritura, conflictos 409 y coexistencia con la actualización de identidad realizada por `/field-sessions/start`. El estado de la subetapa es **LECTURA IMPLEMENTADA — PENDIENTE COMANDOS, DEPLOYMENT Y CERTIFICACIÓN**.
