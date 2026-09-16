# Validación de Diagnósticos — 0.3.0

Fecha: 2026-09-15. Ver [auditoría contractual](functional-diagnostics-audit.md).

## Ejecución local

Usar esta instalación y `npm run dev`. La configuración local existente usa `/api/v1` con proxy hacia el puerto 3000. El módulo utiliza el cliente Axios y la sesión administrativa de la plataforma. No requiere otro login ni datos de demostración.

Rutas: `/diagnosticos` y `/diagnosticos/:caseId`. El router respeta `import.meta.env.BASE_URL`; la certificación de navegador se ejecuta bajo `/ddr001/`.

**Dependencia operacional:** la API local consultada publica versión 1.1.2 y su OpenAPI no incluye el namespace administrativo de Diagnósticos. La implementación auditada está en `feature/functional-diagnostics-api`, SHA `e571b8bdf84a709a0d4ce40bf2a5f842e44199bd`, todavía no integrada a main. Este trabajo no despliega esa rama ni modifica la API. Para consultar datos reales falta desplegar ese contrato y después realizar una validación de integración en TEST.

## Resultados

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS: 97 tests, 23 archivos; 30 tests nuevos |
| `npm run build` | PASS; advertencia de tamaño del chunk compartido ECharts (553.17 kB, 187.76 kB gzip) |
| `npm run test:functional-diagnostics-contract` | PASS: cinco proyecciones SQL y doce sufijos de rutas contrastados con el SHA auditado |
| `npm run e2e:functional-diagnostics-ui` | PASS: nueve escenarios, tres roles por tres anchos |
| `git diff --check` | PASS |

ECharts se comparte con los módulos existentes y se carga mediante las rutas diferidas. No se incrementó el umbral de advertencia ni se añadió otra biblioteca. Optimizar ese chunk queda como mejora de rendimiento; no impide compilar o ejecutar.

## Alcance de las pruebas

- Unitarias: data source, filtros, cursor, valores nulos, adaptadores, errores, permisos, revisiones idempotentes, concurrencia del acceso, Q1–Q4, Bluetooth, simulación, integridad y evidencia no disponible. Respuestas obsoletas ignoradas al cambiar filtros.
- Contrato: fixtures exclusivamente de tests derivados de SQL y de las pruebas de integración del API, con diferencias explícitas entre reportes/revisiones embebidos y sus endpoints. No son respuestas capturadas de un servidor desplegado. La comprobación de fuentes es de lectura y usa el clon API existente.
- Navegador: autenticación simulada, bearer en solicitudes, navegación, summary, filtros y cursores, métricas, técnicos, conflicto de versión de acceso, reportes, expediente, Q, BLE, puntos, evidencia diferida, originales según rol, revisión y Escape en diálogo.
- Responsive: 1440, 768 y 390 px para viewer, supervisor y admin; sin desbordamiento horizontal global. Tabla con desplazamiento propio.
- E2E **mock-only**, servidor efímero 4175: intercepta toda la API y bloquea orígenes externos. No modifica SQL, usuarios reales, producción ni evidencias reales. Resultados y capturas en `.artifacts/functional-diagnostics-ui/` (ignorados por Git).
- No se certifica integración real mientras la API local no exponga el contrato.

## Comportamiento relevante

Datos reales por defecto (`simulation=exclude`). Los casos mixtos conservan todas las muestras en el expediente y marcan las simuladas; no se recalculan veredictos. Actividad de técnicos y contadores globales de sincronización se identifican como globales.

Viewer consulta thumbnails; admin/supervisor pueden solicitar originales verificados y registrar revisiones. Sólo admin cambia acceso con motivo y rowVersion, o consulta su historial. El API conserva la autoridad de permisos.

Los reportes exponen metadata y disponibilidad; no hay endpoint administrativo de contenido HTML/PDF y no se inventa uno. Los metadatos técnicos conservan los campos contractuales sin enlazar medidores con RV ni Construction.

El dashboard general conserva sus módulos; Diagnósticos tiene su propio resumen, métricas, listado, técnicos y reportes. No se aplicaron migraciones, cambios al API, push, PR ni merges.
