# Validación — Nuevos Hidrantes Dashboard

Fecha: 2026-10-12. Repo `ddr001_dashboard`, rama `feat/cabinets-dashboard-ui`, worktree aislado `C:/DEV/AQAGS/ddr001_dashboard_cabinets`. Base inicial y remoto main verificado: `4a8b3a0a40c7296796aba59c2670474716303b4b`. El checkout original `local/admin-rv-editor` y sus cambios locales de Diagnósticos se preservaron.

## Dependencia y entorno

API PR #16 sigue abierto/draft/sin merge, HEAD `fbae6771c8457d623f652427ada9ac853f381f1f`. Se verificó al inicio y al cierre. OpenAPI vigente coincide con los 26 esquemas y siete GET del snapshot frontend. API checkout permaneció limpio, sin cambios.

Antes de conectar se verificaron configuración y SQL real: `DDR001_Hidrantes_TEST`, motor **12.0.4237.0**, compatibilidad **120**, storage TEST aislado `.storage/construction-test`. Servidor de prueba frontend/API sólo localhost. No se ejecutaron migrations, seeds, rebuilds, operaciones Field, SQL de escritura directo ni despliegue. No se modificó ninguna URL/configuración productiva.

Credenciales de ejemplo no permitieron login real. Con autorización expresa del usuario se emitieron tokens temporales mediante la función backend para actores TEST administrativos existentes. No se cambió ninguna contraseña ni se insertaron usuarios. Los tokens y respuestas locales están en `.artifacts/`, ignorado por Git.

## Resultado por comando

| Comando | Resultado | Alcance / modo |
| --- | --- | --- |
| `npm run lint` | PASS, exit 0; **0 errores / 3036 warnings** | Reglas actuales del repo; warnings de estilo en archivos compartidos/existentes. Módulo nuevo corregido sin deshabilitar reglas ni reformatear globalmente |
| `npm run typecheck` | PASS | Vue/TypeScript, sin errores ignorados |
| `npm test` | **329 PASS / 40 archivos** | Vitest; 154 pruebas existentes más 175 nuevas, DTO/roles/router/filtros/UI/galería/races/cleanup/dashboard/mapa |
| `npm run build` | PASS | Build local Vite; aviso del chunk ECharts >500 kB, carga diferida existente; `dist` no publicado |
| `git diff --check` | PASS | Sin errores de whitespace; revisión final de alcance |
| `npm run test:cabinets-contract -- C:/DEV/AQAGS/ddr001_cabinets_admin --check` | PASS | **26 esquemas / 7 GET**, OpenAPI real del HEAD certificado |
| `tsx scripts/cabinets-api-test.ts` usando ejecutable del checkout API | **22 comprobaciones PASS** | **HTTP TEST real**, página con siete registros; summary/metrics/list/map/detail/fotos, roles, UID canónico/formateado, modelo/estado/variantes/cuenta/empresa cuando disponible/fechas y página vacía |
| `npm run e2e:cabinets-ui` | **6 recorridos PASS** | **Mock UI**: admin a cuatro anchos; supervisor/viewer adicionales. Login simulado, sidebar normal/colapsado/teclado, filtros/paginación/URL, pieza/serie/checklist/revisión, relaciones/foto/Escape, retorno/mapa |
| `npm run e2e:cabinets-real` | **4 recorridos PASS** | **Browser + GET TEST reales**, bootstrap de refresh acotado; `/auth/me` real. Cuatro anchos, indicadores/listado/búsqueda/expediente/fotos/mapa. No certifica password login ni rotación real de refresh |
| `npm run e2e:construction-ui` | **15 recorridos PASS** | **Mock UI**, cinco vistas a tres anchos: Dashboard, listado/detail de Bases, Usuarios y acceso Construction; filtros/fotos/mapa/navegación conservados |
| `npm run e2e:global-map` | **5 recorridos PASS** | **Mock UI**: admin a tres anchos, viewer/supervisor desktop; Hidrantes/Revisiones/Bases/Diagnósticos/Todos, filtros/bbox/truncamiento/errores/snapshots/popups/agrupación |
| `npm run e2e:functional-diagnostics-ui` | **9 recorridos PASS** | **Mock UI**, admin/supervisor/viewer a tres anchos; base `/ddr001/` |
| `npm run e2e:administration-ui` | **6 recorridos PASS** | **Mock UI**, admin/viewer a tres anchos; Usuarios/Cuadrillas/Jornadas/Dispositivos/Revisiones y rechazo de mutaciones de viewer |

Scripts de regresión se actualizaron para las denominaciones Bases y la nueva sección administrativa. El script de Bases antes bloqueaba módulos Vite cuyo path contenía `/construction/`; ahora sólo intercepta rutas administrativas HTTP. Eso permite comprobar las vistas reales en el navegador dev, conservando aislamiento de mocks y bloqueo del host productivo.

## Browser y visual

**Microsoft Edge / Chromium headless** comprobado realmente. Nuevos Hidrantes: **1440×1000, 1024×1000, 768×1000, 390×844** tanto mock como API real. Los otros scripts usan sus tres anchos existentes 1440/768/390 y altura 1000/1024/844 según script.

Se comprobaron ausencia de overflow de página, sidebar/submenú, render lazy de los cuatro ECharts, labels mobile, filtros, expediente, lightbox/Escape, mapa, accesos y retorno con filtros. La tabla auxiliar puede desplazar dentro de su contenedor; no ensancha el documento. Galería carga originales sólo tras abrir. Unit tests cubren reemplazo rápido, respuestas obsoletas, desmontaje y revocación de URLs, thumbnail faltante, HTTP 404/409/503 y errores de imagen.

Capturas **sintéticas de mock**, sin datos reales ni credenciales:

- [Desktop](evidence/cabinets/desktop.png)
- [Móvil](evidence/cabinets/mobile.png)

Capturas completas, lightbox, mapa y resultados JSON de cada modo permanecen localmente en `.artifacts/cabinets-mock-ui` y `.artifacts/cabinets-real-ui`. No son evidencia de despliegue productivo.

## Regresiones y límites

Todas las pruebas existentes de Bases, login/auth/client, Revisiones, Hidrantes, Fotografías, Diagnósticos, Usuarios, sidebar y mapa pasan en la suite completa. Las pruebas de navegación confirman redirects legacy, precedencia de rutas estáticas y guard de ambos deep links de gabinete. Un viewer no solicita la capa `cabinets` desde Todos y mantiene Bases visible.

TEST contiene siete registros administrativos y fotografías de prueba con disponibilidad/integridad variable. No se certifica escala productiva, login con contraseña real, rotación real de refresh ni todos los estados históricos mediante browser real. Esos estados se cubren con fixtures estrictos y pruebas unitarias: estándar/automatizado, seis estados, ausencia de base/empresa, discrepancia de cuenta, seis estados de serie/ceros iniciales, foto compartida, integridad, aprobación invalidada/corrección/prueba obligatoria, múltiples intentos y última captura null.

Datos históricos ausentes se conservan desconocidos. Política histórica ausente/read model sin preparar se presenta como 503, sin sustituir el catálogo congelado ni sugerir borrar datos. La dependencia de API #16 sigue pendiente de integrar. No hubo merge ni despliegue productivo; Macroetapa 4 permanece fuera de esta entrega.
