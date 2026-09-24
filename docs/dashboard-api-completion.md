# Entrega Dashboard / API · 2026-09-24

Base de trabajo: Dashboard `0e51518`, API `ea73ad4`. Implementación local; no representa una publicación en producción.

## Dashboard

- RV `inactive` se muestra como **Ausente**, con motivo, fecha, ubicación y evidencia. No exige checklist ni siete fotografías ordinarias; no equivale a desactivar el hidrante del catálogo.
- Correcciones Construction `waived` se muestran dispensadas. Meta del proyecto, registros capturados y porcentajes conservan denominadores separados.
- Evidencia protegida admite originales o miniaturas faltantes: muestra indisponibilidad y permite reintentar sin inventar fotos. Acceso Construction exige motivo y versión; directorio consulta acceso por lotes.
- Administración de usuarios y cuadrillas; jornadas con revocación y dispositivos con bloqueo. Solo admin modifica, con historial y control de conflictos. Correo identifica al usuario y no es editable. Cambiar cuadrilla o desactivar revoca jornadas; asignaciones con historia Construction incompatible se rechazan.
- Admin/supervisor revisan RV enviadas y no archivadas, con motivo y código al rechazar. Comparador permite elegir otra revisión del mismo hidrante y muestra diferencias por código de pregunta, incluyendo cambios de definición y respuestas cero/falso.
- Reportes HTML/PDF se descargan con autenticación e integridad desde el expediente de Diagnósticos. Viewer consulta metadata; no descarga reportes.
- `/acerca-de` muestra versión, commit y fecha de compilación del Dashboard y versión/capacidades de la API. Gráficos se cargan al aproximarse al área visible, con recuperación ante error.
- CI valida TypeScript, Vue lint, pruebas, compilación y navegador. El artefacto mock está separado de `dist` real.

## API

Consultar `ddr001_api_rv/docs/dashboard-administration.md` y su OpenAPI para contratos, roles, migración y orden de despliegue. La migración aditiva `20260924_dashboard_administration.sql` ya se aplicó en TEST. No se cambiaron los cuerpos de solicitud/respuesta de las apps existentes; se probó inicio con payload anterior y efectos de las nuevas decisiones administrativas.

Las ediciones de nombre/teléfono y cuadrilla administrados tienen prioridad sobre valores enviados por la app al iniciar jornada. Las sesiones revocadas no se reabren al desbloquear dispositivos. El API guarda motivo y versiones anteriores/nuevas en auditoría.

## Validación y límites

- Unitarias Dashboard: 151 pruebas; API: 435 pruebas.
- SQL TEST: 10 escenarios con transacción revertida: permisos vigentes, alta/edición, conflictos, auditoría, revisión RV, revocación/bloqueo, reasignación y acceso con concurrencia; reportes con integridad y archivos ausentes.
- Integración API sin base real: 17 pruebas pasadas; 72 optativas omitidas por sus flags. No equivalen a validar todos los flujos móviles contra SQL.
- Navegador: Administración 6 combinaciones rol/tamaño; Diagnósticos 9; mapa 5; Construction 15 vistas (3 tamaños × 5 pantallas). Fixtures locales, sin llamadas a producción. Capturas/resultados en `.artifacts`.
- TypeScript, lint y compilaciones validados en ambos proyectos. Vue lint también informa advertencias de formato heredadas. ECharts queda en un chunk diferido de aproximadamente 552 kB sin comprimir; Vite mantiene la advertencia de tamaño.
- Preflight TEST encontró 0/20 originales y 0/20 miniaturas Construction disponibles en el almacenamiento. El usuario confirmó que pueden no existir en este ambiente. La ausencia se cubrió como escenario esperado; no se restauró ni fabricó evidencia.
- No se ejecutó despliegue de producción ni se certificaron archivos originales de producción. Antes de desplegar, aplicar el orden API/migración/Dashboard del runbook y probar con evidencia del destino.

## Alcance diferido

Superadmin y editor completo de respuestas RV siguen fuera de esta entrega. Para cambios futuros que requieran actualizar una app se debe avisar antes de implementarlos, conforme a la instrucción del usuario.
