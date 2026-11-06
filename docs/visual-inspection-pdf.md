# Expediente PDF de revisión visual

`scripts/generar-expediente-visual.py` genera un expediente de dos páginas carta con siete evidencias obligatorias, mapa OSM estático, datos técnicos y checklist de condiciones desfavorables. Utiliza los logos actuales de Aquafim, Netafim y Conagua. La fecha de revisión se muestra en GMT-6 Aguascalientes.

Requiere Python 3.12, fuentes Arial de Windows y las dependencias `reportlab`, `pillow` y `pymupdf`:

```powershell
python -m pip install reportlab pillow pymupdf
```

## Consulta de solo lectura

```powershell
python scripts/generar-expediente-visual.py --token-file temp_token.md --inspection-id <UUID>
```

Alternativamente, definir `DDR001_ACCESS_TOKEN` en el proceso y omitir `--token-file`. No colocar el token literal en argumentos ni documentación. El archivo `temp_token.md` está ignorado por Git.

El script utiliza únicamente GET contra `http://187.141.184.162:3002/api/v1`, descarga fotografías desde las rutas protegidas de la revisión y solicita mosaicos OSM sin la credencial de la API. Si el access token expira, se detiene sin renovar la sesión. Sin identificador busca un candidato entre los primeros 25 resultados.

## Regeneración sin API

```powershell
python scripts/generar-expediente-visual.py --snapshot reportes/<expediente>/datos_revision.json
```

Este modo utiliza los datos, fotografías, mosaico y manifest locales. No consulta producción ni lee credenciales. Los logos se copian de los recursos actuales del repositorio.

## Salidas y límites

Cada ejecución crea una carpeta nueva en `reportes/` con PDF, HTML editable, datos, recursos, manifest y vistas de comprobación. `reportes/` y `resultados codex/` están ignorados. El modo individual conserva auxiliares; no implementa la limpieza del lote ni el nombrado numérico de entregables usados en la entrega manual de diez expedientes.

Los siete slots son `front_closed`, `left_side`, `right_side`, `back`, `top`, `front_open` y `serial_plate`. Las fotos adicionales se contabilizan, pero no se descargan. Las diferencias entre `byteSize` y los bytes servidos quedan registradas en el manifest.

La selección de hallazgos sigue los códigos actuales del checklist. Una revisión con demasiados hallazgos para la maquetación detiene la generación; no se truncan respuestas. Los PDFs se reabren y renderizan automáticamente, pero las vistas deben inspeccionarse para comprobar la legibilidad final.
