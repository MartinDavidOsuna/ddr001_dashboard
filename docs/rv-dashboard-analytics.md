# Motor administrativo RV — contrato 1

Macroetapa 1. Lectura administrativa para dashboard y futuros reportes. No cambia captura, preguntas, sincronización, almacenamiento ni contratos móviles. Las etiquetas y códigos institucionales están centralizados en `src/modules/admin/rv-analytics.catalog.ts`; el frontend y los futuros PDF/Excel deben consumir este motor, sin reconstruir fórmulas.

## Auditoría y procedencia

Base de implementación: `origin/main` `f2d9ca170e86e00e9a4a8cb68935271047715c7c`, consultado mediante fetch el 2026-10-15. Árbol original limpio. Rama nueva en el directorio original; sin clones, cherry-picks, migraciones ni despliegue. El fetch de origin fue satisfactorio; `fetch --all` informó además el remoto deliberadamente inválido `LOCAL_ONLY_DO_NOT_PUSH`.

Integraciones recientes revisadas: PR #18, semántica de tamaños/dry-run storage; PR #17, copia/verificación histórica NAS; PR #16, administración de Gabinetes. Diagnósticos incluye resúmenes Q1/Q2 (`683c182`) y correcciones auditadas (`0366ff3`). Administración RV incluye retiro, Ausente, versiones inmutables, elemento filtrante indefinido, conexión de pilotos y fotos generales. PR abierto #19 de Gabinetes revisado como trabajo independiente; no se incorpora su rama.

Se contrastaron `database/01_revision_visual_starter_SQL2014.sql`, `02_rv_catalog_and_checklist.sql`, `05_typed_brands_and_parcel_valves.sql`, `11_flow_meter_photos_and_five_parcel_valves.sql`, `12_venturi_suction_line_questions.sql`, migraciones posteriores, módulos inspections/checklist/visual-reports y las proyecciones y filtros administrativos existentes. Los archivos `docs/dashboard-data-dictionary.md` y `docs/dashboard-metrics.md` no existen en este HEAD.

El starter define 77 preguntas; la reorganización v2 preserva códigos y cambia secciones. Las evoluciones posteriores agregan cable/fotos del medidor, succión Venturi, conexión de pilotos y estados/readability. Las parcelarias pasan del bloque genérico a configuración y componentes, ampliados de tres a cinco. Por tanto no se utiliza un número de versión como sustituto de presencia de una pregunta.

Auditoría de la base local configurada **TEST**, verificando nombre configurado e identidad SQL antes de consultar: `DDR001_Hidrantes_TEST`, compatibilidad 120. V1: 79 ítems/12 secciones; v2: 86 ítems/9 secciones. Operadores instalados: `eq`, `gt`. Estados visibles RV observados: submitted 547, in_progress 163, conflict 3. Son datos de TEST, no una afirmación sobre producción. No se consultó producción.

## Universo y revisión actual

Sólo hidrantes activos del catálogo, tipo RV. La fuente de visibilidad es `rv.dashboard_inspections`: excluye `inspection_withdrawals`, que es también el mecanismo de archivo administrativo auditado. Nunca hay un modo que recupere retiradas.

`current` utiliza el puntero oficial `rv.hydrant_rv_status.official_inspection_id`, no la última captura por fecha. Compite únicamente con cierres `inactive` explícitamente registrados en `inspection_inactive_closures`. Entre ese puntero oficial y cierres Ausente se elige el evento más reciente por `closed_at` para Ausente y `submitted_at` (respaldo `started_at`) para oficial; desempate por revisión descendente y UUID. No se deduce oficialidad de fechas. Se conserva como candidato el puntero incluso cuando fue retirado/rechazado: la selección ocurre **antes** de excluirlo, evitando resucitar una captura anterior.

Después de seleccionar se exige visibilidad en `dashboard_inspections`; la revisión física debe estar submitted/validated y su reporte, si existe, submitted/validated. Se excluyen draft, in_progress, pending_sync, rejected, conflict, cancelled y reportes returned/reopened. Un hidrante sin puntero oficial ni cierre Ausente no tiene estado actual evaluable; no se inventa un respaldo por fecha. Un conflicto paralelo no invalida por sí solo la captura oficial aceptada.

Luego se aplican todos los filtros. Filtrar por técnico o fecha no convierte un registro viejo en actual. El alcance es común para todos los bloques. `history` incluye inspecciones submitted/validated y cierres Ausente visibles; no cuenta cada snapshot como inspección separada ni representa un estado histórico «a fecha de corte». Las distribuciones, hallazgos y tendencia históricos cuentan **inspecciones**; summary/systems que llevan nombre hydrants deduplican hidrantes. En historia, categorías como Ausente y evaluado pueden superponerse para un mismo hidrante en diferentes revisiones.

### Contenido versionado

