# Levantamientos: integración de datos del servidor

Implementación local: 22 de septiembre de 2026. No desplegada.

## Comportamiento

- API es el modo predeterminado; solo `VITE_CONSTRUCTION_DATA_MODE=mock` activa demostración. `.env.example` explicita `api`; Vitest selecciona fixtures de forma independiente.
- Listado paginado: conserva `photoCount`, distingue sincronización no informada y descarta respuestas anteriores al último cambio de filtros.
- Fechas: días de la zona local del navegador, inicio inclusivo y comienzo del día siguiente exclusivo, conforme al filtro SQL `createdAt < @to`.
- Indicadores globales, independientes de los filtros del listado. Los fallos de indicadores tienen estado y reintento propios; no se muestran agregados de una página como totales globales.
- Tasa de rechazo: rechazados actuales / revisados, conforme a la API. Un promedio sin observaciones aparece sin valor. Las precisiones GPS ausentes permanecen nulas.
- Expedientes: error recuperable separado de 404 y carga; textos acordes con la fuente; actor `system` preservado.
- Evidencia protegida: visor modal, errores y reintentos para originales, liberación de URLs de objetos al cerrar o desmontar.
- Directorio: empresa y rol consultados mediante el endpoint de acceso existente, con máximo cuatro solicitudes concurrentes. Una consulta fallida muestra “No disponible”.
- Ficha de acceso: no inicializa datos simulados en modo API; solo permite asignar contratista, residente o sin acceso. Distingue escritura exitosa de fallo posterior de recarga.

## Inspección de la instalación local

Consultas SQL exclusivamente de lectura usando la configuración del repositorio vecino `ddr001_api_rv`:

| Resultado | Valor |
|---|---:|
| Base configurada | DDR001_Hidrantes_TEST |
| Levantamientos | 218 |
| Creados | 127 |
| En proceso | 63 |
| Ejecutados | 2 |
| Aceptados | 2 |
| Entregados | 24 |
| Con coordenadas | 21 |
| Fotos con metadata verified/confirmed | 422 |
| Columna access_enabled | Presente |
| Archivos originales encontrados en muestra de 20 | 0 |
| Miniaturas encontradas en la misma muestra | 0 |

El chequeo de archivos utiliza `STORAGE_ROOT` del `.env` local, resuelto respecto al repositorio de la API. No prueba otros servidores ni ubicaciones alternativas; no demuestra que las fotografías originales estén perdidas. Tampoco certifica que estos registros TEST sean capturas productivas.

`GET http://127.0.0.1:3000/api/v1/health/live` respondió correctamente. El endpoint administrativo de resumen respondió 401 sin token, como corresponde. No se realizó login ni prueba E2E autenticada contra esta instalación.

## Validación y puesta en servicio

Validación realizada: `npm test` pasó 147 pruebas en 28 archivos; `npm run lint`, `npm run build` y `git diff --check` correctos. Las pruebas agregadas cubren conteos del servidor, agregados SQL nulos, errores y reintentos, respuestas fuera de orden, fechas, roles reales y recursos del visor de evidencia. Las pruebas de componentes usan respuestas controladas, no certifican producción. Se mantienen advertencias no bloqueantes del tamaño del bundle ECharts y del evento `grouping` en una prueba del mapa.

Antes de publicar:

1. Identificar el destino productivo y comprobar contratos, permisos y registros con una sesión administrativa válida.
2. Verificar que `STORAGE_ROOT` de ese proceso resuelva las rutas persistidas y que originales/miniaturas estén disponibles. Corregir la configuración o restaurar evidencia desde su fuente; no inventar archivos ni marcar cargas como verificadas.
3. Compilar con `VITE_CONSTRUCTION_DATA_MODE=api`, la URL real de API y la base de publicación correspondiente. El `dist` generado durante esta implementación usa la configuración local `/api/v1`.
4. Validar listado, indicadores, filtros, expediente, evidencia, mapa y permisos en el navegador con datos del destino. El harness `e2e:construction-api` está reservado a SQL TEST y modifica/restaura roles; no ejecutarlo indiscriminadamente en producción.

No se aplicaron migraciones ni cambios de datos, usuarios, permisos o almacenamiento en el servidor.
