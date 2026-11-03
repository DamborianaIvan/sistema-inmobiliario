# Gestión inmobiliaria — base inicial

Producto común con instalación, base de datos, usuarios y secretos independientes por inmobiliaria. Panel privado sin catálogo público. Versión inicial para desarrollo y validación; todavía no es una entrega de producción.

## Qué incluye

- Login, consulta de sesión, logout con revocación, límites persistentes por IP/cuenta y contraseñas con bcrypt.
- Administrador inicial por consola, sin endpoint de registro público.
- Administradores y empleados. Solo administradores gestionan usuarios, configuración y auditoría; ambos roles gestionan el catálogo.
- Propietarios con contacto y notas. No se permite archivar uno con propiedades vinculadas.
- Propiedades: ficha, propietario principal, ubicación, características, notas y hasta 20 fotografías por URL HTTPS.
- Venta, alquiler o ambas, con precios y monedas ARS/USD independientes. El alquiler se expresa por mes.
- Referencias automáticas `INM-000001`, búsqueda, filtros por tipo/operación/estado y paginación.
- Disponibilidad general: disponible, reservada, vendida, alquilada o retirada.
- Resumen de cantidades, configuración de nombre/logo/contacto y auditoría con antes/después.
- Transacciones para escribir datos y auditoría juntos; control de edición simultánea en fichas y configuración.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `backend/models` | Persistencia en MongoDB con Mongoose |
| `backend/routes` | API y autorización por recurso |
| `backend/services` | Auditoría y administración transaccional de usuarios |
| `backend/utils` | Validaciones y transacciones |
| `backend/middleware` | Autenticación, permisos, límites, errores y cabeceras |
| `backend/scripts` | Instalación del administrador y ejecución de integración |
| `panel/src/components` | Pantallas, formularios y modales React/TypeScript |
| `docs` | Revisión del origen y siguientes etapas |

## Inicio local

Requiere Node.js 22 o posterior y MongoDB con transacciones: Atlas o un replica set local. Una instancia local standalone no alcanza. Usar una base nueva; no conectar a la de Pepe’s.

1. En `backend`, ejecutar `npm ci` y copiar `.env.example` como `.env`.
2. Completar `MONGODB_URI` y `JWT_SECRET`. La URI debe incluir el nombre de esta base de datos. Para generar el secreto, ejecutar:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

3. Crear el primer administrador desde `backend`. En PowerShell:

   ```powershell
   '{"nombre":"Administrador","nombreUsuario":"admin","email":"tu-email@ejemplo.com","password":"REEMPLAZAR-POR-TU-CLAVE"}' | npm run admin:create
   ```

   Ejecutar `npm run admin:create` solo no abre un formulario: hay que enviar el JSON como en el ejemplo anterior.

   Elegir una contraseña propia de al menos 8 caracteres y hasta 72 bytes. La entrada se recibe por stdin, no se guarda como archivo. El comando se niega a crear otra cuenta si ya existen usuarios; las siguientes se crean desde el panel.

4. Ejecutar `npm run dev` en `backend`. API: `http://localhost:5001`.
5. En otra terminal, entrar a `panel`, ejecutar `npm ci`, copiar `.env.example` como `.env` y ejecutar `npm run dev`. Panel: `http://localhost:5175`.
6. Ingresar, completar la configuración, cargar un propietario y luego una propiedad.

Los puertos se eligieron para no coincidir con los proyectos anteriores. Si se cambian, actualizar también `CORS_ORIGINS` y `VITE_API_URL`. Los nombres de usuario distinguen mayúsculas y minúsculas.

## Verificación

En `backend`:

```bash
npm test
npm run test:integration
npm audit
```

La integración usa una base temporal independiente mediante `mongodb-memory-server`, descarga MongoDB al primer uso y elimina sus datos al finalizar. Comprueba instalación, concurrencia de referencias, permisos, catálogo, auditoría y revocación por HTTP. No usa la base configurada para la inmobiliaria.

En `panel`:

```bash
npm run build
npm audit
```

Resultado en el entorno de preparación, 3 de noviembre de 2026: **27 pruebas aprobadas**, una integración omitida en la suite normal, compilación TypeScript/Vite correcta y cero vulnerabilidades en el análisis realizado. Se intentó la integración por separado, pero el proceso MongoDB terminó con `open: Operation not permitted`. No se completó la prueba real de base ni la validación visual en navegador: la descarga de Chromium falló. Estas verificaciones quedan pendientes y no se consideran aprobadas.

## Antes de entregar a una inmobiliaria

- Ejecutar la integración y recorrer el panel contra una base de pruebas, incluyendo dos usuarios editando fichas y pruebas en celular.
- Implementar la subida de fotos y definir almacenamiento, permisos, tamaños, formatos y borrado. Esta base solo acepta enlaces HTTPS; las imágenes externas se solicitan desde el navegador.
- Completar filtros de precio, moneda y características según uso real.
- Validar el modelo de disponibilidad: actualmente es un estado general del inmueble. Si debe seguir a la venta mientras está alquilado, habrá que separar disponibilidad por operación.
- Configurar despliegue, HTTPS, credenciales independientes, copias de seguridad y recuperación.

`TRUST_PROXY=0` es para acceso directo. Detrás de un proxy, indicar la cantidad real de saltos y asegurar que la API no sea accesible por un camino que los evite; de ello depende la IP usada para los límites de acceso. Las transacciones requieren replica set también en producción.

Los tokens se guardan en `sessionStorage`, se verifican contra la cuenta actual y se revocan al salir. Cambiar contraseña, rol o estado invalida las sesiones anteriores. No hay recuperación de contraseña por correo en esta etapa: la gestiona un administrador.

## Producto común

Cada cliente usa el mismo código y una configuración propia, sin ramas permanentes por cliente. Para una instalación nueva: nueva base, nuevo secreto, nuevos usuarios, origen del panel y marca. No copiar bases, archivos `.env` ni datos personales entre inmobiliarias.
