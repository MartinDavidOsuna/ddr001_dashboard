# Candidata acumulativa DDR001 - 2026-09-17

Estado: cambios locales guardados; candidata local preparada para integrar a main. No publicada ni desplegada. **Branding productivo adicional pendiente de identificar y contrastar.**

## Repositorios y puntos de recuperacion

| Repositorio | Main auditado | Snapshot local completo | Rama original guardada | Candidata |
|---|---|---|---|---|
| Dashboard | 53c3f06 | d0ee5ac | feature/global-multidomain-map | integration/production-cumulative-20260917 |
| API (carpeta ddr001_api_rv) | 66f7673 | 0ae302d | feature/global-map-api | integration/production-cumulative-20260917 |

Los snapshots conservan TODOS los cambios rastreados y archivos fuente nuevos que estaban pendientes. Se excluyen por .gitignore los secretos .env, node_modules, dist y artefactos de pruebas. No se borraron cambios ni se clonaron/copiaron proyectos. Las ramas main local/remota no se modificaron. No hay push.

## Cobertura acumulativa de ramas

Inventarios exhaustivos: `20260917-branch-inventory.json` en cada repositorio (refs y SHA al auditar).

- Dashboard: 9 refs, todas antecesoras de la candidata. Incluye las fases RV, hidrantes, Construction, limpieza RV, Diagnosticos y Mapa. No hay otra rama Git con branding adicional.
- API: 50 refs; 32 antecesoras, 18 no ancestrales. No confundir commits con SHA distinto con funcionalidades faltantes.
- `origin/feature/functional-diagnostics-api`: dominio, migracion, contrato y pruebas dedicadas identicos en el snapshot guardado; rutas integradas junto con bajas RV y Mapa. El commit local acumula los cuatro commits funcionales sin perder las mejoras posteriores.
- `origin/feature/dashboard-fase-2-api` y `origin/rescue/production-api-2630621`: patches equivalentes ya en main (`git cherry` negativo).
- `origin/feature/fase-3-dashboard-api`: exportaciones equivalentes; read model de usuarios `1038493` reintegrado como `78af54b`, mismos archivos de implementacion/pruebas y mejoras posteriores de bajas RV.
- Cadena RV antigua (permanent-field-session, exclusivity, immutable versioning, report viewer, pressure ranges, illegible brand, filter undefined, pilot, general photos, hardening, SQL tests, deploy, login fix, plan): recuperada semanticamente en main por la reconciliacion documentada en `plans/rv-main-reconciliation-and-map-sync.md` del API. `c90afb6` contiene la correccion UUID de requestId de `a1a4f6a`. Se conserva el takeover actual.
- Exclusiones deliberadas de la cadena antigua: migracion/rollback/test del modelo de sesiones permanente reemplazado; dump de referencia de hidrantes de julio; planes historicos superados. NO reintroducirlos como requisitos productivos. Sus commits siguen accesibles en sus ramas.

La simulacion read-only con `git merge-tree` muestra conflictos al mezclar ramas obsoletas y retrocesos de contrato. No se hizo un merge indiscriminado ni se marco esa historia como integrada mediante `-s ours`. El objetivo es preservar la implementacion acumulada vigente, no reaplicar bugs antiguos.

## Branding: condicion previa al merge/publicacion

`20260917-branding-inventory.json` registra hashes: favicon, CSS global, login e index son identicos a origin/main. AppLayout conserva marca DDR001, CNA/DR001; incorpora navegacion/version nuevas.

El usuario informa branding adicional EN PRODUCCION. No esta en las ramas obtenidas y todavia no se conoce URL/carpeta/fuente. **No declarar preservado ese branding ni publicar esta candidata hasta recuperarlo.**

