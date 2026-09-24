# Historial de la plataforma DDR001

## Unreleased - 2026-09-24

Administracion auditada de usuarios, cuadrillas, jornadas y dispositivos; revision/comparacion RV; compatibilidad Ausente y correcciones dispensadas; descargas de diagnosticos; metricas, evidencia ausente, concurrencia, CI y trazabilidad. [Detalle y validacion](docs/dashboard-api-completion.md). Requiere la migracion aditiva API antes del despliegue.

## 0.3.0 — 2026-09-15 — local, pendiente de publicación

- Módulo aislado Diagnósticos: resumen, filtros server-side, cursores, métricas, técnicos y reportes.
- Expediente metrológico con Q1–Q4, muestras, Bluetooth/ESP32, configuración, puntos, GPS, integridad y evidencia autenticada.
- Revisión administrativa por admin/supervisor y gestión de acceso funcional por admin con concurrencia e historial.
- Simulaciones excluidas por defecto; fixtures exclusivamente en pruebas. Sin cambios en API, SQL o producción.
- Router compatible con `BASE_URL`, incluyendo despliegue bajo `/ddr001/`.
- Requiere el contrato API `e571b8b` de `feature/functional-diagnostics-api`, todavía no integrado en main ni expuesto por la API local 1.1.2.

## 0.2.7 — 2026-09-15 — local, pendiente de publicación

- Revisiones incorpora arriba del listado los indicadores de hidrantes, estados, actividad, técnicos y fotografías del Dashboard, mediante un componente compartido. Los filtros del listado mantienen su alcance; los indicadores muestran el resumen general.

## 0.2.6 — 2026-09-15 — local, pendiente de publicación

- Los enlaces del menú también resaltan el fondo al pasar el mouse o recibir foco con el teclado.
- Se restauran los accesos directos de los módulos. Solo Administración y Herramientas muestran submenús laterales a la derecha al pasar el mouse o hacer clic.

## 0.2.5 — 2026-09-15 — local, pendiente de publicación

- Áreas del menú como botones con icono: al pulsar Módulos, Administración o Herramientas se despliegan sus opciones. Compatible con teclado y menú contraído.

## 0.2.4 — 2026-09-15 — local, pendiente de publicación

- Menú lateral organizado en Módulos, Administración (Hidrantes, Usuarios, Cuadrillas, Jornadas y Dispositivos) y Herramientas (Exportaciones).

## 0.2.3 — 2026-09-15 — local, pendiente de publicación

- Respuestas del checklist: palomita verde para “Sí” y cruz roja para “No”, con trazo grueso y etiquetas accesibles. “No aplica” y “No capturado” conservan su texto.

## 0.2.2 — 2026-09-15 — local, pendiente de publicación

- Fotografías del checklist: cámara verde oscuro con trazo grueso para abrir la imagen y cruz roja con trazo grueso cuando no hay foto, sin texto adicional.

## 0.2.1 — 2026-09-15 — local, pendiente de publicación

- API compatible 1.1.2: el detalle resuelve fecha, técnico, cuenta, coordenadas y señal desde los registros de la revisión.
- El checklist reconoce las fotografías guardadas y permite abrirlas; muestra marcas, rangos de presión, estados especiales y válvulas parcelarias estructuradas.
- Distingue preguntas no aplicables de capturas faltantes y conserva valores cero y respuestas negativas.
- Validación: 342 pruebas API y 67 dashboard; lectura de 12 revisiones locales y comprobación de interfaz. Sin cambios en los datos almacenados.

## Corrección API 1.1.1 — 2026-09-15 — local, pendiente de publicación

- El listado de revisiones y las exportaciones CSV/Excel aceptan el filtro `conflict`, que antes fallaba por validación.
- Dashboard compatible: 0.2.0. Sin migraciones ni cambios de permisos.

## 0.2.0 — 2026-09-15 — implementación local, pendiente de publicación

### Añadido

- Baja lógica de revisiones RV por admin, con motivo, confirmación, control de concurrencia e idempotencia.
- Archivo de bajas con historial y evidencia conservados.
- Exclusión de bajas en listados, métricas, galería y exportaciones administrativas.
- Versión visible de la plataforma. API compatible: 1.1.0.

### Alcance acordado

- Se conservan los permisos actuales de admin y supervisor.
- Superadmin y editor completo quedan para una entrega posterior.
- No se modifica la captura móvil, el estado ni la oficialidad de las revisiones.
- La migración no da de baja registros reales; el administrador selecciona cada revisión.

Plan: [Limpieza RV](plans/04_superadmin_edicion_baja_revisiones.md).
Validación: [Resultados](docs/rv-cleanup-validation.md).

## 0.1.0 — línea base documentada el 2026-09-15

Versión existente del dashboard en main 53c3f06. Incluye visor RV, expediente de hidrantes, galería, exportaciones, directorio de usuarios y levantamientos. Integración local con API 1.0.0, commit 66f7673. La fecha documenta la línea base; no certifica un despliegue productivo.
