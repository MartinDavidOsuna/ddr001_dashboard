# Dashboard local

Instalado desde `origin/main`, commit `53c3f06` (1 de septiembre de 2026).
Esta rama contiene el visor RV, ficha de hidrante, galeria, exportaciones,
directorio de usuarios y dashboard de construccion integrado con la API.
La rama `feature/fase-2-hydrant-master-record` apunta al mismo commit;
las otras dos ramas son antecesoras de `main`.

## Ejecutar

Requiere Node.js 22 y la API funcionando en el puerto 3000.

```powershell
cd C:\DEV\AQAGS\ddr001_dashboard
npm ci
npm run dev
```

Abrir http://localhost:5173 e iniciar sesion con una cuenta administrativa
de la API local. Si las dependencias ya estan instaladas, basta `npm run dev`.

`.env.local` (ignorado por Git) contiene:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_CONSTRUCTION_DATA_MODE=api
```

Vite reenvia `/api` a `http://127.0.0.1:3000` durante el desarrollo.
El proxy elimina el encabezado Origin en ese salto local para evitar el
rechazo CORS de la API; la autenticacion administrativa sigue siendo necesaria.
Construccion usa los datos reales de la API.

`npm test` selecciona los fixtures de construccion en la configuracion de Vitest,
sin depender de archivos locales. Fuera de las pruebas, API es el modo predeterminado;
solo `VITE_CONSTRUCTION_DATA_MODE=mock` activa datos de demostracion.

Estado de la integracion y pendientes de almacenamiento/publicacion:
[Levantamientos con datos del servidor](docs/construction-real-data-validation.md).

`npm run build` genera `dist/`. Para servir esa compilacion se necesita un
proxy equivalente para `/api`, o compilar con una URL de API y CORS habilitado.

## Archivos previos

Los archivos Figma originales se conservaron en `figma-local-backup-20260915/`
y `figma.zip`. Ambos estan excluidos localmente en `.git/info/exclude`.
El directorio `figma/` corresponde a la version del repositorio.
