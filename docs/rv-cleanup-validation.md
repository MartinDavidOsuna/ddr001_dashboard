# Validación — Plataforma 0.2.0 / API 1.1.0

Fecha: 2026-09-15. Estado: implementación y verificación local; sin publicación productiva.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| API: unitarias | 329 pruebas, 49 archivos, correctas |
| API: integración SQL real de limpieza | 3 pruebas correctas con fixtures nuevas y rollback |
| Dashboard: unitarias | 66 pruebas, 20 archivos, correctas |
| API y dashboard: lint, tipos y build | Correctos |
| OpenAPI YAML | Parseo correcto, versión 1.1.0 y rutas nuevas presentes |
| Edge: admin en 1440x1000 y 390x844 | Confirmación visible y usable; sin desbordamiento horizontal |
| Edge: supervisor y viewer | Botón de baja ausente |
| Edge: versión visible | 0.2.0 |
| Conteo real de bajas antes/después del smoke | 0 / 0 |

La integración SQL comprueba permisos actuales en SQL frente a JWT antiguo,
RF rechazadas, versión obsoleta, motivo inválido, repetición sin doble efecto,
auditoría, conservación de registro/foto/historial, exclusión en lista, resumen,
galería y CSV, acceso al archivo y denegación a supervisor. También prueba que
un replay con Idempotency-Key y ruta en mayúsculas no eluda el cambio de rol.

## Método y límites

- Base TEST verificada: DDR001_Hidrantes_TEST. La migración se aplicó y creó las
  estructuras; no marcó revisiones reales.
- Los tests SQL crean cuentas e inspecciones exclusivamente de prueba dentro de
  una transacción y revierten todo. No eliminan archivos ni cambian revisiones reales.
- El navegador usa lecturas reales y una respuesta de baja interceptada: se
  comprueba la interfaz sin ejecutar la baja de la revisión visualizada.
- Evidencia local: `.artifacts/local/rv-cleanup-1440.png`,
  `.artifacts/local/rv-cleanup-390.png` y script `rv-cleanup-smoke.mjs`.
- No se certificó un despliegue productivo ni se ejecutó una baja real del usuario.
- Esta entrega es archivo administrativo; conserva estados, claims y permisos
  anteriores. No retira información de caches móviles ni bloquea sus flujos.
- Persiste el aviso de tamaño del bundle de gráficas que ya existía; no impide
  la compilación ni el flujo de baja.

## Uso

1. Entrar con una cuenta admin activa.
2. Abrir Revisiones y el detalle de la RV.
3. Pulsar Dar de baja revisión, escribir motivo y confirmar.
4. Consultar lo conservado en Revisiones > Archivo de bajas RV.

La baja no es borrado físico ni una limpieza masiva. No hay restauración UI en
esta versión. El rollback de esquema rechaza tablas con bajas registradas.


## HTTP deployment fix and last active revision regression (2026-09-17)

The withdrawal button called crypto.randomUUID before opening its dialog. The public HTTP deployment does not expose that secure-context method. Operation IDs now share the existing Diagnostics fallback based on crypto.getRandomValues, producing UUID v4 and preserving the same command ID across retries. Diagnostics retains its reviewUuid export.

Regression: opening and submitting without crypto.randomUUID passes; reason/confirmation and retry behavior remain covered. Dashboard: 134 tests in 25 files passed; typecheck and lint passed. Production-base build uses /ddr001/ and the existing API address; artifact: .artifacts/withdrawal-production-release.

API SQL TEST regression passed (4 withdrawal integration tests, rolled back). A fresh hydrant with two active RV inspections remains completed after the first withdrawal; after the last it is pending, reviewed=false, inspectionCount=0, latestInspectionId/status/date=null in list and map. Detail/history and filters agree; archived inspections remain accessible. No Field capture or SQL schema change was required. The map can be refreshed with Actualizar if it already has an older loaded snapshot.

No production data was changed for these checks. This fix requires publishing the new dashboard build; API changes for this fix are regression tests/documentation only.