La proyección relacional es la fuente establecida para la versión inicial, incluidas las versiones de migración cuyo snapshot es NULL. Una versión posterior con cambio técnico sustituye el conjunto completo de respuestas/configuración/componentes mediante su snapshot, nunca mezcla respuestas anteriores. Los complementos no técnicos y reaperturas heredan el ancestro técnico más próximo siguiendo `parent_version_id` del mismo reporte; no se interpreta como checklist un snapshot parcial de observaciones/fotos generales. Un snapshot técnico editado debe tener la estructura completa `schemaVersion: 1` que genera `inspectionSnapshot`. Si es incompatible, duplicado o de otra inspección: HTTP 503, sin sustituir respuestas obsoletas. Una cadena incompleta/cíclica no produce estadísticas válidas.

El contenido se relaciona por item_id de su propia definición, pero el significado institucional se resuelve por **código estable**, dentro de checklist_version_id. No se filtran definiciones históricas sólo porque hoy estén inactivas. Pregunta inexistente: noData y unavailable (subconjunto), nunca componente ausente. Dependencias usan la definición almacenada de cada versión. No se inventan dependencias para soportes que no las tienen.

## Estados y fórmulas

Cada indicador devuelve affected, evaluated, percentage, notApplicable, noData, unavailable. evaluated = affected + observaciones explícitas no afectadas. percentage = 100 × affected/evaluated, redondeado a dos decimales; denominador cero produce 0. Unidad: hidrantes en current, inspecciones en history.

Se evalúa primero toda la cadena de dependencias. Padre falso o NA: descendiente NA incluso si conserva una respuesta vieja. Padre sin respuesta, referencia inexistente o dependencia no soportada: sin dato; nunca falla. Se soportan eq/neq/gt/gte/lt/lte; `in` no está instalado en TEST y queda conservadoramente sin dato si apareciese, hasta incorporar su semántica explícita. Un NA explícito siempre prevalece. Ciclos provocan error por límite de recursión, sin respuesta parcial.

filter_element_state present/absent prevalece sobre boolean legacy; undefined es calidad de información y se excluye del denominador físico de ausencia. En respuestas antiguas sin state se usa el boolean explícito. No se interpreta undefined como absent. Marcas ilegibles forman categoría Ilegible, sin adjudicarles marca.

* selectedHydrants: hidrantes distintos con revisión seleccionada visible, incluidos Ausentes.
* evaluatedHydrants: hidrantes distintos con al menos un indicador físico explícitamente evaluado.
* hydrantsWithFindings: distintos con al menos un indicador físico affected.
* hydrantsWithoutFindings: distintos con evaluación física y cero hallazgos en todo el alcance seleccionado. Significa «sin hallazgos detectados», no certifica ausencia de problemas en campos sin dato.
* findingCount: suma de incidencias **indicador × inspección**; cada problema parcelario suma como máximo una vez por inspección, aunque afecte varios componentes. Puede superar hydrantsWithFindings.
* inactiveHydrants: hidrantes distintos con cierre Ausente seleccionado. No ejecutan checklist ni integran denominadores físicos, inventarios o completitud fotográfica ordinaria. Se informa aparte su calidad GPS/señal/fotos.
* catalogHydrants: todo el catálogo activo. coveragePercent = selectedHydrants/catalogHydrants × 100. El denominador institucional es el catálogo completo y no cambia por técnico/cuadrilla/fecha; el numerador sí respeta filtros. Ausente cuenta como visita RV cubierta, no como evaluación física.
* noEvaluableDataHydrants: distintos no Ausentes que no tienen ningún indicador físico evaluable.

Sistemas: hydrantsEvaluated = distintos con algún indicador evaluado del sistema; hydrantsAffected = distintos con alguno afectado; findingCount = incidencias del sistema. Un hidrante puede afectar varios sistemas: porcentajes no suman 100%.

Pareto: sólo indicadores físicos con affected > 0, orden descendente por affected y empate por código. cumulativeAffected acumula incidencias; cumulativePercentage = cumulativeAffected / suma de affected de todos los indicadores físicos × 100. No usa como denominador hidrantes únicos. El último punto es 100% cuando hay hallazgos. Sin hallazgos devuelve []. Calidad queda fuera.

Parcelarias: configuración especializada prevalece sobre legacy. Los tres indicadores de presencia se evalúan con cada componente; cualquier ausencia explícita confirma afectación. Sin ausencia, una configuración incompleta queda sin dato. Conexión requiere piloto presente: cero pilotos es NA, NULL no es desconexión. Sin estructura especializada se conserva la respuesta genérica legacy para los tres indicadores de presencia; no se multiplica ese boolean por la cantidad para inventar componentes afectados. components cuenta sólo filas especializadas observadas, nunca multiplica hidrantes. Configuraciones informan cantidad declarada y components cantidad observada; pueden diferir si hay captura incompleta.

## API

`GET /api/v1/admin/dashboard/rv-analytics`

