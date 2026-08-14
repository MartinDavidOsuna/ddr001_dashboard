# Diccionario de datos de DDR001 Dashboard

Fecha de corte: 2026-08-13. Fuentes cotejadas: implementación API y Flutter vigente en los repositorios locales, `docs/openapi.yaml`, DDL consolidado y planes recientes. La API de campo es contrato congelado; el dashboard sólo usa autenticación y lecturas administrativas.

## Criterios

- `nullable` describe la persistencia real, no si la UI debe ocultar el dato.
- `dashboard` indica uso en Fase 1: `sí`, `detalle`, `filtro`, `no` o `Fase 2`.
- Campos territoriales legacy se conservan en base de datos por compatibilidad, pero no se presentan ni filtran.
- La revisión visual vigente es dinámica por `checklist_version_id`; nunca se asume un total fijo de preguntas. El contrato RV actual sí define siete slots fotográficos obligatorios, pero permite N fotografías totales.

## Entidades vigentes

### Admin user

Origen: `rv.admin_users`. ID: `admin_user_id`. Endpoints: `POST /api/v1/admin/auth/login`, `POST /api/v1/admin/auth/refresh`, `POST /api/v1/admin/auth/logout`, `GET /api/v1/admin/auth/me`.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| admin_user_id | UUID | no | Identidad administrativa | DDL/JWT | sesión | no | Nunca se muestra completo |
| full_name | nvarchar(180) | no | Nombre del administrador | DDL | sí | no | `auth/me` actual sólo expone claims; el endpoint dashboard debe completar perfil |
| email | nvarchar(254) | no | Inicio de sesión | DDL/login | login | no | Normalizado en DB |
| role | admin\|supervisor\|viewer | no | Autorización de servidor | DDL/JWT | sí | no | Conceptualmente `viewer` corresponde a READ_ONLY; no crear seguridad sólo cliente |
| is_active | boolean | no | Habilitación de cuenta | DDL/auth | no | no | Se valida en cada access token |
| last_login_at | datetime UTC | sí | Último acceso | DDL/login | no | no | No requerido en Fase 1 |

### Field user / técnico

Origen: `rv.users`. ID: `user_id`. Endpoint administrativo base: `GET /api/v1/admin/users`; en Fase 1 se usa como dimensión y filtro de revisiones.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| user_id | UUID | no | Técnico | DDL | filtro/detalle | no | Actor de inspección |
| full_name | string | no | Nombre real | DDL/Flutter | sí | no | Campo principal visible |
| email | string | no | Identidad de campo | DDL | no | no | No usar para login admin |
| phone | char(10) | no | Identidad de campo | DDL | no | no | Dato sensible, fuera de Fase 1 |
| default_crew_id | UUID | sí | Cuadrilla habitual | DDL | no | no | La cuadrilla de una revisión proviene de su jornada, no de este default |
| is_active | boolean | no | Técnico activo | DDL | filtro auxiliar | no | No cambia el autor histórico |

### Crew / cuadrilla

Origen: `rv.crews`. ID: `crew_id`. Endpoint: `GET /api/v1/admin/crews`.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| crew_id | UUID | no | Identidad de cuadrilla | DDL | filtro/detalle | no | Se resuelve mediante jornada de la revisión |
| name | string | no | Nombre visible | DDL | sí | no | Fuente real de etiqueta |
| is_active | boolean | no | Vigencia | DDL | no | no | Históricos siguen visibles |

### Device

Origen: `rv.devices`. ID: `device_id`. Endpoint administrativo actual sólo cubre bloqueo; lectura completa queda para Fase 2.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| device_id | UUID | no | Instalación física | DDL | detalle | no | Se alcanza por jornada |
| installation_id | UUID | no | ID generado por app | API/Flutter | no | no | No exponer normalmente |
| platform | string | no | Plataforma | DDL | detalle | no | Android actualmente |
| manufacturer/model | string | sí | Fabricante/modelo | DDL/Flutter | detalle | no | Mostrar unidos cuando existan |
| os_version/app_version | string | sí | Versiones capturadas | DDL/Flutter | detalle | no | Útiles para auditoría técnica |
| last_seen_at | datetime UTC | no | Último contacto | DDL | no | no | Fase 2 |
| is_blocked | boolean | no | Bloqueo servidor | DDL/auth | no | no | Escritura fuera de Fase 1 |

