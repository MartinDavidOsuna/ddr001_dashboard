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