Autenticación administrativa existente, roles viewer/supervisor/admin. Identidades móviles y peticiones sin token: 401. No se crean rutas de escritura.

| Parámetro | Contrato |
| --- | --- |
| mode | current (predeterminado), history |
| from | ISO UTC con Z; inclusivo, sobre started_at |
| to | ISO UTC con Z; exclusivo, mayor que from |
| userId / crewId | UUID existente; cuadrilla desde work_sessions |
| status | submitted, validated, inactive; otros estados no son evaluables |
| grain | day, week, month; predeterminado month |

Parámetros desconocidos se rechazan. Semana empieza lunes. Buckets por fecha local del inicio: UTC−7 fijo, consistente con America/Hermosillo y el módulo de actividad; no cambia timezone global. Tendencia devuelve inspecciones, hidrantes distintos, evaluated, affected, percentageAffected. Aun en current es una cohorte del estado seleccionado agrupada por inicio; no mide deterioro ni transiciones y no confunde cantidad de actividad con condición. No se rellenan buckets vacíos.

Ejemplo JSON completo reproducible, sin datos personales: `rv-dashboard-analytics.example.json` (alcance vac?o).

Respuesta TypeScript exportada: `RvAnalyticsResponse` en `rv-analytics.ts`; contractVersion = 1. Bloques: scope, summary, findings, pareto, systems, distributions, trend, dataQuality, parcelValves. No expone respuestas individuales, coordenadas, IDs de personas, snapshots, rutas ni credenciales. scope refleja los UUID de filtro que envió el consumidor.

Sin datos: conteos y porcentajes cero, catálogo como denominador, catálogo de indicadores/sistemas/distribuciones estable con valores vacíos, pareto/trend vacíos. No se retorna NaN ni se presenta falta de datos como condición sana.

Máximo 5000 inspecciones seleccionadas y 16 MiB de snapshots técnicos editados; excederlo devuelve 422 solicitando acotar filtros, nunca un resultado truncado. Existe además el timeout SQL configurado. Los límites no paginan estadísticas ni cambian denominadores silenciosamente.

### Calidad y fotos

GPS/señal significa existencia de muestra registrada, no precisión suficiente ni calidad de cobertura celular. Cuando existe configuraci?n parcelaria especializada, se excluyen las preguntas legacy sustituidas del conteo de campos faltantes, igual que dashboard-checklist.ts. Los campos aplicables obligatorios sin dato cuentan definiciones text/select/boolean/integer/decimal aplicables sin valor; los faltantes de indicadores se informan separadamente y no son equivalentes a todos los campos del formulario. Sin dato de padre no se asegura aplicabilidad del hijo.

Se reutilizan los siete slots base de `dashboard-photos.ts`. baseComplete/baseIncomplete no dependen de fotos adicionales. complete/incomplete agregan fotos condicionales obligatorias del checklist de la versión; una dependencia desconocida con el resto completo produce indeterminate. Ausente no requiere las siete fotos ordinarias. Completitud significa registro no borrado con upload_status verified y hash servidor, y, si existe versi?n oficial, mapeo de la foto a esa versi?n; no una nueva lectura del archivo. photoIntegrity agrupa además integrity_status y mapping_status ya persistidos: confirmed, missing_original, missing_thumbnail, hash_mismatch, missing_mapping, mapping_conflict, not_verified, etc. integrityVerified se refiere a upload verificado + hash, no reemplaza integrityStatus ni prueba disponibilidad NAS en tiempo real. No se repara, reconcilia, lee NAS ni modifica fotos.

## Ejecución, seguridad y rendimiento

Dos batches del motor en una transacción REPEATABLE_READ y una consulta de autenticación: aproximadamente tres round-trips de datos, más control BEGIN/COMMIT. El primer batch usa Request.batch con parámetros tipados (nvarchar para evitar la validación varchar sin collation del padre Transaction en mssql), preservando las #temp entre llamadas. Request.query/sp_executesql no preservaría tablas creadas dentro de su ámbito. El segundo agrega y elimina las tablas temporales. Ante errores se revierte la transacción.

SQL set-based: selección canónica, scope materializado, relaciones por checklist/inspección, dependencias recursivas, agregación condicional y por subsistema, inventarios, calidad y buckets. No hay query por indicador ni por hidrante. Node sólo normaliza JSON de cambios técnicos editados (SQL2014 no tiene OPENJSON) a XML parametrizado; no agrupa respuestas crudas. Iniciales y complementos no técnicos se resuelven en SQL. Node ordena los pocos indicadores agregados para Pareto y formatea resultados tipados.

Se reutilizan PK/UQ de status por hydrant, versiones por ID, answers(inspection_id,item_id), parcel configuration por inspection, parcel valves(inspection_id,valve_index), checklist por versión/sección e índices de inspección/fotos existentes. #scope/#answers/#resolved/#cells/#valves/#config reciben índices temporales locales. **No se crea ningún índice persistente ni migración**: no se ha demostrado su necesidad con planes de producción. REPEATABLE_READ puede retener locks compartidos durante la lectura; límites y timeout acotan la consulta. No se usa NOLOCK ni se cambia aislamiento global.

