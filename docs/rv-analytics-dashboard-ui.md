# Dashboard analítico de Revisiones Visuales — Macroetapa 2

## Objetivo y procedencia

Diagnóstico RV de lectura, con el motor server-side como única fuente de métricas. Base frontend: `origin/main` `dec549e499aa633d2ceab8fe56b033427749a9af`, verificada con fetch el 16 de octubre de 2026. Rama: `feature/rv-analytics-dashboard-ui`. No se incorporó el PR abierto #4 de Gabinetes (`2085aa1`). El remoto `LOCAL_ONLY_DO_NOT_PUSH` falla deliberadamente; origin se actualizó correctamente. No había commits posteriores en origin/main.

Se revisaron router, servicios, tipos, listado, detalle, comparador, dashboard RV anterior y dashboard general; los enlaces desde hidrantes, mapa, fotografías y usuarios siguen usando los IDs originales. Se revisaron wrapper/motor ECharts, AppStatus, infraestructura Edge, pruebas y configuración Vite. Mapa conserva sus capas RV/Construction/Diagnósticos/Gabinetes; el visor global, exportaciones, Construction/Bases y los dashboards de Gabinetes y Diagnósticos no se rediseñan. Las diferencias locales y ramas de trabajo independientes no se incorporan.

Contrato contrastado con `docs/openapi.yaml`, `rv-analytics.ts`, rutas y catálogo reales del commit API `665f747d8428ad938f88977b17b7fce1ba97916a`. Se incluyen copias exactas de [la documentación institucional](rv-dashboard-analytics.md) y [el ejemplo vacío](rv-dashboard-analytics.example.json) de ese commit. No son fuentes runtime ni implementaciones de fórmulas.

## Rutas y reutilización

| Ruta | Uso |
| --- | --- |
| `/revisiones` | Dashboard RV, nombre `inspection-analytics` |
| `/revisiones/listado` | Listado completo, conserva el nombre `inspections` |
| `/revisiones/:id` | Detalle existente |
| `/revisiones/:id/comparar` | Comparador existente |
| `/revisiones/archivo` | Archivo administrativo existente |

El retorno del detalle abre el listado completo; el enlace Estadísticas del listado abre el nuevo dashboard. Los enlaces con IDs desde mapa, usuarios, fotografías e hidrantes no cambian. El sidebar conserva `/revisiones`. El KPI Ausentes enlaza al listado con el filtro `status=inactive`, ahora leído desde la URL. Este listado representa actividad, no un drill-down canónico equivalente a current.

Se conserva `createWebHistory(import.meta.env.BASE_URL)`. No cambia la base de producción. Edge certifica navegación y refresh bajo `/ddr001/` con Vite; esto no constituye una prueba de rewrite en un IIS real. El servidor IIS debe conservar la regla SPA ya requerida por los deep links existentes; el repositorio no contiene web.config.

`InspectionListBody` extrae el markup de tabla y cards original; lo usan el listado completo y `InspectionRecentList`. No se sustituye el visor fotográfico, el estado de las fotos ni sus servicios privados. El dashboard general multimódulo queda intacto.

## Servicios, filtros y concurrencia

`dashboardService.rvAnalytics(query, signal)` usa el cliente Axios autenticado existente, `GET /admin/dashboard/rv-analytics`, timeout 30 segundos. Los tipos explícitos están en `rv-analytics.types.ts`, incluidos todos los bloques y distribuciones del contrato v1.

Filtros: periodo, técnico, cuadrilla, estado (`submitted`, `validated`, `inactive`), modo (`current`, `history`) y granularidad (`day`, `week`, `month`). Inicio predeterminado: Estado actual, mes, sin restricciones adicionales. Técnico y cuadrilla se obtienen de `/admin/dashboard/filters`; un error en ese directorio no bloquea el análisis y ofrece reintento.

La edición es local hasta pulsar Aplicar filtros: una solicitud analytics al montar y una por aplicación. No hay watchers de filtros ni fetch en gráficas. Una consulta idéntica todavía en curso se deduplica. `AbortController` cancela la anterior y una generación protege datos, errores y loading incluso si el transporte completa fuera de orden. Se cancela al desmontar. Las opciones ECharts son computed dependientes de la respuesta, no del estado de carga.

Las fechas UI son días de America/Hermosillo: desde inclusivo a medianoche UTC−7; hasta se convierte a medianoche del día siguiente, exclusiva. No se altera timezone global. El modo/periodo y generatedAt visibles describen la respuesta mostrada, incluso cuando se conserva durante una recarga fallida.

Se hacen además una consulta de opciones y una de últimas revisiones. Esta última usa exactamente `/admin/dashboard/inspections?page=1&pageSize=10`, orden server-side por started_at descendente, sin paginación UI. Está rotulada como actividad general independiente de filtros analíticos; ese endpoint no ofrece selección canónica current. No se intenta reproducirla en frontend.

## Representación

