# Métricas del Dashboard

Fecha de corte: 2026-08-26. Todos los agregados son server-side y se calculan en una misma ventana de lectura. El dashboard no descarga revisiones para recomputarlos.

| Métrica | Fórmula formal | Notas |
|---|---|---|
| Total hidrantes | `COUNT(rv.hydrants WHERE is_active = 1)` | Incluye catálogo y manuales activos; excluye municipio/localidad |
| Hidrantes revisados | `COUNT(DISTINCT hydrant_id)` con al menos una inspección RV en `submitted`, `validated` o `rejected` | Sigue la regla ya implementada por `/admin/summary`: una revisión recibida por servidor cuenta; borradores no |
| Hidrantes pendientes | `total_hidrantes - hidrantes_revisados` | Acotado a cero ante datos inconsistentes |
| Avance | `100 * revisados / total`, o `0` si total = 0 | Dos decimales; universo activo actual |
| Total revisiones | `COUNT(inspections WHERE inspection_type_code='RV')` | Incluye todos los estados para trazabilidad |
| Revisiones de hoy | Revisiones RV cuyo `started_at` cae en el día de negocio configurado | API recibe/usa zona `America/Hermosillo`; no truncar UTC como día local |
| Por estado | `GROUP BY status` de inspecciones RV | Estados se devuelven como contrato, la UI etiqueta sin fusionarlos |
| Actividad temporal | Conteo por día de `COALESCE(submitted_at, started_at)` en ventana solicitada | Para avance operativo se prefiere envío; borradores usan inicio y se identifican por estado |
| Fotografías verificadas | `COUNT(photos WHERE upload_status='verified' AND deleted_at IS NULL)` | KPI técnico; no significa completitud por revisión |
| Fotografías obligatorias cubiertas | COUNT distinto de slot_code entre los siete slots RV obligatorios activos | Divisor fijo vigente: 7; la verificación se muestra aparte |
| Completitud fotográfica obligatoria | mandatoryPhotosCompleted = 7 | Sólo mide cobertura de los siete slots; fotos adicionales no sustituyen faltantes |
| Fotografías adicionales | Fotos activas que no son la foto principal asignada a uno de los siete slots obligatorios | Incluye códigos no obligatorios y duplicados de un slot obligatorio; se conservan |
| Fotografías totales | COUNT de fotos activas de la inspección | Puede ser cualquier N y nunca se presenta como N/7 |
| GPS disponible | Existe al menos una fila en `location_samples` para la inspección | Precisión nula no invalida presencia |
| Señal disponible | Existe al menos una fila en `signal_samples` para la inspección | dBm puede ser nulo |

La regla de “revisado” se mantiene idéntica al endpoint administrativo existente para evitar dos verdades. La rama evolutiva con oficialidad global podría reemplazarla en una fase coordinada, pero no se activa desde el frontend mientras no esté en `main`/despliegue confirmado.

Los siete slots obligatorios vigentes son front_closed, left_side, right_side, back, top, front_open y serial_plate. Una inspección con esos siete slots y dos fotos adicionales se muestra como “7/7 obligatorias · 9 total”, nunca “9/7”.

## Hydrant RV Status

Fecha de decisión: 2026-08-13. Fuente: `rvMapStatus` de API/Flutter y proyección vigente del catálogo móvil.

- `completed`: existe al menos una inspección RV del hidrante en `submitted` o `validated`.
- `pending`: no existe ninguna inspección RV en esos estados, incluso si hay borradores, una revisión en progreso, rechazada o cancelada.
- El cálculo considera todas las revisiones RV del hidrante, no sólo la última.
- `latestInspectionStatus` se muestra por separado y conserva el estado exacto de la revisión más reciente. Por ello un hidrante puede tener RV global completado y una revisión posterior en progreso.
- `reviewed` del avance general es un concepto distinto y mantiene la fórmula certificada: alguna RV `submitted`, `validated` o `rejected`.
- Un hidrante sin revisiones es `pending`, pero la UI presenta “Sin revisión” en evidencia y cronología; no lo trata como `0/7` incompleto.

Métricas de expediente:

| Métrica | Fórmula |
|---|---|
| Total de revisiones | `COUNT(inspections WHERE hydrant_id = H AND inspection_type_code='RV')` |
| Primera revisión | `MIN(started_at)` de RV |
| Última revisión | Primera fila por `COALESCE(submitted_at,started_at) DESC, revision_number DESC` |
| Enviadas/validadas/rechazadas/canceladas | Conteo condicional por estado persistido |
| Evidencia completa histórica | Revisiones cuyo conteo distinto de los siete slots obligatorios es 7 |
| Porcentaje completo | `100 * completeEvidenceCount / inspectionCount`; no disponible sin revisiones |

## Límite de Fase 2

Estas son las únicas métricas derivadas aceptadas para el expediente maestro. La galería global y la exportación XLSX detectadas en `d5aa482` no alteran las fórmulas ni forman parte de la certificación de Fase 2. Tampoco se agregan métricas de administración, mapa global, dispositivos, validación/rechazo o comparación de revisiones.