### Work session / jornada

Origen: `rv.work_sessions`. ID: `work_session_id`. Endpoint: `GET /api/v1/admin/work-sessions`.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| work_session_id | UUID | no | Jornada usada al crear revisión | DDL | detalle | no | Une técnico, cuadrilla y dispositivo |
| user_id/crew_id/device_id | UUID | no | Participantes | DDL | detalle | no | Relaciones autoritativas de la revisión |
| started_at/ended_at | datetime UTC | no/sí | Ventana temporal | DDL | detalle | no | Fechas se muestran en zona local |
| status | open\|closed\|expired\|revoked | no | Estado de jornada | DDL | no | no | No confundir con estado de revisión |
| start/end latitude/longitude | decimal | sí | Coordenadas de jornada | DDL | no | no | No son GPS de inspección |

### Hydrant / hidrante

Origen: `rv.hydrants`. ID: `hydrant_id`. Endpoints: `GET /api/v1/admin/hydrants` y lecturas dashboard.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| hydrant_id | UUID | no | Identidad interna | DDL | detalle | no | Clave de relación |
| account_number | string | no | Identificación operativa | API/Flutter | sí/búsqueda | no | Etiqueta primaria |
| installation_year | integer | sí | Año de instalación | DDL | resumen | no | Sólo si existe |
| flow_lps | decimal | sí | Gasto nominal L/s | DDL | resumen | no | Mostrar unidad |
| latitude/longitude | decimal | sí | Coordenada maestra | DDL/API | ubicación | no | Diferenciar de captura de inspección |
| source_x/source_y/source_crs | decimal/string | sí | Coordenada de origen | DDL | ubicación técnica | no | No asumir WGS84 |
| is_active | boolean | no | Parte del universo vigente | DDL | KPI | no | Define total de hidrantes |
| source_type | catalog\|manual | no | Origen del registro | DDL/Flutter | resumen | no | Manual sigue siendo válido si activo |
| metadata_json | JSON text | sí | Metadatos de importación | DDL | no | candidato legacy | No convertir claves desconocidas en campos UI |
| locality | string | sí | Columna histórica | DDL | no | **descartado** | Excluir de UI, búsquedas nuevas y filtros |
| municipality | string | sí | Columna histórica | DDL | no | **descartado** | Excluir de UI, búsquedas nuevas y filtros |

### Inspection / revisión

Origen: `rv.inspections` + joins de hidrante/jornada/técnico/cuadrilla/dispositivo. ID: `inspection_id`. Endpoints existentes: `GET /api/v1/admin/inspections`, `GET /api/v1/admin/inspections/:id`; se requiere extensión aislada `/api/v1/admin/dashboard/inspections...` para filtros, agregados y fotos administrativas completas.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| inspection_id | UUID | no | Identidad de revisión | DDL | ruta detalle | no | No confundir con client ID |
| client_inspection_id | UUID | no | Idempotencia móvil | DDL/Flutter | auditoría | no | Oculto por defecto |
| hydrant_id/user_id/work_session_id | UUID | no | Relaciones | DDL | sí | no | Fuente de encabezado |
| checklist_version_id | UUID | no | Definición aplicada | DDL | checklist | no | Debe cargar aun si ya no es activa |
| inspection_type_code | RV\|RF | no | Tipo | DDL | sí | no | Fase 1 enfoca RV |
| revision_number | integer | no | Número por hidrante/tipo | DDL | sí | no | No es versión de checklist |
| status | enum | no | Estado persistido | DDL/API | sí/filtro | no | `draft`, `in_progress`, `pending_sync`, `submitted`, `validated`, `rejected`, `cancelled` en main |
| general_comments | text | sí | Observaciones | DDL/API | resumen | no | Rama reciente agrega versionado; no asumir que está desplegado en `main` |
| started/submitted/validated/cancelled/reviewed_at | datetime UTC | sí | Hitos | DDL | sí | no | `server_updated_at` es actualización general |
| review_comment/rejection_code | string | sí | Revisión admin | DDL | historial/resumen | no | Sólo cuando existe |

### Checklist version, section e item

Orígenes: `rv.checklist_versions`, `rv.checklist_sections`, `rv.checklist_items`. IDs respectivos. Endpoint de campo vigente: `GET /api/v1/checklists/rv/active`; detalle administrativo debe resolver la versión exacta asociada a la inspección.