Medición real TEST, compatibilidad 120: 543 inspecciones/hidrantes actuales, cero snapshots técnicos editados: aproximadamente 5,2 segundos extremo a extremo de los dos batches por la conexión local remota; ejecución adicional 5,6 s. STATISTICS TIME opt-in permitió identificar aproximadamente 1,7 s en resolución de dependencias. No es un SLA, un benchmark de concurrencia, ni prueba de 5000 inspecciones. Antes de dimensionar producción se debe contrastar su cardinalidad y concurrencia; no se afirma un plan de ejecución de producción.

## Validación reproducible

`npm run type-check`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

Pruebas unitarias: booleanos true/false, ausencia/NA, undefined, snapshots inválidos, múltiples componentes, filtros y límites, cero, Pareto, sistemas, tendencia y permisos viewer/supervisor/admin, rechazo móvil y ausencia de rutas de escritura. Las semánticas SQL se prueban ejecutando los batches reales con fixtures temporales: versiones diferentes, hija obsoleta con componente ausente, padre sin dato, Ausente, múltiples revisiones, retirada, múltiples hallazgos, parcelas, filtros, timezone día/semana/mes y reemplazo técnico vía XML.

Integración opt-in: `RUN_RV_ANALYTICS_SQL_INTEGRATION=true npx vitest run tests/integration/rv-analytics.integration.test.ts --maxWorkers=1` (en PowerShell asignar `$env:RUN_RV_ANALYTICS_SQL_INTEGRATION='true'` antes). Se exige SQL_DATABASE configurado y DB_NAME() iguales a DDR001_Hidrantes_TEST antes de cualquier fixture. No cambia la configuración al nombre de una DB supuesta. Fixtures sólo #temp y rollback; la prueba de datos instalados sólo lee. `RV_ANALYTICS_PROFILE=true` habilita tiempos SQL agregados, sin datos de captura. La suite general no activa integración.

## Límites de interpretación y Macroetapa 2

No se infiere «sin chapa», «puerta no abre», capacidad hidráulica, falla de bomba, incumplimiento por marca ilegible, deterioro temporal, ausencia por falta de respuesta ni estado de componente a partir de una foto. Texto libre/observaciones/motivos indefinidos existen, pero no se codifican automáticamente como fallas ni se grafican sus combinaciones. Rangos de manómetros son inventario, no mediciones operativas. Una revisión parcial sin hallazgos no es certificación de funcionamiento completo.

Macroetapa 2 pendiente: frontend y visualización; luego PDF/Excel sobre este mismo contrato. No se generaron esos archivos. No hay supuestos pendientes de aprobación para continuar esta implementación; las definiciones institucionales y límites anteriores se entregan expresamente para revisión.

## Catálogo institucional completo

Las tablas siguientes enumeran las métricas auditadas e implementadas. En todas, NA = respuesta explícita NA o dependencia incumplida; sin dato = respuesta ausente, inválida, dependencia desconocida o código no disponible. unavailable es el subconjunto sin definición en esa versión. «Por código» significa que sólo se evalúan versiones donde ese código/estructura existe, sin exigir v1/v2 idénticas.


