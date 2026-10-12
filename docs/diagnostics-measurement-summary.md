# Resumen Q1/Q2 del listado de Diagnósticos

## Datos y cálculo

El detalle existente expone `flowPoints[].samples[].errorPct`, `status`,
`acquisitionIntegrityStatus` y `points[].flowLps`. Los resultados estadísticos de
`flowPoints` provienen del cliente y no representan necesariamente el subconjunto
seleccionado por simulación. El listado anterior no incluía estos datos.

La API local `C:/DEV/AQAGS/ddr001_api_rv` añade al listado administrativo un resumen
calculado a partir de esos registros persistidos, sin recalcular el error
metrológico, los veredictos ni la repetibilidad:

- Sólo muestras `CLOSED_VALID` con integridad de adquisición `OK`, pertenecientes
  a Q1 o Q2. Se respeta `simulation=exclude|include|only`.
- Rango por Q: mínimo y máximo de `samples.error_pct` no nulos.
- Flujo por muestra: media aritmética de `points.flow_lps` no nulos y no negativos,
  incluyendo cero medido. Sigue `PointFlowStatistics.fromPoints` de la app móvil.
  Flujo por Q: media de esos promedios por muestra; cada muestra pesa lo mismo.
  No se utiliza `lpsApprox`, que es configuración aproximada.
- Error promedio Q1/Q2: suma de los errores finales válidos de ambas pruebas
  dividida entre el número de errores disponibles. Cada muestra pesa una vez;
  no se promedian extremos ni medias de Q con pesos iguales. Q3/Q4 se excluyen.
- La consulta de mediciones es independiente del join de evidencias, evitando
  multiplicar el peso de las muestras. Se ejecuta una consulta adicional para
  toda la página, con UUID parametrizados. Los filtros Q/fuente seleccionan casos;
  el resumen muestra ambas pruebas del caso dentro del modo de simulación.
- Duración: se reutiliza `durationSeconds`, calculado por la API mediante
  `DATEDIFF(SECOND, cases.client_created_at, cases.client_closed_at)`. Se presenta
  con minutos totales y segundos, sin conversión adicional de unidades ni reinicio
  a los 60 minutos. Un caso sin cierre tiene duración desconocida.

## Contrato aditivo

`GET /api/v1/admin/dashboard/functional-diagnostics/cases` conserva todos sus
campos, filtros y paginación. Cada item añade:

```json
{
  "measurementSummary": {
    "q1": { "minimumErrorPct": null, "maximumErrorPct": null, "averageFlowLps": null },
    "q2": { "minimumErrorPct": null, "maximumErrorPct": null, "averageFlowLps": null },
    "meanErrorPct": null
  }
}
```

Los campos numéricos contienen números o `null`; el Dashboard admite la ausencia
del objeto para versiones anteriores de la API. No hay cambios en endpoints
móviles, escrituras, esquema SQL ni campos existentes. La API requiere desplegar
estos cambios para alimentar las nuevas columnas.

## Presentación y límites históricos

Errores y flujo se presentan con dos decimales; la precisión interna se conserva.
Errores positivos llevan `+`. Se conserva L/s, unidad del contrato y de la app.
Valores ausentes se muestran como `—` por dato. Sin Q se muestra `— / —`.
Una prueba incompleta puede mostrar resultados de sus muestras ya cerradas válidas.
Sin lecturas de flujo históricas se muestra `—`, aunque exista caudal configurado.
Los puntos intermedios de error no son resultados finales independientes y no se
mezclan con `samples.error_pct`. La duración corresponde al expediente completo,
incluyendo pausas entre pruebas, según el cálculo existente.

En pantallas de hasta 768 px las filas se presentan como tarjetas con las mismas
etiquetas y datos; en escritorio se conserva la tabla y el estilo del módulo.

## Archivos modificados o añadidos

Dashboard:

- `src/features/diagnostics/DiagnosticListView.vue`
- `src/features/diagnostics/diagnostics.css`
- `src/features/diagnostics/diagnostics.types.ts`
- `src/features/diagnostics/diagnostics.measurements.ts`
- `src/features/diagnostics/diagnostics.measurements.test.ts`
- `src/features/diagnostics/diagnostics.ui.test.ts`
- `scripts/functional-diagnostics-ui-e2e.mjs`
- `docs/diagnostics-measurement-summary.md`

API local:

- `src/modules/functional-diagnostics/admin.repository.ts`
- `src/modules/functional-diagnostics/admin.measurements.ts`
- `tests/unit/functional-diagnostics-measurements.test.ts`
- `tests/unit/functional-diagnostics-measurements-repository.test.ts`
- `docs/openapi.yaml`

## Validación (2026-10-01)

- Dashboard: `npm run lint` sin errores (3006 advertencias de estilo),
  `npm run typecheck`, `npm test` (31 archivos, 174 pruebas) y `npm run build`: PASS.
  El build conserva la advertencia de chunks mayores a 500 kB.
- API: `npm run lint`, `npm run type-check`, `npm test` (64 archivos, 458 pruebas)
  y `npm run build`: PASS. El test adicional del repositorio, añadido después
  de iniciarse la suite, pasó por separado (1 archivo, 4 pruebas). ESLint de los
  archivos modificados y typecheck se verificaron después de añadirlo.
- `npm run e2e:functional-diagnostics-ui`: 9 escenarios PASS, con respuestas
  interceptadas, combinando viewer/supervisor/admin y 1440/768/390 px. Comprueba
  valores nuevos, duración, ausencia de desbordamiento en móvil y los flujos
  existentes de filtros, paginación, detalle y permisos. Capturas revisadas.
- Consulta del repositorio contra la base local: sólo lectura, diez expedientes,
  los diez con resumen disponible. Valida la ejecución real del SQL nuevo sin
  modificar datos ni aplicar migraciones. No se ejecutaron suites SQL con escrituras.
- OpenAPI YAML parseado correctamente. `git diff --check`: PASS en ambos repositorios.
  Diff final revisado, limitado a Diagnósticos y su contrato administrativo.
- Cambios locales; no se realizaron push, merge, rebase ni operaciones destructivas.

## Integración frontend sobre main (2026-10-12)

Los cambios locales de Diagnósticos se copiaron a un worktree aislado sobre
`2b4a07fb4b4cfc47dc63543b1abf7d4a8e755923` (main tras integrar Nuevos Hidrantes).
No se incluyeron commits del editor local RV ni de combinación de cuadrillas.
El checkout original y sus cambios permanecieron intactos. No se modificó ni
fusionó la API como parte de esta integración frontend.

- `npm run lint`: PASS, 0 errores / 3038 warnings de las reglas vigentes.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 349 pruebas / 41 archivos, incluido el módulo de gabinetes.
- `npm run build`: PASS; conserva aviso del chunk ECharts mayor a 500 kB.
- `npm run e2e:functional-diagnostics-ui`: PASS, 9 escenarios mock, tres roles
  a 1440/768/390 px en Edge/Chromium y base `/ddr001/`. El primer intento
  concurrente agotó el timeout de carga del login; la repetición aislada pasó completa.
- `git diff --check`: PASS.

El contrato `measurementSummary` sigue siendo aditivo/opcional: una API anterior
muestra `—` en los nuevos indicadores y conserva el listado y el expediente.
La integración de este frontend no publica ni despliega el cambio backend descrito arriba.