| Entidad/propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| version: id/code/version_number/title | UUID/string/int/string | no | Definición versionada | DDL/API | checklist | no | No usar siempre la activa |
| version: published_at | datetime | sí | Publicación | DDL | resumen | no | Informativa |
| section: id/code/title/sort_order | mixto | no | Agrupación y orden | DDL/API | checklist | no | Render dinámico |
| item: id/code/label/field_type/sort_order | mixto | no | Pregunta y tipo | DDL/API | checklist | no | Total variable |
| item: is_required | boolean | no | Obligatoriedad base | DDL | checklist | no | Dependencias alteran aplicabilidad |
| item: unit | string | sí | Unidad | DDL | checklist | no | Adjuntar a números |
| item: options_json | JSON array | sí | Valores select/multiselect | DDL/API | checklist | no | La versión actual contiene primitivos; mapear valor a etiqueta si el contrato evoluciona |
| item: dependency_* | mixto | sí | Visibilidad/aplicabilidad | DDL/API | checklist | no | Preservar para explicar N/A |
| item: photo_slot_code | string | sí | Evidencia ligada | DDL/API | fotos | no | Slots son dinámicos por checklist |
| item: help_text | string | sí | Ayuda | DDL/API | checklist | no | Mostrar bajo demanda |

### Inspection answer

Origen: `rv.inspection_answers`. ID: `answer_id`. Se expone en detalle administrativo enriquecido.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| item_id/inspection_id | UUID | no | Relaciones | DDL | checklist | no | Una respuesta por item/inspección |
| value_text | text | sí | Texto/select/date | DDL/API | checklist | no | Usar según `field_type` |
| value_number | decimal | sí | Entero/decimal | DDL/API | checklist | no | Adjuntar unidad |
| value_boolean | boolean | sí | Sí/No | DDL/API | checklist | no | No confundir false con vacío |
| value_json | JSON text | sí | Multiselect/estructura | DDL/API | checklist | no | Parseo tolerante y expandible |
| is_not_applicable | boolean | no | No aplica explícito | DDL/API | checklist | no | Tiene precedencia visual |
| captured_at/updated_at | datetime UTC | no | Captura/cambio | DDL | auditoría | no | Informativos |

### Photo / evidencia

Origen: `rv.photos`; en ramas recientes también `rv.visual_report_version_photos`. ID: `photo_id`. El endpoint de campo está restringido al técnico y no sirve para admin; se requieren miniatura/contenido bajo namespace administrativo.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| photo_id/inspection_id | UUID | no | Identidad/propietario | DDL | galería | no | Validar ambos para evitar IDOR |
| checklist_item_id | UUID | sí | Pregunta asociada | DDL | galería | no | Puede ser nulo en slots generales |
| slot_code | string | no | Código de asociación de evidencia | API/Flutter | galería | no | Siete códigos son obligatorios; otros códigos y duplicados se conservan como adicionales |
| isMandatory/category | boolean/enum derivado | no | Distingue la foto principal de slot obligatorio de una adicional | API dashboard | galería | no | Sólo en extensión administrativa; no cambia contrato Flutter |
| mandatoryPhotosCompleted | int derivado | no | Slots obligatorios con al menos una foto activa | API dashboard | lista/detalle | no | Rango 0–7 |
| mandatoryPhotosRequired | int derivado | no | Total de slots obligatorios vigentes | Contrato | lista/detalle | no | Siempre 7 en este contrato |
| mandatoryPhotosMissing | string[] derivado | no | Códigos obligatorios sin cobertura | API dashboard | detalle | no | Fotos adicionales no cubren faltantes |
| mandatoryPhotosComplete | boolean derivado | no | Los siete slots están cubiertos | API dashboard | lista/detalle | no | Independiente del total N |
| additionalPhotos/totalPhotos | int derivado | no | Fotos adicionales y total activo | API dashboard | lista/detalle | no | Total puede superar siete |
| mime_type/byte_size | string/int | no | Metadatos técnicos | DDL | lightbox | no | No exponer rutas físicas |
| width_px/height_px | int | sí | Dimensiones | DDL | galería/lightbox | no | Disponibles tras procesamiento |
| upload_status | enum | no | Estado | DDL/API | galería | no | Verificada no equivale a archivo presente |
| captured/uploaded/verified/deleted_at | datetime | mixto | Ciclo de vida | DDL | lightbox | no | Omitir eliminadas |
| storage_path/thumbnail_path | string | sí | Ruta privada | DDL | no | secreto interno | Sólo streaming autenticado |
| client/server_sha256 | hash | mixto | Integridad | DDL | auditoría técnica | no | No mostrar completo normalmente |
| metadata_json | JSON text | sí | Metadatos captura | DDL | lightbox | candidato legacy | Mostrar sólo claves conocidas/útiles |

