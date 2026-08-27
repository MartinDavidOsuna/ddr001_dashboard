# Automatización local con Microsoft Edge

La automatización usa `playwright-core` y el Microsoft Edge ya instalado; no descarga Chromium. Las capturas se guardan en `.artifacts/edge/`, que está ignorado por Git.

## Preparación

1. Levantar el dashboard:

   `npm run dev`

2. En otra terminal PowerShell, asignar una sesión administrativa `viewer` o `admin` únicamente al proceso actual. Por compatibilidad, las variables conservan el nombre `E2E_VIEWER_*`; el modo recomendado usa credenciales runtime:

   `$env:E2E_VIEWER_EMAIL = Read-Host "Email viewer"`

   `$env:E2E_VIEWER_PASSWORD = Read-Host -MaskInput "Password viewer"`

   Si ambas están definidas, siempre tienen prioridad y el harness abre `/login`, exige `POST /api/v1/admin/auth/login` con HTTP 200 y no siembra ningún refresh token residual.

   Como alternativa, cuando no existen email/password se admite refresh token:

   `$env:E2E_REFRESH_TOKEN = Read-Host -MaskInput "Refresh token READ_ONLY"`

3. Ejecutar:

   `npm run e2e:edge`

El script selecciona el modo exclusivamente desde `process.env`; no carga secretos desde `.env`, `.env.local`, scripts npm ni archivos del repositorio. Al comenzar imprime solamente definido/no definido para las tres variables y el modo seleccionado. Inicia o restaura la sesión mediante el flujo normal, recarga y exige por separado un refresh HTTP 200, confirma mediante `/admin/auth/me` un rol `viewer` o `admin` y comprueba su indicador visual, certifica la galería y cierra sesión al final. Cualquier otro rol se rechaza y el rol debe permanecer idéntico tras refresh. Captura `desktop-gallery.png`, `tablet-gallery.png`, `mobile-gallery.png` y `gallery-lightbox.png` en `.artifacts/edge/`. No imprime email, contraseña, tokens, headers Authorization ni cuerpos de autenticación.

Antes de continuar confirma que la primera petición administrativa apunta a `http://cifra.aquafim.com:3002/api/v1/admin/…`; aborta si detecta otro protocol, host, puerto o prefijo. Los fallos HTTP muestran únicamente `status + protocol + host + pathname`, nunca query strings ni headers.

En modo credenciales, el contexto comienza limpio y elimina `ddr001.admin.refresh` al abrir `/login`; después comprueba que el login guardó un refresh nuevo. En modo token, éste sólo se siembra cuando `sessionStorage` está vacío. La aplicación rota el token durante la restauración y el script conserva esa nueva versión en las navegaciones posteriores; nunca vuelve a sobrescribirla con el valor inicial ya consumido.

Si falla un paso, se generan `.artifacts/edge/error.png` y `error-page.txt`. El diagnóstico limita el texto visible a 2,000 caracteres y registra únicamente URL sin query, pathname, título, status/pathname HTTP y errores de consola sanitizados.

Los errores de consola incluyen ubicación y línea/columna; `requestfailed` incluye método, destino seguro y `errorText`; las respuestas 404 incluyen método, `protocol + host + pathname` y tipo de recurso. El 2026-08-26 esta telemetría identificó el 404 benigno implícito de `/favicon.ico`; se corrigió declarando `/favicon.svg` en `index.html`, sin excluir globalmente errores de consola o respuestas 404.

Opcionales:

- `E2E_APP_URL`: frontend distinto de `http://localhost:5173`.
- `EDGE_EXECUTABLE`: ruta no estándar de `msedge.exe`.
- `E2E_TIMEOUT_MS`: timeout diagnóstico; por defecto 30000 ms.

No guardar tokens en `.env`, `.env.local`, scripts, historial compartido ni archivos versionados. El token compartido por chat debe rotarse al finalizar la certificación.

## Puerta pendiente de Subetapa 3.1

Tras el deployment manual de la API, el mismo `scripts/edge-e2e.mjs` deberá cubrir la galería autenticada en 1440, 768 y 390 px: filtros, paginación, miniaturas privadas, original bajo demanda, lightbox/zoom, enlaces a hidrante/revisión y estados vacío/error. La ejecución debe conservar las comprobaciones de consola/red y seguir siendo estrictamente de sólo lectura en producción. No se crea un harness paralelo.
