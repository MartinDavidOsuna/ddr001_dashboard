# Construction Dashboard UI — contrato de diseño

## Alcance

Esta fase agrega la representación administrativa de **DDR001 Levantamientos / Nuevos Hidrantes** exclusivamente en frontend. Los datos visibles provienen de fixtures tipados en `src/features/construction/`; no existe integración HTTP Construction en esta rama.

- API modificada: **NO**.
- App móvil modificada: **NO**.
- Producción modificada: **NO**.
- Modo de datos: `UI_PREVIEW_MOCK`.
- Etiqueta visual del dato interno `crew`: **Empresa**, sólo dentro del dominio Construction.
- Revisión Visual (RV) y Construction permanecen separados en navegación, métricas y semántica.

## Fuente de verdad funcional revisada

El diseño se reconcilió con el `main` vigente de `ddr001_levantamientos` y el `main` vigente de `ddr001_api` antes de implementar.

### Estados

| Valor contractual | Etiqueta UI |
| --- | --- |
| `created` | Creado |
| `in_progress` | En proceso |
| `executed` | Ejecutado |
| `rejected` | Rechazado |
| `accepted` | Entregable |
| `delivered` | Entregado |

Transiciones vigentes observadas: `created → in_progress → executed`; desde `executed` puede ocurrir `rejected` o `accepted`; `rejected → executed`; `accepted → delivered`.

### Etapas

0. Creación
1. Preparación del terreno
2. Cimbrado
3. Armado
4. Colado
5. Descimbrado
6. Terminado

Las etapas 1–5 requieren entre 1 y 4 fotos. Terminado requiere al menos 4 fotos y no tiene máximo funcional. Los propósitos de Terminado son `north`, `east`, `south`, `west` y `additional`, presentados como NORTE, ESTE, SUR, OESTE y ADICIONAL.

### Ubicación

El frontend contempla latitud, longitud, accuracy y altitude opcional. La API vigente limita el accuracy aceptable a 100 m. El expediente reutiliza `InspectionMap.vue`, ya basado en OpenStreetMap; no se modifica el mapa global RV.

### Roles

Hay dos dominios de rol que no deben confundirse:

1. **Field Construction**: `contractor` y `resident` en `construction.app_users`.
2. **Administrativo**: la API vigente proyecta `supervisor` de plataforma a Construction `admin`, y `admin` de plataforma a Construction `superadmin`; `viewer` no obtiene capability reviewer.

La UI preliminar muestra Sin acceso / Contratista / Residente / Administrador para validar la experiencia futura. Superadministrador se documenta como rol administrativo derivado y no como opción normal de asignación. Ningún cambio se persiste en esta fase.

## Datos requeridos por widget

| Widget | Dato requerido | Tipo / agregación | Origen futuro esperado | UI | API |
| --- | --- | --- | --- | --- | --- |
| Total de levantamientos | surveys | `COUNT(base_surveys)` | Construction administrativo | Implementada | Pendiente para dashboard admin |
| En proceso | status | `created + in_progress` | Construction administrativo | Implementada | Pendiente |
| Ejecutados | status | `COUNT(status=executed)` | Construction administrativo | Implementada | Pendiente |
| Rechazados | status | `COUNT(status=rejected)` | Construction administrativo | Implementada | Pendiente |
| Entregables | status | `COUNT(status=accepted)` | Construction administrativo | Implementada | Pendiente |
| Entregados | status | `COUNT(status=delivered)` | Construction administrativo | Implementada | Pendiente |
| Avance general | status | `(executed + accepted + delivered) / total` | Agregado servidor o cliente sobre resumen | Implementada | Pendiente |
| Distribución por estado | status | conteo por estado | Métricas Construction | Implementada | Pendiente |
| Bases por etapa | currentStep | conteo por etapa 1–6 | Métricas Construction | Implementada | Pendiente |
| Actividad temporal | createdAt / executedAt | series por día/semana | Métricas Construction | Implementada | Pendiente |
| Productividad contratista | contractor | total / terminados | Métricas Construction | Implementada | Pendiente |
| Avance por Empresa | crew / company | total / en proceso / terminados | Métricas Construction | Implementada | Pendiente |
| Tasa de rechazo | status + correcciones | rechazados / ejecutados revisados | Métricas Construction | Implementada | Pendiente |
| Tiempo de ciclo | createdAt / executedAt / acceptedAt | promedio; mediana opcional | Métricas Construction | Implementada | Pendiente |
| Evidencias | photos + integrity | conteo y metadata | Evidencia Construction | Implementada | Pendiente para admin |
| Listado | identidad, status, stage, contractor, crew, fechas, fotos, location, sync | paginado + filtros | Listado administrativo Construction | Implementada | Pendiente |
| Expediente | survey + steps + photos + corrections + history | detalle completo | Detalle Construction | Implementada | Pendiente para admin |
| Ubicación | canonical location | punto + accuracy | Detalle/mapa Construction | Implementada | Pendiente para admin |
| Rol Levantamientos | user + Construction access | rol/capability + Empresa | Administración de acceso | Implementada como preview | Persistencia pendiente |
| Historial de acceso | actor, cambio, fecha | audit trail | Auditoría administrativa | Placeholder | Pendiente |