Slots obligatorios confirmados por API y Flutter: `front_closed`, `left_side`, `right_side`, `back`, `top`, `front_open`, `serial_plate`. La primera foto activa de cada código cubre su slot. Cualquier código distinto —por ejemplo `general:<UUID>`— y cualquier foto adicional del mismo código se conserva y se muestra como “Fotografía adicional”, sin límite máximo ni deduplicación destructiva.

### Location sample

Origen: `rv.location_samples`. ID: `location_sample_id`. Detalle administrativo devuelve la muestra más reciente y puede conservar el conjunto para auditoría futura.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| latitude/longitude | decimal | no | Coordenada capturada | DDL/Flutter | ubicación | no | Diferenciar de maestra |
| altitude_m | decimal | sí | Altitud | DDL/Flutter | ubicación | no | Unidad metros |
| horizontal/vertical_accuracy_m | decimal | sí | Precisión | DDL/Flutter | ubicación | no | No colorear sin regla |
| utm_zone/easting/northing | mixto | sí | Coordenada UTM | DDL/Flutter | ubicación técnica | no | Mostrar si existe |
| source | gps\|network\|manual\|rtk | no | Fuente | DDL | ubicación | no | No asumir GPS |
| captured_at/received_at | datetime UTC | no | Captura/recepción | DDL | ubicación | no | Permite detectar retraso |

### Signal sample

Origen: `rv.signal_samples`. ID: `signal_sample_id`.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| network_generation | 2G\|3G\|4G\|5G\|UNKNOWN\|NONE | sí | Generación | DDL/Flutter | señal | no | Mostrar literal |
| network_type/carrier_name | string | sí | Tecnología/operador | DDL/Flutter | señal | no | Datos del SO |
| signal_dbm | integer | sí | Potencia reportada | DDL/Flutter | señal | no | Sin clasificación humana en Fase 1 |
| signal_level | 0..4 | sí | Nivel del SO | DDL | señal | no | No sustituye dBm |
| is_roaming/is_connected | boolean | sí/no | Estado de red | DDL | señal | no | Texto + icono, no sólo color |
| captured_at/received_at | datetime UTC | no | Captura/recepción | DDL | señal | no | Mostrar fecha |
| raw_json | JSON text | sí | Diagnóstico técnico | DDL | expandible | no | Puede contener datos variables |

### Inspection status history

Origen: `rv.inspection_status_history`. ID: `status_history_id`. Endpoint: detalle administrativo.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| previous_status/new_status | enum | sí/no | Transición | DDL | historial | no | Ordenar por `occurred_at` |
| actor_type/actor_id | enum/UUID | no/sí | Autor | DDL | historial | no | Resolver nombre sin N+1 |
| comment | string | sí | Motivo/comentario | DDL | historial | no | Preservar texto |
| occurred_at | datetime UTC | no | Momento | DDL | historial | no | Timeline |

### Audit log

Origen: `rv.audit_log`. ID: `audit_id`. Endpoint: detalle administrativo filtrado por inspección y, cuando aplique, entidades relacionadas.

| Propiedad | Tipo | Nullable | Significado | Fuente | Dashboard | Legacy/descartado | Observaciones |
|---|---|---:|---|---|---|---|---|
| actor_type/actor_id | enum/UUID | no/sí | Actor | DDL/audit repository | auditoría | no | Resolver nombre en servidor |
| action | string | no | Acción técnica | API | auditoría | no | Etiqueta humana + código |
| entity_type/entity_id | string | no | Entidad afectada | DDL | auditoría | no | IDs pueden ser texto |
| before_json/after_json | JSON text | sí | Estado previo/posterior | DDL | expandible | no | Parseo seguro; no mutar |
| request_id/ip_address/user_agent | string | sí | Trazabilidad | DDL | expandible | sensible | Mostrar con prudencia |
| occurred_at | datetime UTC | no | Momento | DDL | auditoría | no | Orden descendente o timeline |