| Código | Nombre | Sistema | Fuente | Condición de afectación | Denominador | No aplica | Sin dato | Versiones compatibles | Observaciones / Estado |
|---|---|---|---|---|---|---|---|---|---|
| RV-CAB-001 | Chapas que no abren | Gabinete | inspection_answers / locks_open | locks_open = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-CAB-002 | Fugas internas | Gabinete | inspection_answers / internal_leaks | internal_leaks = true | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-CAB-003 | Puertas ausentes | Gabinete | inspection_answers / cabinet_doors | cabinet_doors = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-ENE-001 | Panel solar ausente | Energía y control | inspection_answers / solar_panel | solar_panel = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-ENE-002 | Batería ausente | Energía y control | inspection_answers / battery | battery = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-ENE-003 | Controlador ausente | Energía y control | inspection_answers / controller | controller = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-ENE-004 | Controlador: antena ausente | Energía y control | inspection_answers / controller_antenna | controller_antenna = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-MED-001 | Válvula manual principal ausente | Válvula principal / medición | inspection_answers / main_manual_valve | main_manual_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-MED-002 | Medidor de flujo ausente | Válvula principal / medición | inspection_answers / flow_meter | flow_meter = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-MED-003 | Medidor sin cable de pulsos | Válvula principal / medición | inspection_answers / flow_meter_pulse_cable | flow_meter_pulse_cable = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-MED-004 | Medidor presente que no funciona | Válvula principal / medición | inspection_answers / flow_meter_works | flow_meter_works = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-001 | Válvula hidráulica reguladora/sostenedora ausente | Regulación | inspection_answers / reg_sust_valve | reg_sust_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-002 | Solenoide ausente | Regulación | inspection_answers / reg_sust_solenoid | reg_sust_solenoid = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-003 | Piloto sostenedor ausente | Regulación | inspection_answers / sustaining_pilot | sustaining_pilot = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-004 | Manómetro del piloto sostenedor ausente | Regulación | inspection_answers / sustaining_gauge | sustaining_gauge = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-005 | Piloto regulador ausente | Regulación | inspection_answers / regulating_pilot | regulating_pilot = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-006 | Manómetro del piloto regulador ausente | Regulación | inspection_answers / regulating_gauge | regulating_gauge = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-AIR-001 | Válvula de aire ausente | Aire | inspection_answers / air_valve | air_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-001 | Válvula hidráulica del inyector ausente | Inyección | inspection_answers / injector_hydraulic_valve | injector_hydraulic_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-002 | Solenoide del inyector ausente | Inyección | inspection_answers / injector_solenoid | injector_solenoid = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-003 | Inyector Venturi ausente | Inyección | inspection_answers / venturi | venturi = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-004 | Línea de succión ausente | Inyección | inspection_answers / venturi_suction_line | venturi_suction_line = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-005 | Línea de succión sin válvula | Inyección | inspection_answers / venturi_suction_valve | venturi_suction_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-006 | Línea de succión sin filtro | Inyección | inspection_answers / venturi_suction_filter | venturi_suction_filter = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-INY-007 | Válvula manual del inyector ausente | Inyección | inspection_answers / injector_manual_valve | injector_manual_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-USR-001 | Válvula manual de usuario ausente | Usuario / filtración | inspection_answers / user_manual_valve | user_manual_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-001 | Filtro ausente | Usuario / filtración | inspection_answers / filter | filter = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-002 | Elemento filtrante ausente | Usuario / filtración | inspection_answers / filter_element | filter_element = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-003 | Manómetro antes del filtro ausente | Usuario / filtración | inspection_answers / filter_gauge_before | filter_gauge_before = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-004 | Manómetro después del filtro ausente | Usuario / filtración | inspection_answers / filter_gauge_after | filter_gauge_after = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-005 | Válvula de drenaje ausente | Usuario / filtración | inspection_answers / filter_drain_valve | filter_drain_valve = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-FIL-006 | Solenoide de drenaje ausente | Usuario / filtración | inspection_answers / filter_drain_solenoid | filter_drain_solenoid = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-SOP-001 | Falta de fijaciones hidráulicas | Soportes | inspection_answers / hydraulic_fixings | hydraulic_fixings = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-SOP-002 | Falta de soporte de reguladores y manómetros | Soportes | inspection_answers / reg_sust_gauge_support | reg_sust_gauge_support = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-SOP-003 | Falta de soporte parcelario | Soportes | inspection_answers / parcel_gauge_support | parcel_gauge_support = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-DAT-001 | Elemento filtrante indefinido | Calidad de información | inspection_answers / filter_element | filter_element = undefined | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Calidad; fuera del Pareto; IMPLEMENTADO |
| RV-PAR-001 | Alguna válvula parcelaria sin solenoide | Parcelarias | inspection_parcel_valves + configuration; legacy parcel_solenoid | alguna fila has_solenoid=0 | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Incidencia por inspección; componentes aparte; IMPLEMENTADO |
| RV-PAR-002 | Alguna válvula parcelaria sin piloto | Parcelarias | inspection_parcel_valves + configuration; legacy parcel_regulating_pilot | alguna fila has_pilot=0 | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Incidencia por inspección; componentes aparte; IMPLEMENTADO |
| RV-PAR-003 | Alguna válvula parcelaria sin manómetro | Parcelarias | inspection_parcel_valves + configuration; legacy parcel_gauge | alguna fila has_pressure_gauge=0 | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Incidencia por inspección; componentes aparte; IMPLEMENTADO |
| RV-REG-007 | Piloto sostenedor desconectado | Regulación | inspection_answers / sustaining_pilot_connected | sustaining_pilot_connected = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-REG-008 | Piloto regulador desconectado | Regulación | inspection_answers / regulating_pilot_connected | regulating_pilot_connected = false | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Hallazgo físico explícito; IMPLEMENTADO |
| RV-PAR-004 | Alguna válvula parcelaria con piloto desconectado | Parcelarias | inspection_parcel_valves + configuration; legacy parcel_pilot_connected | alguna fila has_pilot=1 y pilot_connected=0 | Observaciones aplicables explícitas | Dependencia / NA | Ausente o desconocido | Por código / estructura | Incidencia por inspección; componentes aparte; IMPLEMENTADO |

### Inventarios auditados

