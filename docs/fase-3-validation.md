# Validación de Fase 3 — Cierre funcional

Fecha de apertura: 2026-08-26. Estado: **SUBETAPA 3.1 — PENDIENTE EJECUCIÓN E2E FINAL**.

## Línea base

- Dashboard: `feature/fase-2-hydrant-master-record`; Fases 1 y 2 certificadas, sin crear otra rama.
- API: `feature/fase-3-dashboard-api`, creada desde `main` `85265fd`; `main` permanece protegida.
- Flutter auditado en `main` `c01961d`; estrictamente sólo lectura.
- API productiva de referencia: `http://cifra.aquafim.com:3002/api/v1`; no se realizaron escrituras.
- No se creó ninguna rama adicional durante la implementación.

## Resultado de auditoría inicial

| Área | Resultado | Certificación Fase 3 |
|---|---|---|
| Galería | implementación completada en código: paginación, búsqueda, filtros explícitos, miniatura/original lazy, lightbox, metadata y navegación | pendiente de despliegue API y E2E |
| Exportaciones | XLSX de revisiones server-side sin filtros; CSV legado limitado; sin XLSX de hidrantes | pendiente |
| Usuarios | endpoint genérico de lectura; sin módulo dashboard ni comandos controlados | pendiente |
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
| 3.1 Galería global | completa | unitarios/estáticos/build completos; SQL definido no ejecutado | desplegada manualmente; precheck correcto | harness completo; pendiente ejecución con sesión `viewer|admin` | pendiente 1440/768/390 | **IMPLEMENTADA — API DESPLEGADA — PENDIENTE CERTIFICACIÓN** |
| 3.2 Exportaciones | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
| 3.3 Usuarios | pendiente | pendiente | pendiente | pendiente | pendiente | pendiente |
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

Las tarjetas distinguen visualmente `Obligatoria` o `Adicional`, y el lightbox incorpora la categoría en una línea compuesta de metadata. El E2E ya alcanza autenticado la galería productiva, filtros, paginación, original, zoom y navegación con consola/red limpias. La categoría y el resto de metadata ahora se validan contra la fotografía realmente abierta: rubro, cuenta, revisión, fecha, técnico, cuadrilla opcional, estado y dimensiones. Permanece pendiente una ejecución final completa y responsive 1440/768/390; la subetapa todavía no se declara certificada.