1. Identificar URL y fuente/commit o carpeta de la version desplegada; registrar SHA, artefacto de rollback y hashes de logos/favicon, colores, textos y tipografias. No copiar secretos.
2. Incorporar cambios de marca sobre la candidata (assets + bloques visuales concretos). No reemplazar AppLayout entero: se perderian Diagnosticos, Mapa y menus nuevos. No copiar bundles minificados antiguos sobre el build nuevo.
3. Comparar login, sidebar expandido/contraido y cabecera a 1440/768/390. Registrar evidencia y actualizar productionBrandingVerified del inventario solamente despues de la verificacion real.
4. Conservar configuracion y archivos IIS propios del sitio; no sincronizar directorios productivos con borrado de archivos ni sustituir .env/configuracion productiva por TEST.

## Comportamiento actual preservado del Mapa

Carga compacta una vez por vista/filtros; Actualizar manual; sin requests al hacer zoom/pan. Radio 0.2734375 px; iconos 15.1111 px. Solo agrupa en el zoom inicial de ajuste del conjunto o menor; al acercar presenta registros individuales, tambien hidrantes proximos. Leyenda contextual de color/estado/cantidad. GPS real, simulaciones excluidas por defecto y acceso a expedientes conservados.

Se actualizaron pruebas/harness que aun esperaban tamanos y reglas anteriores, sin cambiar el comportamiento de la aplicacion. CI incluye Mapa y usa Chromium en Linux/Edge en Windows.

## Preparacion de main (comandos para la fase posterior, NO ejecutados)

En cada clone existente, con arbol limpio y branding resuelto:

```powershell
git fetch --all --prune
git merge-base --is-ancestor origin/main integration/production-cumulative-20260917
git diff --stat origin/main...integration/production-cumulative-20260917
git switch main
git merge --ff-only origin/main
git merge --no-ff integration/production-cumulative-20260917
```

Si origin/main avanza o deja de ser ancestro, reconciliar en la candidata y repetir validacion; no forzar ni resetear. Los comandos no hacen push ni despliegue automaticamente. Preferir PR revisable si la politica de main lo requiere.

## Orden productivo

1. Resolver branding, registrar artefactos/SHA de rollback y preflight SQL read-only del API.
2. Verificar esquemas Functional Diagnostics y vista `rv.dashboard_inspections`. El mapa no requiere migracion propia, pero los cambios acumulados de Diagnosticos/bajas SI tienen prerrequisitos SQL. Aplicar solo migraciones faltantes en una fase de despliegue independiente; no ejecutar rollbacks productivos.
3. Publicar API antes del frontend: nuevos endpoints Mapa y Diagnosticos administrativos necesarios. Preservar secretos, storage, credenciales Runtime/Migrator y conexiones productivas.
4. Build frontend con VITE_API_BASE_URL productivo confirmado. Nunca publicar dist generado con .env.local de TEST por accidente.
5. Publicar frontend con branding incorporado; smoke de login, modulos existentes, Mapa, Diagnosticos, fotos y roles. Vigilar 401/403/404/500. Ante regresion, restaurar artefacto previo; no borrar tablas/evidencias.

## Validacion

Resultados exactos se registran al final del presente documento. Esta preparacion no certifica el branding no identificado ni el esquema real de produccion. No se ejecutaron migraciones ni escrituras productivas.

### Resultado de preparacion

- Dashboard typecheck/lint/build/diff-check: correctos; 133 pruebas / 25 archivos.
- E2E: 5/5, admin 1440/768/390, viewer/supervisor 1440; 28/27/27/26/27 requests del recorrido. Sin requests por zoom, y todos los hidrantes individuales sobre el zoom inicial. Sin errores JS/overflow.
- API type-check/lint/build: correctos; integracion normal 17 aprobados y 43 omitidos por configuracion (SQL y escenarios externos no habilitados).
- No se repitieron suites SQL ni pruebas productivas; el preflight adjunto solo se preparo.
- Advertencia preexistente: chunk ECharts mayor de 500 kB. No bloquea build.
- Pendiente real: recuperar/contrastar branding adicional desplegado. Por ello no se certifica aun la publicacion productiva ni se ejecuta merge a main.

API unitarios confirmados por reporte JSON: 363 aprobados, 0 fallidos. Type-check/lint/build correctos; integracion normal 17 aprobados, 43 omitidos por configuracion.