## HYDRANT MASTER RECORD

Origen: `rv.hydrants` con agregados de `rv.inspections`, `rv.users`, `rv.work_sessions`, `rv.crews`, `rv.photos`, `rv.location_samples` y `rv.signal_samples`. Endpoints Fase 2: `GET /api/v1/admin/dashboard/hydrants`, `GET /api/v1/admin/dashboard/hydrants/:id` y `GET /api/v1/admin/dashboard/hydrants/:id/inspections`.

| Clasificación | DB | API dashboard | Flutter | Tipo / nullable | Vigente | Calculada | Mostrable | Editable futuro | Descripción |
|---|---|---|---|---|---|---|---|---|---|
| A Maestra | hydrant_id | hydrantId | hydrantId | UUID / no | sí | no | secundaria | no previsto | Identidad relacional; la cuenta sigue siendo protagonista |
| A Maestra | account_number | accountNumber | accountNumber | string / no | sí | no | sí | controlado | Identificador operativo usado en campo y búsqueda |
| A Maestra | installation_year | installationYear | installationYear | int / sí | sí | no | sí | controlado | Año de instalación si fue importado |
| A Maestra | flow_lps | flowLps | flowLps | decimal / sí | sí | no | sí, L/s | controlado | Gasto/caudal nominal del catálogo |
| A Maestra | section_code | sectionCode | sectionCode | string / sí | sí | no | sí | controlado | Sección de catálogo; no equivale a territorio municipal |
| A Maestra | installation_angle_deg | installationAngleDeg | installationAngleDeg | decimal / sí | sí | no | sí, grados | controlado | Ángulo de instalación importado |
| A Maestra | elevation_m | elevationM | elevationM | decimal / sí | sí | no | sí, m | controlado | Elevación maestra |
| A Maestra | outlet_count | outletCount | outletCount | int / sí | sí | no | sí | controlado | Número de salidas |
| A Maestra | latitude/longitude | latitude/longitude | latitude/longitude | decimal / sí | sí | no | sí/mapa | controlado | Coordenada maestra compatible con mapa cuando ambos valores existen |
| A Maestra | source_x/source_y/source_crs | sourceX/sourceY/sourceCrs | sourceX/sourceY/sourceCrs | mixto / sí | sí | no | técnica | no hasta confirmar CRS | Coordenada de origen; el CRS histórico permanece no confirmado |
| A Maestra | source_type | sourceType | source | enum / no | sí | no | sí | no | Catálogo o alta manual vigente |
| A Maestra | is_active | isActive | isActive | boolean / no | sí | no | implícita | futuro | Sólo activos forman el universo de Fase 2 |
| A Maestra | created_at/updated_at | createdAt/updatedAt | updatedAt | datetime / no | sí | no | secundaria | no | Trazabilidad del catálogo |
| B Derivada | inspecciones RV | inspectionCount | latestInspection* | int / no | sí | sí | sí | no | Total histórico del hidrante |
| B Derivada | estados RV | rvStatus | rvStatus | pending/completed / no | sí | sí | sí | no | Completed si alguna RV está submitted o validated |
| B Derivada | estados RV | reviewed | — | boolean / no | sí | sí | filtro/KPI | no | Alguna RV recibida: submitted, validated o rejected |
| B Derivada | última RV | latestInspection* | latestInspection* | mixto / sí | sí | sí | sí | no | Revisión más reciente por fecha efectiva y número |
| B Derivada | usuarios/jornadas | latestTechnicianName/latestCrewName | reviewedBy* | string / sí | sí | sí | sí | no | Técnico y cuadrilla históricos de la última revisión |
| B Derivada | fotos | mandatoryPhotosCompleted/Required/Complete | requiredPhotosVerified | int/bool / sí | sí | sí | sí | no | Cobertura de siete slots obligatorios; no total de fotos |
| B Derivada | fotos | additionalPhotos/totalPhotos | — | int / sí | sí | sí | sí | no | Adicionales y N total de última revisión |
| B Derivada | revisiones | submitted/validated/rejected/cancelledCount | — | int / no | sí | sí | estadísticas | no | Conteos objetivos por estado |
| B Derivada | revisiones | completeEvidenceCount | — | int / no | sí | sí | estadísticas | no | Revisiones históricas con 7/7 |
| C Captura | location_samples | hasGps + detalle revisión | captura local RV | boolean/detalle | sí | sí | resumen/enlace | no | GPS pertenece a una revisión, no reemplaza la coordenada maestra |
| C Captura | signal_samples | hasSignal + detalle revisión | captura local RV | boolean/detalle | sí | sí | resumen/enlace | no | Señal pertenece a una revisión |
| D Metadata | metadata_json | metadataJson | metadata | JSON text / sí | condicional | no | pares escalares + JSON técnico | no automático | Claves desconocidas no se convierten en propiedades oficiales |
| D Metadata | source_import_id | no expuesto | no | UUID / sí | técnico | no | no | no | Relación de importación, no dato operativo principal |
| D Metadata | created_by_user_id/created_in_crew_id/local_reference/source_environment/manual_reason | no expuestos | varios internos | mixto / sí | sólo alta manual | no | no en Fase 2 | futuro controlado | Trazabilidad de altas manuales; no se usa para búsqueda global |
| E Legacy | locality | — | locality | string / sí | no plataforma | no | **no** | no | Descartado explícitamente |
| E Legacy | municipality | — | municipality | string / sí | no plataforma | no | **no** | no | Descartado explícitamente |
| E Legacy | normalized_account/row_version | — | — | técnico / no | interno | sí DB | no | no | Implementación de unicidad/concurrencia |