Unidad: hidrante en current, inspección en history. Denominador: todas las observaciones físicas seleccionadas, incluidos NA/sin dato; porcentajes de valores suman aproximadamente 100% por redondeo. Etiquetas sí/no describen respuestas; no son automáticamente fallas. Marcas/diámetros/rangos conservan el display almacenado: no se homologan textos legacy sin un catálogo explícito.

| Código | Distribución | Fuente | Estado |
|---|---|---|---|
| RV-INV-locks_open | Chapas abren | inspection_answers / locks_open | IMPLEMENTADO |
| RV-INV-internal_leaks | Fugas internas | inspection_answers / internal_leaks | IMPLEMENTADO |
| RV-INV-cabinet_doors | Gabinete: puertas presentes | inspection_answers / cabinet_doors | IMPLEMENTADO |
| RV-INV-solar_panel | Panel solar presente | inspection_answers / solar_panel | IMPLEMENTADO |
| RV-INV-battery | Batería presente | inspection_answers / battery | IMPLEMENTADO |
| RV-INV-controller | Controlador presente | inspection_answers / controller | IMPLEMENTADO |
| RV-INV-controller_antenna | Controlador: antena presente | inspection_answers / controller_antenna | IMPLEMENTADO |
| RV-INV-main_manual_valve | Válvula manual principal presente | inspection_answers / main_manual_valve | IMPLEMENTADO |
| RV-INV-main_manual_valve_diameter | Diámetro | inspection_answers / main_manual_valve_diameter | IMPLEMENTADO |
| RV-INV-flow_meter | Medidor de flujo presente | inspection_answers / flow_meter | IMPLEMENTADO |
| RV-INV-flow_meter_brand | Marca del medidor | inspection_answers / flow_meter_brand | IMPLEMENTADO |
| RV-INV-flow_meter_pulse_cable | ¿Tiene cable para salida de pulsos? | inspection_answers / flow_meter_pulse_cable | IMPLEMENTADO |
| RV-INV-flow_meter_works | Funciona al abrir válvula y verificar movimiento del registro | inspection_answers / flow_meter_works | IMPLEMENTADO |
| RV-INV-flow_meter_diameter | Diámetro | inspection_answers / flow_meter_diameter | IMPLEMENTADO |
| RV-INV-reg_sust_valve | Válvula hidráulica reguladora/sostenedora presente | inspection_answers / reg_sust_valve | IMPLEMENTADO |
| RV-INV-reg_sust_brand | Marca | inspection_answers / reg_sust_brand | IMPLEMENTADO |
| RV-INV-reg_sust_diameter | Diámetro | inspection_answers / reg_sust_diameter | IMPLEMENTADO |
| RV-INV-reg_sust_solenoid | Solenoide presente | inspection_answers / reg_sust_solenoid | IMPLEMENTADO |
| RV-INV-reg_sust_solenoid_brand | Marca del solenoide | inspection_answers / reg_sust_solenoid_brand | IMPLEMENTADO |
| RV-INV-sustaining_pilot | Piloto sostenedor presente | inspection_answers / sustaining_pilot | IMPLEMENTADO |
| RV-INV-sustaining_gauge | Manómetro del piloto sostenedor presente | inspection_answers / sustaining_gauge | IMPLEMENTADO |
| RV-INV-sustaining_gauge_range | Rango del manómetro sostenedor | inspection_answers / sustaining_gauge_range | IMPLEMENTADO |
| RV-INV-regulating_pilot | Piloto regulador presente | inspection_answers / regulating_pilot | IMPLEMENTADO |
| RV-INV-regulating_gauge | Manómetro del piloto regulador presente | inspection_answers / regulating_gauge | IMPLEMENTADO |
| RV-INV-regulating_gauge_range | Rango del manómetro regulador | inspection_answers / regulating_gauge_range | IMPLEMENTADO |
| RV-INV-air_valve | Válvula de aire presente | inspection_answers / air_valve | IMPLEMENTADO |
| RV-INV-air_valve_brand | Marca | inspection_answers / air_valve_brand | IMPLEMENTADO |
| RV-INV-air_valve_diameter | Diámetro | inspection_answers / air_valve_diameter | IMPLEMENTADO |
| RV-INV-injector_hydraulic_valve | Válvula hidráulica del inyector presente | inspection_answers / injector_hydraulic_valve | IMPLEMENTADO |
| RV-INV-injector_hydraulic_brand | Marca | inspection_answers / injector_hydraulic_brand | IMPLEMENTADO |
| RV-INV-injector_hydraulic_diameter | Diámetro | inspection_answers / injector_hydraulic_diameter | IMPLEMENTADO |
| RV-INV-injector_solenoid | Solenoide del inyector presente | inspection_answers / injector_solenoid | IMPLEMENTADO |
| RV-INV-injector_solenoid_brand | Marca del solenoide | inspection_answers / injector_solenoid_brand | IMPLEMENTADO |
| RV-INV-venturi | Inyector Venturi presente | inspection_answers / venturi | IMPLEMENTADO |
| RV-INV-venturi_suction_line | Línea de succión presente | inspection_answers / venturi_suction_line | IMPLEMENTADO |
| RV-INV-venturi_suction_valve | Válvula presente | inspection_answers / venturi_suction_valve | IMPLEMENTADO |
| RV-INV-venturi_suction_filter | Filtro presente | inspection_answers / venturi_suction_filter | IMPLEMENTADO |
| RV-INV-venturi_diameter | Diámetro del Venturi | inspection_answers / venturi_diameter | IMPLEMENTADO |
| RV-INV-injector_manual_valve | Válvula manual del inyector presente | inspection_answers / injector_manual_valve | IMPLEMENTADO |
| RV-INV-user_manual_valve | Válvula manual de usuario presente | inspection_answers / user_manual_valve | IMPLEMENTADO |
| RV-INV-user_manual_valve_diameter | Diámetro | inspection_answers / user_manual_valve_diameter | IMPLEMENTADO |
| RV-INV-filter | Filtro presente | inspection_answers / filter | IMPLEMENTADO |
| RV-INV-filter_type | Tipo de filtro | inspection_answers / filter_type | IMPLEMENTADO |
| RV-INV-filter_brand | Marca | inspection_answers / filter_brand | IMPLEMENTADO |
| RV-INV-filter_element | Tiene elemento filtrante | inspection_answers / filter_element | IMPLEMENTADO |
| RV-INV-filter_gauge_before | Tiene manómetro antes | inspection_answers / filter_gauge_before | IMPLEMENTADO |
| RV-INV-filter_gauge_before_range | Rango del manómetro antes | inspection_answers / filter_gauge_before_range | IMPLEMENTADO |
| RV-INV-filter_gauge_after | Tiene manómetro después | inspection_answers / filter_gauge_after | IMPLEMENTADO |
| RV-INV-filter_gauge_after_range | Rango del manómetro después | inspection_answers / filter_gauge_after_range | IMPLEMENTADO |
| RV-INV-filter_drain_valve | Válvula de drenaje presente | inspection_answers / filter_drain_valve | IMPLEMENTADO |
| RV-INV-filter_drain_diameter | Diámetro de válvula de drenaje | inspection_answers / filter_drain_diameter | IMPLEMENTADO |
| RV-INV-filter_drain_brand | Marca de válvula de drenaje | inspection_answers / filter_drain_brand | IMPLEMENTADO |
| RV-INV-filter_drain_solenoid | Solenoide de drenaje presente | inspection_answers / filter_drain_solenoid | IMPLEMENTADO |
| RV-INV-filter_drain_solenoid_brand | Marca del solenoide de drenaje | inspection_answers / filter_drain_solenoid_brand | IMPLEMENTADO |
| RV-INV-hydraulic_fixings | Elementos de fijación de la hidráulica al gabinete | inspection_answers / hydraulic_fixings | IMPLEMENTADO |
| RV-INV-reg_sust_gauge_support | Soporte de manómetros y reguladores de válvula reguladora/sostenedora | inspection_answers / reg_sust_gauge_support | IMPLEMENTADO |
| RV-INV-parcel_gauge_support | Soporte de manómetros y reguladores de válvulas parcelarias | inspection_answers / parcel_gauge_support | IMPLEMENTADO |
| parcel_configuration | Configuraciones y cantidad declarada | inspection_parcel_valve_configurations | IMPLEMENTADO |
| parcel_components | Cantidad observada, sin solenoide/piloto/manometro y pilotos desconectados | inspection_parcel_valves, filas individuales | IMPLEMENTADO |
| parcel_brand | Marcas de valvula por componente | valve_brand_display_value / readability | IMPLEMENTADO |
| parcel_diameter | Diametros por componente | diameter_display_value | IMPLEMENTADO |
| parcel_pressure_range | Rangos por componente | pressure_range_display; gauge ausente = NA | IMPLEMENTADO |