## Necesidades de integración futura — sin rutas nuevas definidas

Esta matriz expresa **necesidades**, no endpoints propuestos.

| Necesidad | Datos requeridos | Contrato existente que podría reutilizarse | Gap administrativo |
| --- | --- | --- | --- |
| Resumen Construction | conteos por status, fotos, avance, pendientes | El dominio móvil ya define status y entidades | Falta contrato agregado autenticado para dashboard |
| Listado paginado | surveyId, displayIdentifier, accountNumber, status, currentStep, contractor, crew/Empresa, fechas, location/sync | El móvil ya dispone de listados propios y reviewer | Evaluar auth admin, filtros, paginación, rendimiento y exposición antes de reutilizar |
| Detalle | survey, steps, photos, corrections, history, canonical location, conflictos | El móvil ya dispone de detalle reviewer | Validar forma estable para plataforma y campos de auditoría |
| Evidencia | metadata, purpose, GPS, integrity, contenido protegido | Existe lectura de contenido fotográfico Construction | Definir autorización de dashboard y estrategia de thumbnails/galería |
| Mapa | surveyId, identifier, status, currentStep, coordenada canónica | Existe contrato móvil de mapa para owner | Falta semántica administrativa/global y paginación/capas si aplica |
| Métricas | series por status, stage, tiempo, contractor, crew | No se debe inferir con llamadas N+1 desde dashboard | Requiere agregaciones eficientes para administración |
| Asignación de roles | usuario objetivo, rol permitido, Empresa/capability | Existen roles Field y proyección reviewer admin | Requiere operación autorizada, validación server-side, auditoría y política de sesiones activas |
| Historial de roles | before/after, actor, timestamp, reason | Infraestructura general de auditoría existe | Definir evento/consulta administrativa Construction sin inventarla en frontend |

## Seguridad de futura asignación de roles

El frontend no puede decidir la autorización real. La integración backend deberá validar como mínimo:

- identidad y rol/capability del actor administrativo;
- usuario objetivo;
- transición de rol permitida;
- separación entre rol Field y proyección administrativa;
- auditoría before/after y actor;
- compatibilidad con sesiones activas y revocación/refresh cuando sea necesario;
- ownership e IDOR para cualquier recurso Construction.

Hasta que exista ese contrato, `ConstructionUserAccessCard.vue` mantiene el botón Guardar deshabilitado y muestra `AUTHORIZATION_API_PENDING`.

## Modos de datos

Los componentes consumen `ConstructionDataSource` desde `construction.datasource.ts`. El modo predeterminado `UI_PREVIEW_MOCK` conserva fixtures, filtrado y métricas locales. `VITE_CONSTRUCTION_DATA_MODE=api` selecciona `ConstructionApiDataSource`, delega paginación y filtros al servidor, consume `summary`/`metrics`, detalle, acceso, historial y contenido fotográfico administrativo. Un error HTTP en modo API se presenta al usuario y nunca activa fixtures como fallback.

El mapper mantiene los tipos de UI y traduce `crewId/crewName → companyName`, sin renombrar contratos backend ni el concepto histórico de Cuadrilla en RV. Los thumbnails y originales usan handlers administrativos protegidos; una ausencia real se muestra como contenido no disponible.

## Criterio de terminado

Para la métrica visual **Avance general**, esta fase considera construcción terminada cuando el status es `executed`, `accepted` o `delivered`. `rejected` queda excluido porque requiere una nueva ejecución tras corrección. Esta definición deberá confirmarse como métrica oficial antes de conectarla a producción.