- Seis KPIs de summary: evaluados, con hallazgos, sin hallazgos detectados, total de hallazgos, ausentes y cobertura. Cobertura muestra porcentaje entregado y numerador/catálogo.
- Hasta seis destacados y Pareto usan el orden del servidor. Barras horizontales; tooltip con afectados, evaluados, incidencia y acumulado. El acumulado corresponde a incidencias, no hidrantes únicos. No se calcula ni ordena un Pareto nuevo.
- Sistemas: hidrantes afectados, evaluados, porcentaje e incidencias, con nota sobre afectación en varios sistemas.
- Disponibilidad: selección documentada de códigos institucionales `RV-INV-flow_meter`, `RV-INV-filter`, `RV-INV-venturi`, `RV-INV-solar_panel`, `RV-INV-battery`, `RV-INV-controller`, `RV-INV-air_valve`. El contrato no clasifica distribuciones por tipo. Se muestran porcentajes server-side apilados, sin normalización frontend. Sólo en este grupo de presencia true/false se etiqueta Presente/Ausente.
- Características: una distribución visible, inicial marca de medidor; el selector conserva todas las distribuciones. Familias descriptivas desambiguan etiquetas repetidas sin exponer códigos técnicos al usuario. No cambia significado ni valor.
- Evolución: evaluados y afectados por bucket, porcentaje en tooltip; en current es una cohorte del estado seleccionado, no deterioro ni transiciones.
- Calidad: conteos de evidencia completa/incompleta/indeterminada, base, GPS, señal, campos e indicadores sin dato y elementos indefinidos. Integridad fotográfica desglosada por grupos entregados; no suma ni adjudica disponibilidad NAS actual.
- Parcelarias separa observaciones/hidrantes afectados de componentes afectados. Conserva configuraciones, cantidades declaradas, observadas y distribuciones por componente. Legacy no inventa conteos de componentes.

Sin dato y No aplica se conservan separados y nunca se convierten en ausencia o falla. El estado vacío no equivale a diagnóstico sano. No se asigna criticidad. No se descargan respuestas de checklist ni se calculan porcentajes, hallazgos, denominadores o agregados en Vue.

En history, indicadores/distribuciones/tendencia cuentan inspecciones; summary y sistemas con nombres hydrants deduplican hidrantes en API. Una nota visible explica la diferencia. El frontend conserva esas unidades.

## Estados, accesibilidad y responsive

Skeleton inicial; recarga conserva los datos con Actualizando; errores incluyen reintento. 422 solicita reducir periodo o filtrar. 503 explica indisponibilidad técnica sin sustituir versiones ni exponer códigos internos. 401/403 tienen mensajes de sesión/permisos y conservan el flujo de autenticación existente.

ECharts existente, sin librería adicional. Tooltips richText evitan interpretar etiquetas de API como HTML. Headings, labels, aria-labels, foco global y detalles textuales accesibles acompañan a las gráficas. Los conteos no dependen sólo del color.

1440: seis KPIs y gráficas en dos columnas, Pareto ancho. 768: gráficas apiladas y filtros en dos columnas. 390: una columna, dos KPIs por fila y cards originales en últimas revisiones. Alturas crecen con las categorías para mantener etiquetas legibles. Tema claro existente; no hay modo oscuro implementado en la aplicación.

## Validación y límites

Pruebas con el ejemplo real de API y valores controlados sólo en tests: resumen, destacados, Pareto vacío, sistemas, distribuciones, calidad, modos, filtros, fechas, 422/503/401/403, vacío, últimas diez, listado, Ausente, No aplica, Sin dato, deduplicación y carreras. Resolución de todas las rutas de regresión. Suite completa, typecheck, lint, build con `/ddr001/` y diff-check deben quedar registrados en el informe de entrega.

`npm run e2e:edge -- --rv-analytics` amplía el runner existente con Playwright/Edge y mocks de contrato. Comprueba una request inicial y otra al aplicar, navegación a listado/detalle/regreso, refresh, base path, loading, errores/vacío, canvas renderizados, consola y overflow a 1440/768/390. Evidencia local en `.artifacts/rv-analytics-edge/`. No usa credenciales ni registros reales.

Resultados locales del 16 de octubre de 2026:

| Check | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, cero errores; 2928 advertencias de estilo del conjunto del repositorio |
| `npm test -- --maxWorkers=2` | PASS, 45 archivos y 383 pruebas; 13 pruebas nuevas RV |
| `npm run build -- --base=/ddr001/` | PASS; advertencia de chunk ECharts mayor de 500 kB |
| `git diff --check` | PASS |
| `npm run e2e:edge -- --rv-analytics` | PASS, 1440/768/390, cero pageerrors/overflow |
| `npm run e2e:global-map` | PASS, admin en tres anchos y viewer en desktop |
| `npm run e2e:functional-diagnostics-ui` | PASS, viewer/supervisor/admin en tres anchos |
| `npm run e2e:cabinets-ui` | PASS, cuatro anchos y roles supervisor/viewer |
| `npm run e2e:image-viewer` | PASS, 12 recorridos en cuatro anchos |
| `npm run e2e:construction-ui` | PASS, 15 capturas, dashboard/Bases/usuarios; servidor aislado con `VITE_CONSTRUCTION_DATA_MODE=mock` |

Revisión visual de capturas RV completa en los tres anchos. Las pruebas de detalle, archivo y comparador incluyen unitarias/resolución de rutas; navegación real del detalle cubierta con mock por Edge. Hidrantes y exportaciones: unitarias y resolución de rutas, sin nueva certificación autenticada real. No se atribuye a estas pruebas cobertura de escritura o datos productivos.

No había API TEST escuchando en puertos locales 3000/3002/3016 al verificar. La integración autenticada real con Macroetapa 1 y los rewrites reales de IIS quedan sin certificar; los mocks no prueban disponibilidad del endpoint desplegado ni latencia real.

## Pendientes fuera de esta macroetapa

Macroetapa 3 no iniciada: reporte institucional PDF/Excel. Mejora futura: drill-down server-side por hallazgo, sin filtro improvisado ni descarga masiva. Medir latencia/concurrencia real una vez disponible TEST (Macroetapa 1 reporta 4.6–5.6 s); no se introduce caché global ni se cambia API. No hubo deploy, copia a IIS, reinicio, merge, producción, captura móvil, checklist, storage ni exportación institucional modificados.
