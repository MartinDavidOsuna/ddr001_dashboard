# Versionado de la plataforma DDR001

Vigente desde 2026-09-15 para el seguimiento de entregas. No declara una nueva
versión desplegada ni cambia permisos por sí mismo.

## Línea base

| Elemento | Versión existente | Referencia |
| --- | --- | --- |
| Plataforma web / dashboard | 0.1.0 | main, 53c3f06 |
| API | 1.0.0 | main, 66f7673 |
| Contrato HTTP | /api/v1 | Namespace; no es la versión del artefacto |

La línea base registra lo existente; no implica que todos esos commits estén
desplegados en cada ambiente. Los ajustes locales y el esquema efectivo se
registran por separado. El tag histórico API `api-rv-v0.1.0-tested` no se renombra
ni se interpreta como versión del paquete actual.

## Numeración

Usar `MAJOR.MINOR.PATCH`:

- PATCH: corrección compatible de una entrega.
- MINOR: funcionalidad nueva. Durante 0.x, puede introducir cambios de política
  si quedan descritos explícitamente como incompatibles en las notas de versión.
- MAJOR: cambio incompatible de una interfaz pública o política contractual
  de un componente estable. La primera plataforma estable se publicará como
  1.0.0 solo después de certificar su alcance.
- Pruebas previas: `0.2.0-rc.1`, `0.2.0-rc.2`, etc.; no reutilizar artefactos
  diferentes bajo el mismo identificador final.

La entrega de **baja lógica RV por admin** es plataforma **0.2.0** y API **1.1.0**.
Se conservan los permisos de admin/supervisor y el namespace `/api/v1`.
Superadmin y editor completo se posponen por decisión del solicitante. Esto
sustituye la propuesta anterior API 2.0.0 que retiraba permisos existentes.

Los package.json y lockfiles reflejan la implementación local. Las versiones
no están publicadas ni etiquetadas; el changelog diferencia implementación,
validación y despliegue. Esquema requerido: `20260915_rv_dashboard_withdrawals.sql`.

## Registro obligatorio por entrega

Plataforma **0.3.0** añade Diagnósticos. Su dependencia contractual es el SHA API
`e571b8bdf84a709a0d4ce40bf2a5f842e44199bd`, no una versión npm inferida.
Está implementada en rama API no integrada; la API local 1.1.2 aún no expone el
namespace. No se ejecutaron migraciones ni se desplegó el API durante esta entrega.
Auditoría: [Diagnósticos](docs/functional-diagnostics-audit.md).

Cada release tendrá una ficha con:

- Versión de plataforma, dashboard, API y compatibilidad con aplicaciones móviles.
- Commit completo de cada repositorio y estado de cambios locales.
- Identificadores/checksums de migraciones requeridas y aplicadas por ambiente.
- Ambiente, fecha UTC, artefacto y checksum, operador y resultado de smoke.
- Cambios, correcciones, incompatibilidades, limitaciones y plan de recuperación.
- Pruebas ejecutadas y enlace a evidencia, sin tokens, contraseñas ni datos privados.

Usar tags inmutables `platform-vX.Y.Z` en dashboard y `api-vX.Y.Z` en API después
de los controles de release. No mover tags ni etiquetar un árbol con trabajo
no incluido. El estado «desplegado» se registra tras verificar el servicio real,
no al crear el tag.

## Visibilidad en la aplicación

En 0.2.0 la barra lateral muestra la versión de plataforma tomada del paquete.
La API expone la versión real del paquete en `/api/v1/version`. Una sección
Acerca de con SHA y ambiente queda para una entrega posterior.
`GIT_COMMIT` y `BUILD_DATE` serán obligatorios en artefactos de release; `unknown`
no pasa el control de publicación. El esquema se identifica mediante un registro
de migraciones; no inferirlo de la versión npm ni del nombre de la base.

Una versión de revisión RV (v1, v2...) es historial de un documento y se presenta
separada de la versión del software. Un cambio de plataforma nunca renumera
revisiones, checklists ni migraciones históricas.

## Changelog y estado inicial

[CHANGELOG.md](CHANGELOG.md) centraliza las entregas de plataforma y enlaza el
plan. No hay tag nuevo, publicación ni cambio funcional por esta incorporación
documental. La siguiente implementación debe mantener este registro actualizado.

## Trazabilidad de esta entrega

La pagina `/acerca-de` identifica commit y fecha de compilacion del Dashboard y consulta `/api/v1/version` para API. Builds con cambios locales se marcan `-dirty`; no constituyen un release publicado. El API genera `dist/build-info.json` y permite exigir arbol limpio con `RELEASE_BUILD=true`. La version de paquete se mantiene hasta preparar el release.
