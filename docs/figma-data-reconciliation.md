# Matriz Figma ↔ datos reales

Fecha de corte: 2026-08-13. Figma gobierna lenguaje visual; código/contrato/BD gobiernan contenido.

| Pantalla | Campo/componente Figma | Fuente real | Endpoint | Decisión | Observaciones |
|---|---|---|---|---|---|
| Login | email/contraseña | `rv.admin_users` | `/api/v1/admin/auth/login` | Mantener | Sin “recuperar contraseña” porque no existe contrato |
| Login | branding DDR001 | assets Figma | local | Mantener | Sin credenciales de campo |
| Dashboard | hidrantes totales/revisados/pendientes/avance | agregados definidos | `/api/v1/admin/dashboard/summary` | Mantener/corregir | Fórmulas en `dashboard-metrics.md` |
| Dashboard | estados ilustrativos | `rv.inspections.status` | summary | Corregir | Mostrar sólo estados realmente presentes |
| Dashboard | avance acumulado/meta diaria | no existe meta diaria | summary | Corregir | Actividad real; eliminar meta inventada |
| Dashboard | revisiones por técnico | join user/inspection | summary | Mantener | Agregado servidor, sin N+1 |
| Dashboard | localidad/territorio | columnas legacy | ninguno nuevo | Eliminar | Concepto descartado |
| Revisiones | cuenta hidrante | `hydrants.account_number` | `/admin/dashboard/inspections` | Mantener | Identificador principal |
| Revisiones | técnico/cuadrilla | user + work session + crew | idem | Mantener | La cuadrilla es la de la jornada |
| Revisiones | fecha/hora/revisión/estado | inspection | idem | Mantener | Zona local explícita |
| Revisiones | localidad | legacy `locality` | — | **Eliminar** | No buscar ni filtrar |
| Revisiones | municipio | legacy `municipality` | — | **Eliminar** | No buscar ni filtrar |
| Revisiones | fotos x/7 | checklist + photos | idem | Corregir | x/requeridas aplicables, total dinámico |
| Revisiones | GPS “1.8m” | latest location sample | idem | Corregir | La lista muestra presencia y precisión si existe |
| Revisiones | señal | latest signal sample | idem | Mantener | Sin clasificar Buena/Mala |
| Revisiones | filtros | queries server-side | idem | Corregir | Búsqueda, técnico, cuadrilla, estado, fechas, fotos, GPS; sin territorio |
| Detalle/Resumen | hidrante, técnico, cuadrilla, fechas, revisión, estado | joins de inspección | `/admin/dashboard/inspections/:id` | Mantener | Datos reales |
| Detalle/Resumen | tipo hidrante | no confirmado | — | Eliminar | No inventar atributo |
| Detalle/Resumen | localidad/municipio | legacy | — | **Eliminar** | Sustituir espacio por datos vigentes |
| Detalle/Resumen | dispositivo | work session + device | detalle | Mantener | Sólo si existe |
| Detalle/Resumen | checklist 77/77 | versión/items/respuestas | detalle | Corregir | Conteo dinámico y aplicabilidad |
| Detalle/Resumen | anomalías derivadas | sin regla vigente | — | Eliminar | Mostrar comentarios/revisión reales |
| Checklist | acordeones/secciones | checklist version/sections/items | detalle | Mantener | Orden dinámico; no hardcodear preguntas |
| Checklist | valores humanos | answer + tipo/unidad/opciones | detalle | Corregir | Sí/No, No aplica, número+unidad, JSON/select |
| Fotografías | siete tarjetas | checklist slots + photos | detalle | Corregir | Slots y generales reales, ausentes visibles |
| Fotografías | imagen ilustrativa repetida | archivo privado | `/admin/dashboard/inspections/:id/photos/:photoId/{thumbnail,content}` | Eliminar | Nunca placeholder como evidencia |
| Fotografías | lightbox/zoom/navegación | contenido original autenticado | content | Mantener | Miniatura en galería, original bajo demanda |
| Ubicación | mapa, captura y precisión | hydrant + latest location sample | detalle | Mantener/corregir | Diferenciar coordenada maestra/capturada |
| Ubicación | dirección/localidad | no vigente | — | Eliminar | OSM no se usa para inventar territorio |
| Señal | generación/dBm/operador/fecha | signal sample | detalle | Mantener | Sin thresholds humanos |
| Historial | timeline | status history | detalle | Mantener | Resolver actor en servidor |
| Auditoría | before/after | audit_log | detalle | Mantener | JSON expandible; sin edición |
| Mapa/Usuarios/Cuadrillas/Jornadas/Dispositivos/Exportaciones | pantallas completas | datos existen parcialmente | varios | **Fases futuras** | No forman parte de Fase 2; la navegación visible no implica certificación ni autorización para desarrollarlos |
| Hidrantes | cuenta | `rv.hydrants.account_number` | `/admin/dashboard/hydrants` | Mantener | Identificador operativo y búsqueda principal |
| Hidrantes | localidad/municipio | columnas legacy | — | **Eliminar** | Fuera de cards, tabla, filtros y búsqueda |
| Hidrantes | tipo “lateral/final de línea” | sin propiedad vigente confirmada | — | Eliminar | No derivar de metadata o Figma |
| Hidrantes | año, gasto, coordenadas | maestro vigente | `/admin/dashboard/hydrants` | Mantener | Campos nullable con estado N/D |
| Hidrantes | revisiones/última/estado | agregados RV | `/admin/dashboard/hydrants` | Corregir | Estado RV global y estado de última revisión son distintos |
| Hidrantes | fotos x/7 | `rv.photos` | `/admin/dashboard/hydrants` | Corregir | `x/7 obligatorias · N total`; sin revisión no muestra 0/7 |
| Expediente hidrante | encabezado y resumen | maestro + agregados | `/admin/dashboard/hydrants/:id` | Mantener/corregir | Sin territorio ni alertas inventadas |
| Expediente hidrante | observaciones/anomalías | sin regla objetiva vigente | — | Eliminar | Sustituido por alertas factuales: coordenadas, revisión, evidencia y GPS |
| Expediente hidrante | mapa | latitude/longitude maestras | detalle hidrante | Mantener | `source_x/y/crs` se etiqueta aparte; CRS histórico no confirmado |
| Expediente hidrante | historial | revisiones RV livianas | `/admin/dashboard/hydrants/:id/inspections` | Mantener | Más reciente primero; detalle se carga al abrir revisión |

## Cambios visuales justificados

- En móvil, la lista se convierte en tarjetas accionables; no se fuerza una tabla de 12 columnas.
- Los filtros avanzados se alojan en panel/drawer en tablet y móvil.
- La banda de completitud muestra denominadores reales y estados “no disponible”, no siempre verde.
- Localidad y municipio desaparecen de listas, detalle, búsqueda y mapa aunque estén en capturas.

## Corte de consolidación 2026-08-26

La Fase 2 oficial se limita al listado y expediente maestro de hidrantes. La galería global es ahora la Subetapa 3.1: conserva evidencia real privada, filtros server-side, lightbox/zoom y enlaces al hidrante y revisión, pero permanece pendiente de deployment API y certificación externa. Exportaciones continúa pendiente como Subetapa 3.2. El mapa aceptado en Fase 2 sigue siendo exclusivamente el mapa individual de la coordenada maestra; el mapa global no forma parte de 3.1.