### Calidad, ejecutivos y conceptos descartados

| Codigo | Indicador | Sistema | Formula | Denominador | Fuente | Estado |
|---|---|---|---|---|---|---|
| summary.evaluatedHydrants | Hidrantes evaluados | Ejecutivo | Distintos con algun indicador fisico evaluado | No aplica (conteo) | scope + cells | IMPLEMENTADO |
| summary.hydrantsWithFindings | Hidrantes con hallazgos | Ejecutivo | Distintos con al menos un affected fisico | No aplica (conteo) | scope + cells | IMPLEMENTADO |
| summary.hydrantsWithoutFindings | Hidrantes sin hallazgos detectados | Ejecutivo | Distintos evaluados sin incidencias en el alcance | No aplica (conteo) | scope + cells | IMPLEMENTADO |
| summary.findingCount | Total de hallazgos | Ejecutivo | Suma indicador x inspeccion afectado | No aplica (conteo) | cells fisicas | IMPLEMENTADO |
| summary.inactiveHydrants | Hidrantes Ausentes | Ejecutivo | Distintos con cierre inactive seleccionado | No aplica (conteo) | inactive_closures + scope | IMPLEMENTADO |
| summary.coveragePercent | Cobertura RV | Ejecutivo | 100 x distintos seleccionados / catalogo activo | Catalogo activo | scope + hydrants | IMPLEMENTADO |
| dataQuality.withoutGps | Revisiones sin GPS registrado | Calidad | Inspecciones sin filas location_samples | Seleccionadas, incluso Ausentes | location_samples | IMPLEMENTADO |
| dataQuality.withoutSignal | Revisiones sin senal registrada | Calidad | Inspecciones sin filas signal_samples | Seleccionadas, incluso Ausentes | signal_samples | IMPLEMENTADO |
| dataQuality.requiredEvidence.baseComplete/baseIncomplete | Siete evidencias base completas/incompletas | Calidad | Todos/algun slot base verificado faltante | No Ausentes | photos, slots base | IMPLEMENTADO |
| dataQuality.requiredEvidence.complete/incomplete/indeterminate | Evidencia obligatoria versionada | Calidad | Base + condicionales; dependencia desconocida separada | No Ausentes | checklist + photos | IMPLEMENTADO |
| dataQuality.photoIntegrity | Fotos verificadas y estados de integridad | Calidad | Agrupacion upload/status/mapping persistidos | Fotos no borradas del alcance | photos | IMPLEMENTADO |
| dataQuality.missingIndicatorObservations | Indicadores fisicos sin dato | Calidad | Celdas fisicas noData | Observaciones de indicadores, no preguntas unicas | cells | IMPLEMENTADO |
| dataQuality.applicableRequiredFieldsWithoutData | Campos aplicables obligatorios sin dato | Calidad | Campos escalares requeridos aplicables sin valor | Definiciones aplicables | checklist + answers | IMPLEMENTADO |
| dataQuality.inactiveInspections | Revisiones Ausentes | Calidad | Numero de cierres seleccionados | Inspecciones seleccionadas | scope | IMPLEMENTADO |
| sin_chapa | Gabinete sin chapa | Gabinete | No existe pregunta especifica de presencia | Ninguno | locks_open no demuestra presencia/ausencia | DESCARTADO POR FALTA DE DATO |
| puerta_no_abre | Puerta que no abre | Gabinete | cabinet_doors solo registra presencia | Ninguno | Sin campo especifico | DESCARTADO POR FALTA DE DATO |
| componente_foto_inferido | Falla deducida de fotografias | Varios | No se interpreta contenido visual | Ninguno | Sin observacion estructurada | DESCARTADO POR FALTA DE DATO |
| capacidad_hidraulica | Capacidad/deficiencia funcional no observada | Varios | No se deriva de marca/diametro/rango | Ninguno | RV no contiene prueba suficiente | DESCARTADO POR FALTA DE DATO |
| deterioro_temporal | Deterioro basado en crecimiento de actividad | Temporal | Actividad no demuestra deterioro | Ninguno | Sin comparacion homogenea de transiciones | DESCARTADO POR FALTA DE DATO |
| legacy_component_count | Componentes individuales afectados legacy | Parcelarias | Boolean global no permite distribuir entre valvulas | Ninguno | Preguntas legacy | DESCARTADO POR FALTA DE DATO |
| physical_inactive | Checklist fisico de Ausente | Todos | Excluido del universo fisico | Ninguno | Cierre inactive | NO APLICA |
| filter_element_undefined_reason | Motivos libres de elemento indefinido | Calidad | Se conserva en captura; no clasifica automaticamente | Ninguno para Pareto | inspection_answers | NO APLICA |
| observations | Observaciones y comentarios libres como fallas | Varios | Sin clasificacion institucional almacenada | Ninguno | Campos textuales | NO APLICA |

## Resultado de cierre

* type-check, lint y build: satisfactorios.
* Suite unitaria completa: 77 archivos, 852 pruebas satisfactorias con `npm test -- --maxWorkers=2`; 22 pruebas nuevas del motor/contrato/ruta. La ejecucion paralela predeterminada tuvo un timeout intermitente en una prueba existente de storage (la misma paso en la primera corrida); la repeticion con dos workers paso completa sin modificar storage.
* Integracion opt-in: cinco pruebas satisfactorias, identidad TEST verificada, fixtures temporales y rollback, consulta real de lectura sobre 543 hidrantes actuales; compatibilidad 120.
* git diff --check: satisfactorio. Revision manual del diff de rutas, SQL, contratos, pruebas y documentacion.
* Sin deployment, migraciones persistentes, cambios en produccion, merge, frontend, PDF o Excel. Rama/commit locales; no se publico PR en esta entrega.
