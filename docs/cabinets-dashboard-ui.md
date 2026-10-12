# Nuevos Hidrantes — Macroetapa 3

Frontend administrativo de consulta de gabinetes. No implementa mutaciones, entrega formal, cambios Field, almacenamiento, SQL productivo ni despliegue.

## Dependencia certificada

Contrato: [ddr001_api PR #16](https://github.com/MartinDavidOsuna/ddr001_api/pull/16), rama `feat/cabinets-admin-api`, commit **`fbae6771c8457d623f652427ada9ac853f381f1f`**. PR abierto, draft y sin integrar al verificar el 12 de octubre de 2026. No asumir que API `main` contiene estos endpoints ni desplegar el frontend antes de integrar la dependencia.

Fuentes leídas en ese checkout: `docs/cabinets-admin-dashboard-api.md`, `docs/cabinets-admin-validation-report.md`, `docs/openapi.yaml` y rutas/repositorio/DTO administrativos. No se modificó el backend.

`scripts/generate-cabinets-contract.mjs` selecciona los esquemas CabinetAdmin y sus referencias desde OpenAPI: 26 esquemas, no una copia completa del documento. Genera tipos TypeScript y un snapshot de validación. Las respuestas JSON se validan en el límite API; un cambio incompatible muestra un error de contrato sin datos privados. El modo `--check` compara el snapshot con el checkout y comprueba las siete rutas GET.

## Navegación y permisos

| Ruta | Uso |
| --- | --- |
| `/levantamientos/bases` | Listado existente de Bases |
| `/levantamientos/bases/:surveyId` | Expediente existente de base |
| `/levantamientos/nuevos-hidrantes` | Indicadores, filtros y listado administrativo |
| `/levantamientos/nuevos-hidrantes/:cabinetId` | Expediente de nuevo hidrante |
| `/levantamientos/acceso-restringido` | Explicación de acceso insuficiente |
| `/levantamientos` | Redirect compatible a Bases |
| `/levantamientos/:surveyId` | Redirect compatible al detalle de base; conserva query/hash |

El sidebar agrupa **Bases / Nuevos Hidrantes** bajo Levantamientos. Funciona con sidebar expandido, colapsado, tablet/móvil y teclado: botón, `ArrowDown`, tabulación y `Escape` con retorno de foco. Las rutas estáticas tienen prioridad sobre el parámetro legacy.

Nuevos Hidrantes se muestra sólo a `admin` y `supervisor`. El guard protege tanto listado como detalle directo. `viewer` mantiene Bases y las demás funciones; tampoco carga gabinetes desde Dashboard o mapa Todos. El permiso de Bases no se reutiliza para autorizar gabinetes. El servidor sigue comprobando los permisos y una respuesta 403 tiene presentación propia.

Se conservan nombres de rutas de Bases, contratos, métricas y state machines. Se corrigen denominaciones visibles a Bases y enlaces canónicos. No cambia el `base` de Vite ni la configuración IIS; los E2E de gabinetes también ejercitan `/ddr001/`.

## API consumida

Prefijo completo: **`/api/v1/admin/dashboard/construction/cabinets`**. El cliente Axios ya tiene `/api/v1` en `VITE_API_BASE_URL`; el servicio utiliza el sufijo `/admin/...`, sin duplicarlo.

| GET | Consumo |
| --- | --- |
| `/summary` | KPIs, hitos, metas, porcentajes e integridad almacenada |
| `/metrics` | Modelos, estados, variantes, empresas, incompletos, eventos y ciclos |
| raíz | Paginación server-side; filas completas, sin N+1 |
| `/:cabinetId` | Un expediente con sus bloques administrativos |
| `/map` | Instalaciones cerradas válidas con GPS; `limit`, `truncated`, `layer` |
| `/:cabinetId/photos/:photoId/thumbnail` | Miniatura lazy autenticada |
| `/:cabinetId/photos/:photoId/content` | Original sólo al abrir el lightbox |

Respuestas JSON directas, sin inventar un envelope `data`. No se descargan expedientes para construir estadísticas. El catálogo de empresas se obtiene de `metrics.companies`, que representa la cuadrilla actual de la base vinculada; no se usa la empresa del residente. Una consulta independiente sin filtros conserva opciones de empresa al filtrar el listado.

## Indicadores

La página combina resumen, gráficas, filtros y tabla. Resumen, métricas y listado tienen cargas y errores independientes. `/dashboard` conserva Revisiones, Bases y Diagnósticos y agrega una sección ejecutiva `CabinetDashboardSection` con avance, registro, instalación, entregables, incompletos, variantes, modelo y acceso al módulo.

Las metas y porcentajes proceden de API (`target`, `targets`, `models[].target`); no se hardcodean 460 ni las metas A1–A4 en Vue. `registeredMilestone` e `installedMilestone` son hitos. `registered`, `validated`, `installed`, `deliverable`, etc. son estados actuales. No se suman estados para simular hitos.

La gráfica de estados formales excluye `draft`; sus borradores técnicos se muestran aparte. El modelo compara meta, registro alcanzado, instalación válida y entregables, además de una tabla numérica. Variante compara estándar/automatizado por estado, sin inventar una meta por automatización. Actividad utiliza directamente `registered`, `validated`, `installations`, `finalApprovals`, `invalidations` y `date`; no reconstruye eventos desde `updatedAt`.

Empresa muestra total/incompletos/validados/instalados/entregables e incluye **Sin empresa / Sin asignación**. Los ciclos consumen los tres promedios de segundos y sus conteos de pares; null muestra **Sin datos suficientes**, nunca cero inventado. Incompletos utiliza las agrupaciones modelo/variante del DTO, sin deducir causas de observaciones libres.

Los contadores de evidencia/integridad son **al último chequeo almacenado**: confirmadas, problemas, faltantes, desconocidas y chequeo más antiguo. No son una garantía actual. Expediente y rutas de fotografía verifican integridad en vivo y muestran `checkedAt`.

## Listado y filtros

Query string conserva `search`, `uid`, `accountNumber`, `status`, `model`, `automated`, `crewId`, `baseSurveyId`, `from`, `to`, `page`, `pageSize`. Aplicar filtros vuelve a página 1. Recargar, atrás/adelante y compartir recuperan la consulta. Entrar al expediente y volver conserva esos parámetros. Tamaños: 10/25/50/100. No existe filtrado local de una colección de 460 filas.

Modelo A1/A2/A3/A4 y variante `true`/`false` son independientes. Se conserva `automated=false`; `displayModel` es la presentación entregada por API. UID visible usa `formattedUid`; búsqueda general/UID aceptan canónico o con guiones. Cuenta y serie son texto y preservan ceros iniciales.

Fechas del selector son días de **Hermosillo (UTC−07:00)**. `from` se convierte al inicio inclusivo del día; `to` al inicio exclusivo del día siguiente. No se envía el inicio del mismo día como límite final. Se valida el calendario, incluyendo límites de mes/año. Listado/resumen/distribuciones filtran **registro completado**; actividad filtra **fecha del evento**. Presentación de timestamps reutiliza el helper de fecha existente con zona Hermosillo; no se alteran las fechas UTC originales.

Tabla desktop: UID, modelo, estado, base, cuenta de instalación, empresa, registro, validación, instalación, revisión final y evidencia/último chequeo. El enlace UID abre detalle. En móvil se transforma en cards con labels; el scroll de tablas auxiliares queda dentro de su contenedor, sin desbordar la página.

## Expediente

Un GET alimenta `identification`, `base`, `pieces`, `installation`, `finalReview`, `catalog`, `photos`, `history`, `evidencePolicy`, `synchronization`. Cabecera: UID, modelo/variante, estado, versiones de catálogo/política y fechas. Null de empresa/base/cuenta/fechas/GPS/última captura no se sustituye por valores falsos.

Base conserva ambas cuentas y la advertencia `accountDiscrepancy`. El enlace **Ver expediente de base** usa `/levantamientos/bases/:surveyId`, nunca `dossierUrl` como navegación browser. GPS canónico de base, instalación y fotografías permanecen separados. La distancia es informativa, sin umbral de aprobación frontend.

Piezas agrupadas por `pieces.groups[].position` y `partCodes`: definición, cantidad/instancia, presencia, serie, estado, observaciones, pendientes, última captura y fotografías relacionadas. Se conservan todos los intentos de validación. Las fotografías por pieza son opcionales conforme a `piece_photos_optional_series_required`; su ausencia no se convierte en error.

Checklist usa exclusivamente preguntas históricas entregadas por `installation.checklist`, agrupadas por el `group` real y con respuestas/razones/pendientes/assessment/impact/evidence/capturedBy. No se hardcodean 84 preguntas ni se usa la política actual para reconstruir expedientes antiguos. Se diferencian datos guardados de instalación cerrada/válida y se muestran capturas/cierres históricos.

Pendientes preservan clasificación backend y enlazan al sujeto: **Bloqueante**, **Observación menor**, **Prueba obligatoria pendiente**. No se reevalúan bloqueos. Revisión final utiliza la proyección backend, conserva correcciones, intentos e invalidaciones. Una aprobación histórica invalidada tiene advertencia visible; no implica entregable vigente.

Timeline presenta operación, actor, captura Field, recepción servidor, versiones y resultado. Acordeones conservan datos de intentos y snapshots históricos sin mostrar JSON bruto por defecto.

| Código | Label |
| --- | --- |
| `draft / registered / incomplete` | Borrador / Registrado / Incompleto |
| `validated / installed / deliverable` | Validado / Instalado / **Hidrante entregable** |
| `captured / pending / illegible` | Capturada / Pendiente / Ilegible |
| `unavailable / optional_not_captured / not_applicable` | No disponible / Opcional sin capturar / No aplica |
| `yes / no / not_checked / not_applicable` | Sí / No / No comprobado / No aplica |
| `approved / correction_required / approval_invalidated` | Aprobado / Corrección requerida / Aprobación invalidada |
| `affected_data_pending / mandatory_tests_pending` | Datos afectados pendientes / Pruebas obligatorias pendientes |
| `pending_review / not_installed` | Pendiente de revisión / No instalado |

## Fotografías y mapa

Galería por contexto, un archivo por `photoId` con varias relaciones/chips de pieza/pregunta/registro/revisión. Las miniaturas se descargan sólo cerca del viewport. Los originales sólo al abrir un `<dialog>` accesible, con botón de cierre y Escape. Sólo se admiten URLs relativas de las dos rutas administrativas de fotografía, emitidas por API; no se adjunta un bearer a hosts arbitrarios.

Blobs usan generación, abort y revocación al reemplazar/cerrar/desmontar. Las respuestas obsoletas revocan su object URL y no reemplazan la foto vigente. HTTP 404/409/503 y errores de decodificación se muestran en esa fotografía, con reintento, sin perder expediente.

Mapa conserva `hydrants`, `construction` = **Bases**, `diagnostics` y agrega `cabinets` = **Nuevos Hidrantes**. No se fabrican puntos desde GPS de base o fotografía. Popup muestra UID, modelo, estado, cuenta, base, empresa, precisión e instalación y enlaza al nuevo expediente. Colores de las capas previas se conservan; estados de gabinete tienen claves `cabinet_*`. Todos filtra por roles antes de enviar requests. Filtros nuevos: estado/modelo/variante/empresa, búsqueda y fechas compartidas, además del bbox y límite existentes. `truncated` conserva el aviso de conteos parciales. Una falla de gabinetes no destruye snapshots de otras capas.

## Errores y concurrencia

400: filtros inválidos; 401: flujo global de sesión; 403: rol insuficiente; 404: gabinete/foto inexistente; 409: integridad de foto; 422: identificador inválido; 503: módulo/read model/política histórica todavía no disponible o actualizado; 500: error inesperado. No se muestran stacks/paths ni se convierte cualquier error en “Sin conexión”.

Listados, métricas y expediente usan AbortController más generación. Al cambiar consulta se vacían datos anteriores y sólo la respuesta vigente puede publicarse. Cada recurso tiene carga, vacío, error y reintento. Fotos y gráficas pueden fallar independientemente de la tabla.

## Pruebas y reproducción TEST

Node 22. Instalación `npm ci`. Comandos de calidad y resultados: [informe de validación](cabinets-dashboard-validation.md).

```powershell
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
npm run test:cabinets-contract -- C:/DEV/AQAGS/ddr001_cabinets_admin --check
npm run e2e:cabinets-ui
```

El último comando es **UI con mocks**, incluido login administrativo simulado, cuatro resoluciones y roles. Fixtures de gabinetes están separadas de Bases y no se importan por producción. Tipos/contratos/nulls/series/estados/filtros/fechas/paginación/rutas/roles/errores/gráficas/fotos/relaciones/integridad/races/revocación y mapa tienen tests unitarios.

Para TEST real, el harness frontend carga el backend controlado sin modificar su checkout. Requiere su `.env.cabinets-test.local` ignorado, `NODE_ENV=test`, `CONFIG_PROFILE=construction-test`, base `DDR001_Hidrantes_TEST`, storage `.storage/construction-test` y SQL Server 2014/compatibilidad 120. Antes de abrir el servidor verifica el HEAD y consulta la identidad real de SQL. Rechaza otros destinos.

```powershell
# Terminal 1, cwd del checkout API certificado, dependencias API ya instaladas
$env:CABINETS_API_CHECKOUT='C:/DEV/AQAGS/ddr001_cabinets_admin'
.\node_modules\.bin\tsx.cmd C:/DEV/AQAGS/ddr001_dashboard_cabinets/scripts/cabinets-test-api.ts

# Terminal 2, cwd del worktree frontend
C:/DEV/AQAGS/ddr001_cabinets_admin/node_modules/.bin/tsx.cmd scripts/cabinets-api-test.ts
npm run e2e:cabinets-real
```

Servidor acotado a `127.0.0.1:3016`. No ejecuta migrations, seeds, reconstrucciones, jobs, comandos Field ni SQL de escritura directo. La verificación de integridad normal del backend puede actualizar su chequeo TEST. Los tokens se emiten mediante la función real del backend para usuarios administrativos TEST **existentes y activos**, sin reset de contraseña ni alta de usuarios. Alternativa opcional: configurar localmente `CABINETS_TEST_EMAIL` y `RVS_TEST_ADMIN_PASSWORD`; nunca guardar credenciales en Git.

La ejecución efectuada usa **bearers TEST emitidos**, autorizados por el usuario. El browser intercepta solamente el bootstrap de refresh y envía las lecturas a la API real; `/auth/me`, contratos y permisos se comprueban en backend. No certifica login con contraseña ni rotación real de refresh. Los demás GET administrativos son HTTP reales. Tiles de mapa se simulan para evitar dependencia externa. Evidencia/token/session quedan en `.artifacts/` ignorado; no subirlos al PR.

## Límites reales

PR API #16 pendiente de integración. TEST disponible tiene siete gabinetes; la integración no prueba escala productiva ni todos los estados históricos con archivos íntegros. Los estados especiales y concurrencia se cubren con fixtures; fotos faltantes muestran errores localizados. No se certifica contraseña administrativa real. Datos históricos sin base/empresa/captura/fechas/ciclos permanecen desconocidos; una política histórica ausente debe producir 503, nunca ser reemplazada por la vigente.

Macroetapa 4 coordinará integración y despliegue. Esta entrega no publica `dist`, no copia a IIS, no modifica producción y no realiza merge.
