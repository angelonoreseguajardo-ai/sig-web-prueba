# SIG Nacional — Node.js, React, Vite, MapLibre

## Instalación Windows (sin Docker)

1. Extraer el ZIP. Abrir PowerShell **dentro de la carpeta que contiene package.json**.
2. `node --version` (Node.js 22 o superior recomendado)
3. `npm install`
4. `Copy-Item .env.example .env`
5. `notepad .env` y sustituir los valores CAMBIAR_ por una contraseña nueva y un secreto aleatorio de 32+ caracteres. No compartir el archivo.
6. **Ventana PowerShell 1:** `npm run server` (API en http://127.0.0.1:8001/api/health)
7. **Ventana PowerShell 2, misma carpeta:** `npm run dev` (visor en http://localhost:5173)

Para generar un secreto en PowerShell:
`$b=New-Object byte[] 48; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`

## Funciones de esta versión
- Mapa MapLibre, OpenStreetMap, carga temporal SHP ZIP, KML, KMZ y GeoJSON.
- Buffer Turf.js en metros sobre capa completa o selección, tabla de atributos, búsqueda por texto, selección por tabla, exportación GeoJSON y CSV, consulta UTM por clic.
- API Express con acceso público de lectura y autenticación de administrador para publicar y eliminar capas oficiales. Las capas oficiales se guardan en `data/layers.json`.

## Límites y seguridad
- Prototipo local: autenticación con token en memoria; se pierde al reiniciar el servidor. **No publicar esta API directamente en Internet**: antes se requieren HTTPS, sesiones/cookies seguras, limitación de intentos, validación más estricta de geometrías, almacenamiento transaccional, copias de seguridad y despliegue endurecido.
- La API escucha solamente en 127.0.0.1. `localhost:5173` no es una URL pública.
- No implementados aún: carga GeoPackage, exportación SHP/KMZ, selección espacial avanzada, medición por dibujo, zoom automático a capa, publicación en producción, carga de capas muy grandes y edición de simbología.
- El mapa de OSM necesita Internet y está sujeto a su política de uso.
