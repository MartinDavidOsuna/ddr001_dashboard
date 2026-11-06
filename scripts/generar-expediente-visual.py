"""Expediente de producción: solo GET. No registra ni persiste credenciales.
Uso: python scripts/generar-expediente-visual.py --token-file temp_token.md
Dependencias: reportlab pillow pymupdf. Variable alternativa: DDR001_ACCESS_TOKEN.
"""
import argparse
import base64
import datetime as dt
import hashlib
import html
import io
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.request
import urllib.error
from zoneinfo import ZoneInfo

BASE = 'http://187.141.184.162:3002/api/v1'
SLOTS = [('front_closed', 'Frente cerrado'), ('left_side', 'Lado izquierdo'),
         ('right_side', 'Lado derecho'), ('back', 'Parte posterior'),
         ('top', 'Parte superior'), ('front_open', 'Frente abierto'),
         ('serial_plate', 'Placa o número de serie')]
ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--token-file', type=Path)
    ap.add_argument('--inspection-id')
    ap.add_argument('--snapshot', type=Path, help='Regenera desde datos_revision.json y recursos locales, sin API ni token')
    args = ap.parse_args()
    if args.snapshot:
        import shutil
        source = args.snapshot.resolve().parent
        d = json.loads(args.snapshot.read_text(encoding='utf-8'))
        manifest = json.loads((source / 'manifest_validacion.json').read_text(encoding='utf-8'))
        stamp = dt.datetime.now().strftime('%Y%m%d_%H%M%S')
        out = ROOT / 'reportes' / f'expediente_hidrante_{d["accountNumber"]}_ajustado_{stamp}'
        out.mkdir(parents=True, exist_ok=False)
        shutil.copytree(source / 'recursos', out / 'recursos')
        shutil.copy2(args.snapshot, out / 'datos_revision.json')
        render_document(d, out, manifest['requests'], manifest['evidence'], manifest['mapTiles'])
        result_path = out / 'manifest_validacion.json'
        result = json.loads(result_path.read_text(encoding='utf-8'))
        result['generatedAtUtc'] = result['capturedAtUtc']
        result['capturedAtUtc'] = manifest['capturedAtUtc']
        result['acquisitionMode'] = 'snapshot_local'
        result['apiRequestsThisRun'] = 0
        result['snapshotSource'] = str(args.snapshot.resolve())
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        return
    secret = os.environ.get('DDR001_ACCESS_TOKEN') or (args.token_file.read_text(encoding='utf-8-sig') if args.token_file else '')
    tokens = re.findall(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', secret)
    valid = []
    for token in tokens:
        claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '==='))
        # A Markdown credential file may contain both access and refresh JWTs.
        kind = str(claims.get('type', claims.get('tokenType', claims.get('token_use', '')))).lower()
        if 'refresh' not in kind:
            valid.append((claims.get('exp', 0), token))
    if not valid:
        raise SystemExit('No se encontró un access token en la fuente indicada.')
    expiry, token = min(valid)
    if expiry <= time.time():
        raise SystemExit('El token ya expiró.')
    requests = []

    def get(path):
        if not path.startswith('/admin/dashboard/inspections'):
            raise ValueError('Ruta fuera del alcance de lectura autorizado')
        if expiry <= time.time():
            raise SystemExit('El token ya expiró.')
        req = urllib.request.Request(BASE + path, headers={'Authorization': 'Bearer ' + token}, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                body = response.read()
                requests.append({'method': 'GET', 'path': path, 'status': response.status,
                                 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()})
                return body, response.headers.get_content_type()
        except urllib.error.HTTPError as exc:
            if exc.code == 401 and expiry <= time.time():
                raise SystemExit('El token ya expiró.') from None
            raise SystemExit(f'La lectura de la API falló: HTTP {exc.code}.') from None

    listing = json.loads(get('/admin/dashboard/inspections?page=1&pageSize=25')[0])
    candidates = [x for x in listing['items'] if x.get('mandatoryPhotosComplete') and x.get('hasGps')]
    if args.inspection_id:
        candidates = [x for x in listing['items'] if x['inspectionId'].lower() == args.inspection_id.lower()]
        if not candidates:
            candidates = [{'inspectionId': args.inspection_id}]
    selected = None
    for candidate in candidates:
        detail = json.loads(get('/admin/dashboard/inspections/' + candidate['inspectionId'])[0])
        photos = {code: next((p for p in detail['photos'] if p['slotCode'] == code and p.get('isMandatory') and p.get('uploadStatus') == 'verified'), None) for code, _ in SLOTS}
        if detail.get('location') and all(photos.values()):
            selected = detail
            break
    if selected is None:
        raise SystemExit('No se encontró una revisión con siete evidencias verificadas y GPS en la selección consultada.')
    d = selected
    ident = d['inspectionId']
    stamp = dt.datetime.now().strftime('%Y%m%d_%H%M%S')
    out = ROOT / 'reportes' / f'expediente_hidrante_{d["accountNumber"]}_{stamp}'
    out.mkdir(parents=True, exist_ok=False)
    assets = out / 'recursos'
    assets.mkdir()
    # Persist only the documentary subset; omit audit/history/device/crew data.
    fields = ['inspectionId', 'accountNumber', 'technicianName', 'status', 'startedAt', 'submittedAt',
              'generalComments', 'location', 'signal', 'checklistItems', 'totalPhotos',
              'mandatoryPhotosRequired', 'mandatoryPhotosCompleted', 'mandatoryPhotosMissing', 'photos']
    snapshot = {k: d.get(k) for k in fields}
    (out / 'datos_revision.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
    from PIL import Image, ImageOps, ImageDraw
    evidence = []
    for index, (code, label) in enumerate(SLOTS, 1):
        p = photos[code]
        path = p['contentUrl']
        expected = f'/admin/dashboard/inspections/{ident}/photos/{p["photoId"]}/content'
        if path.lower() != expected.lower():
            raise ValueError('La ruta de evidencia no corresponde a la revisión seleccionada')
        body, mime = get(path)
        if not mime.startswith('image/'):
            raise ValueError('Respuesta de evidencia no es una imagen')
        original = assets / f'{index:02}_{code}_original.jpg'
        original.write_bytes(body)
        with Image.open(io.BytesIO(body)) as image:
            image.load()
            size = image.size
            normalized = ImageOps.exif_transpose(image).convert('RGB')
            normalized.thumbnail((1800, 1800))
            normalized.save(assets / f'{index:02}_{code}.jpg', quality=92)
        evidence.append({'number': index, 'slot': code, 'label': p.get('slotLabel') or label,
                         'photoId': p['photoId'], 'path': path, 'file': str(original.relative_to(out)),
                         'normalized': f'recursos/{index:02}_{code}.jpg', 'bytes': len(body),
                         'dimensions': size, 'declaredBytes': p.get('byteSize'),
                         'sizeMatchesMetadata': not p.get('byteSize') or int(p['byteSize']) == len(body),
                         'sha256': hashlib.sha256(body).hexdigest()})

    # Static OSM mosaic; downloaded tiles are preserved for repeatable rendering.
    lat, lon = float(d['location']['latitude']), float(d['location']['longitude'])
    z = 16
    tx = (lon + 180) / 360 * 2 ** z
    ty = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** z
    origin = (math.floor(tx) - 1, math.floor(ty) - 1)
    mosaic = Image.new('RGB', (768, 768), '#eef1ec')
    tile_log = []
    for row in range(3):
        for col in range(3):
            x, y = origin[0] + col, origin[1] + row
            url = f'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            req = urllib.request.Request(url, headers={'User-Agent': 'DDR001-ExpedienteVisual/1.0 (one-off static documentary map)'})
            with urllib.request.urlopen(req, timeout=30) as response:
                data = response.read()
            (assets / f'osm_{z}_{x}_{y}.png').write_bytes(data)
            mosaic.paste(Image.open(io.BytesIO(data)).convert('RGB'), (col * 256, row * 256))
            tile_log.append(url)
    px, py = (tx - origin[0]) * 256, (ty - origin[1]) * 256
    # Keep the crop inside the downloaded mosaic to avoid black padding.
    left = max(0, min(round(px - 340), mosaic.width - 680))
    top = max(0, min(round(py - 170), mosaic.height - 340))
    box = (left, top, left + 680, top + 340)
    map_image = mosaic.crop(box)
    draw = ImageDraw.Draw(map_image)
    cx, cy = px - box[0], py - box[1]
    accuracy = d['location'].get('horizontalAccuracyM')
    if accuracy is not None:
        radius = accuracy / (156543.03392 * math.cos(math.radians(lat)) / 2 ** z)
        draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline='#176a86', width=2)
    draw.ellipse((cx-9, cy-9, cx+9, cy+9), fill='#cf4038', outline='white', width=3)
    draw.rectangle((5, 312, 675, 336), fill='white')
    draw.text((12, 318), 'OpenStreetMap contributors | Punto de captura GPS | N arriba', fill='#253d4c')
    map_image.save(assets / 'mapa_osm.png')

    render_document(d, out, requests, evidence, tile_log)


def render_document(d, out, requests, evidence, tile_log):
    from PIL import Image
    import shutil
    assets = out / 'recursos'
    logos = ['Aquafim-logo_blue.png', 'Netafim-logo.png', 'conagua-logo.png']
    for logo in logos:
        shutil.copy2(ROOT / 'public' / 'branding' / logo, assets / logo)
    ident = d['inspectionId']
    lat, lon = float(d['location']['latitude']), float(d['location']['longitude'])
    items = d['checklistItems']
    bycode = {i['itemCode']: i for i in items}
    def value(code, fallback='No capturado'):
        item = bycode.get(code, {})
        return item.get('displayValue') or fallback
    findings = []
    for item in items:
        if item.get('isNotApplicable') or not item.get('isCaptured'):
            continue
        code, label, display = item['itemCode'], item['label'], item.get('displayValue', '')
        is_leak = code == 'internal_leaks'
        absent = item.get('fieldType') == 'boolean' and item.get('valueBoolean') is False and not is_leak
        parcel_absent = bool(re.fullmatch(r'parcel_\d+_(solenoid|pilot|pilot_connected|gauge)', code)) and display == 'No'
        filter_absent = code == 'filter_element' and item.get('filterElementState') == 'absent'
        if (is_leak and item.get('valueBoolean') is True) or absent or parcel_absent or filter_absent:
            findings.append({'code': code, 'label': label, 'value': display,
                             'text': f'{label}: {display}'})
    observations = []
    if d.get('generalComments') and d['generalComments'].strip():
        observations.append(d['generalComments'].strip())
    for item in items:
        if ('comments' in item['itemCode'] or 'observ' in item['itemCode']) and item.get('isCaptured') and not item.get('isNotApplicable'):
            text = item.get('displayValue', '').strip()
            if text and text not in observations:
                observations.append(text)
    obs = ' | '.join(observations) or 'Sin observaciones'
    signal = d.get('signal') or {}
    raw = json.loads(signal.get('rawJson') or '{}')
    level = signal.get('level')
    signal_text = ' · '.join(str(x) for x in [signal.get('generation'), signal.get('networkType'), signal.get('carrierName'),
        f'{signal["dbm"]} dBm' if signal.get('dbm') is not None else None,
        f'Nivel {level}/4' if level is not None else 'Nivel no disponible',
        f'{raw["signalPercent"]}%' if raw.get('signalPercent') is not None else None] if x)
    local = dt.datetime.fromisoformat(d['startedAt'].replace('Z', '+00:00')).astimezone(dt.timezone(dt.timedelta(hours=-6)))
    date_text = local.strftime('%d/%m/%Y %H:%M') + ' (GMT-6, Aguascalientes)'
    technical = ['Marca del medidor de flujo: ' + value('flow_meter_brand'),
                 'Medidor de flujo funciona: ' + value('flow_meter_works'),
                 'Cantidad de válvulas parcelarias: ' + value('parcel_valve_count')]
    technical += [i['label'] + ': ' + i['displayValue'] for i in items if re.fullmatch(r'parcel_\d+_diameter', i['itemCode']) and not i.get('isNotApplicable')]
    title = 'FICHA TÉCNICA DE REVISIÓN DE HIDRANTE PARCELARIO'

    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    fontroot = Path('C:/Windows/Fonts')
    pdfmetrics.registerFont(TTFont('Doc', str(fontroot / 'arial.ttf')))
    pdfmetrics.registerFont(TTFont('DocBold', str(fontroot / 'arialbd.ttf')))
    pdfmetrics.registerFontFamily('Doc', normal='Doc', bold='DocBold')
    pdf = out / f'ficha_tecnica_revision_hidrante_parcelario_{d["accountNumber"]}.pdf'
    c = canvas.Canvas(str(pdf), pagesize=(612,792))
    c.setTitle(title)
    c.setAuthor('DDR001')
    ink, teal, muted = '#183544', '#14647b', '#5b6d78'
    def text(x, y, s, size=9, bold=False, color=ink):
        c.setFont('DocBold' if bold else 'Doc', size)
        c.setFillColor(HexColor(color)); c.drawString(x,y,str(s))
    def paragraph(x,y,s,width,size=9,leading=12,color=ink):
        style=ParagraphStyle('p',fontName='Doc',fontSize=size,leading=leading,textColor=HexColor(color))
        p=Paragraph(html.escape(s),style);w,h=p.wrap(width,1000);p.drawOn(c,x,y-h);return h
    def section(y,label):
        c.setFillColor(HexColor('#eaf2f5'));c.rect(34,y-7,544,22,fill=1,stroke=0)
        text(43,y,label,10,True,teal)
    def header(page):
        c.setFillColor(HexColor(teal));c.rect(0,774,612,18,fill=1,stroke=0)
        c.drawImage(str(assets/'Aquafim-logo_blue.png'),34,748,94,24,mask='auto',preserveAspectRatio=True)
        c.drawImage(str(assets/'Netafim-logo.png'),255,748,102,24,mask='auto',preserveAspectRatio=True)
        c.drawImage(str(assets/'conagua-logo.png'),475,748,103,24,mask='auto',preserveAspectRatio=True)
        text(34,733,title,12,True)
        text(34,721,f'DDR001  |  Hidrante / unidad: {d["accountNumber"]}',8,False,muted)
        c.setStrokeColor(HexColor('#d2dfe5'));c.line(34,716,578,716)
        text(523,23,f'{page} / 2',8,False,muted)
    def photo(ev,x,y,w,h):
        text(x,y,f'Foto {ev["number"]}. {dict(SLOTS)[ev["slot"]]}',9,True)
        path=out/ev['normalized']
        c.setFillColor(HexColor('#f2f4f5'));c.rect(x,y-h-10,w,h,fill=1,stroke=0)
        with Image.open(path) as im: iw,ih=im.size
        factor=min(w/iw,h/ih)
        dw,dh=iw*factor,ih*factor
        c.drawImage(ImageReader(str(path)),x+(w-dw)/2,y-10-h+(h-dh)/2,dw,dh)
    header(1)
    section(695,'DATOS GENERALES')
    text(43,674,'Número de cuenta:',9,True);text(203,674,d['accountNumber'],9)
    text(43,657,'Fecha y hora de la revisión:',9,True);text(203,657,date_text,9)
    text(43,640,'Usuario / revisor:',9,True);text(203,640,d.get('technicianName','No disponible'),9)
    text(43,623,'Estado / resultado:',9,True);text(203,623,{'submitted':'Enviada','validated':'Validada','draft':'Borrador'}.get(d['status'],d['status']),9)
    # Four bars use the stored Android level; no dBm threshold inference.
    for n in range(4):
        c.setFillColor(HexColor(teal if level is not None and n < level else '#d9e1e5'))
        c.rect(43+n*10,600,7,5+n*4,fill=1,stroke=0)
    text(95,601,'Calidad de señal: '+signal_text,8.6)
    section(580,'UBICACIÓN Y DATOS TÉCNICOS')
    text(43,558,'Coordenada:',9,True)
    text(115,558,f'{lat:.7f}, {lon:.7f}',9)
    c.drawImage(str(assets/'mapa_osm.png'),43,408,292,146)
    accuracy = d['location'].get('horizontalAccuracyM')
    accuracy_text = f'{accuracy} m' if accuracy is not None else 'No disponible'
    text(43,397,f'Precisión GPS reportada: {accuracy_text}',8,False,muted)
    text(349,554,'Datos técnicos adicionales',9,True)
    yy=538
    for line in technical:
        yy-=paragraph(349,yy,line,220,8.7,12)+4
    text(349,yy-3,'Observaciones',9,True)
    paragraph(349,yy-14,obs,220,9,12)
    section(368,'CHECKLIST TÉCNICO')
    split=math.ceil(len(findings)/2)
    maxbottom=342
    for col,group in enumerate([findings[:split],findings[split:]]):
        yy=345
        for item in group:
            h=paragraph(43+col*272,yy,'• '+item['text'],257,8.2,10.6)
            yy-=h+4
        maxbottom=min(maxbottom,yy)
    if not findings:text(43,340,'Sin hallazgos en checklist')
    if maxbottom<205:raise ValueError('Hallazgos exceden el espacio documental; ajustar maquetación')
    text(43,228,f'Total de fotografías capturadas: {d["totalPhotos"]}',9,True)
    text(43,213,'Fotografías obligatorias incluidas: 7 de 7. Las adicionales se contabilizan en el total.',8,False,muted)
    photo(evidence[0],43,193,526,146)
    c.showPage()
    header(2)
    text(34,695,'EVIDENCIAS FOTOGRÁFICAS OBLIGATORIAS',10,True,teal)
    text(34,677,'Continuación de fotografías de la misma revisión',8,False,muted)
    for n,ev in enumerate(evidence[1:]):
        photo(ev,34+(n%2)*279,650-(n//2)*202,265,172)
    c.save()

    # Editable companion: all local assets, no active API credentials or frontend dependency.
    blocks=''.join(f'<figure><img src="{e["normalized"]}"><figcaption>Foto {e["number"]}. {html.escape(dict(SLOTS)[e["slot"]])}</figcaption></figure>' for e in evidence)
    html_doc=f'''<!doctype html><html lang="es"><meta charset="utf-8"><title>{title}</title>
    <style>body{{font:14px Arial;color:#183544;max-width:1050px;margin:36px auto}}h1{{font-size:23px}}h2{{background:#eaf2f5;padding:9px}}.photos{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}figure{{margin:0}}figure img{{width:100%;height:320px;object-fit:contain;background:#f2f4f5}}figcaption{{padding:8px}}.bars{{display:inline-flex;align-items:flex-end;gap:4px}}.bars i{{width:9px;display:block}}@media print{{body{{margin:12mm}}}}</style>
    <div style="display:flex;justify-content:space-between;align-items:center"><img src="recursos/Aquafim-logo_blue.png" alt="Aquafim" style="width:160px;height:48px;object-fit:contain"><img src="recursos/Netafim-logo.png" alt="Netafim" style="width:160px;height:48px;object-fit:contain"><img src="recursos/conagua-logo.png" alt="Conagua" style="width:160px;height:48px;object-fit:contain"></div>
    <h1>{title}</h1><h2>Datos generales</h2><p>Número de cuenta: {html.escape(d['accountNumber'])}</p><p>Hidrante / unidad: {html.escape(d['accountNumber'])}</p>
    <p>Fecha y hora: {date_text}</p><p>Usuario / revisor: {html.escape(d['technicianName'])}</p><p>Estado / resultado: {html.escape(d['status'])}</p>
    <p>Calidad de señal: <span class="bars">{''.join(f'<i style="height:{6+n*5}px;background:{teal if level is not None and n<level else "#d9e1e5"}"></i>' for n in range(4))}</span> {html.escape(signal_text)}</p>
    <h2>Ubicación</h2><p><b>Coordenada:</b> {lat:.7f}, {lon:.7f}</p><img width="680" src="recursos/mapa_osm.png"><p>© OpenStreetMap contributors · <a href="https://www.openstreetmap.org/copyright">Licencia y atribución</a></p>
    <h2>Observaciones</h2><p>{html.escape(obs)}</p><h2>Datos técnicos adicionales</h2><ul>{''.join('<li>'+html.escape(t)+'</li>' for t in technical)}</ul>
    <h2>Checklist técnico</h2><ul>{''.join('<li>'+html.escape(f['text'])+'</li>' for f in findings) or '<li>Sin hallazgos en checklist</li>'}</ul>
    <h2>Fotografías</h2><p>Total de fotografías capturadas: {d['totalPhotos']}. Obligatorias incluidas: 7 de 7.</p><div class="photos">{blocks}</div></html>'''
    (out/'plantilla_editable.html').write_text(html_doc,encoding='utf-8')
    manifest={'source':BASE,'capturedAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
              'inspectionId':ident,'accountNumber':d['accountNumber'],'totalPhotos':d['totalPhotos'],
              'includedMandatory':7,'findings':findings,'observations':obs,'signal':signal_text,
              'requests':requests,'evidence':evidence,'mapTiles':tile_log,
              'pdf':pdf.name,'pdfSha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),
              'branding': [{'file': logo, 'sha256': hashlib.sha256((assets / logo).read_bytes()).hexdigest()} for logo in logos]}
    import pymupdf as fitz
    doc=fitz.open(pdf)
    assert len(doc)==2
    content='\n'.join(page.get_text() for page in doc)
    assert title in content
    assert all(f'Foto {n}.' in content for n in range(1,8))
    for forbidden in ['historial','auditoría','cuadrilla','número de revisión']:
        assert forbidden not in content.lower()
    for n,page in enumerate(doc,1):
        page.get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(out/f'vista_pagina_{n}.png')
    manifest['validation']={'pages':len(doc),'allSevenCaptions':True,'forbiddenSectionsAbsent':True,
                            'embeddedImages':sum(len(p.get_images()) for p in doc)}
    (out/'manifest_validacion.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'status':'PDF generado','pdf':str(pdf),'pages':2,'totalPhotos':d['totalPhotos'],'mandatory':7,'findings':len(findings)},ensure_ascii=True))


if __name__ == '__main__':
    main()