La lista y el expediente no exponen `locality` ni `municipality`, aunque Flutter todavía pueda deserializarlos por compatibilidad histórica. La búsqueda administrativa nueva se limita a `account_number`; no recorre JSON ni campos territoriales.

## Campos descartados / legacy

| Campo/concepto | Decisión | Evidencia | Tratamiento |
|---|---|---|---|
| municipio / `municipality` | **Descartado para esta plataforma** | Decisión funcional explícita; sólo persiste como columna y en Figma histórico | No mostrar, buscar, filtrar ni agregar a nuevos contratos dashboard |
| localidad / `locality` | **Descartado para esta plataforma** | Decisión funcional explícita; sólo persiste como columna y en Figma histórico | No mostrar, buscar, filtrar ni agregar a nuevos contratos dashboard |
| “tipo de hidrante” mostrado por Figma | No confirmado | No existe propiedad canónica equivalente en `rv.hydrants` base | Eliminar hasta contrato vigente |
| “anomalías detectadas” de Figma | No confirmado | No hay regla vigente que derive anomalías de respuestas RV | No inferir ni inventar; mostrar observaciones/rechazo reales |
| checklist fijo 77/77 | Legacy ilustrativo | Definición versionada y extensiones recientes cambian el total | Calcular respondidas/aplicables/total desde versión exacta |
| exactamente siete fotos totales | **Descartado** | El flujo exige siete slots, pero permite N fotos relacionadas | Mostrar 0–7/7 obligatorias y N total por separado |
| calidad humana de señal | No definida | Sólo existen generación, nivel y dBm | No usar “Buena/Mala” sin métrica documentada |
| coordenadas de jornada como GPS RV | Semántica incorrecta | `work_sessions` y `location_samples` son entidades distintas | Usar exclusivamente muestra de inspección para GPS RV |

## Contradicciones de corte

1. `origin/main` de API avanzó durante la auditoría a `64e51b5` e incluye DDL de fotos condicionales de medidor/venturi, pero `photo.routes.ts` confirma los siete slots obligatorios vigentes. Las fotos adicionales se conservan aparte y no alteran el divisor 7.
2. La línea acumulativa `fix/field-session-start-500` contiene sesiones permanentes, estados globales, reportes inmutables y fotos generales, pero no está integrada a `main`. Flutter local está en una rama equivalente reciente. Es una fuente de evolución, no se presupone desplegada por el dashboard basado en `main`.
3. El endpoint administrativo existente usa `rv.vw_inspection_summary`, que aún arrastra municipio/localidad, y el detalle omite tipos/opciones/orden completo del checklist y rutas de foto admin. Por eso Fase 1 necesita una extensión de lectura aislada.
