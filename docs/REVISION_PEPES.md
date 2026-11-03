# Revisión de Pepe’s y extracción de la base

Origen: `DamborianaIvan/pepes-napoli`, rama `main`, commit `6b20db42bb3a87b62cd26c7e33f3229ab20471f1`. Consulta realizada el 3 de noviembre de 2026. El repositorio original se consultó en modo lectura; no se modificó.

## Hallazgos y decisión

| Pieza revisada | Decisión en el proyecto inmobiliario |
| --- | --- |
| `middleware/auth.js` | Reutilizar verificación HS256, consulta de usuario activo, versión de sesión y revocación por hash del token. |
| `middleware/loginLimiter.js` | Reutilizar ventanas persistidas en MongoDB por IP y cuenta; no dependen de la memoria del servidor. |
| `models/Usuario.js` | Conservar hash bcrypt y revocación al cambiar credenciales, rol o estado; cambiar el rol predeterminado a empleado. |
| `routes/auth.js` | Adaptar login/logout; eliminar el bootstrap público y agregar consulta de sesión. El administrador inicial se crea por consola. |
| `routes/usuarios.js` y administración de usuarios | Conservar transacción, serialización y protección de administradores activos; reemplazar los roles gastronómicos. |
| Validaciones, errores, cuerpos JSON y cabeceras | Reutilizar patrones y utilidades; agregar reglas específicas del catálogo inmobiliario. |
| Auditoría y transacciones | Reutilizar infraestructura, reemplazar acciones/entidades e incluir cambios del catálogo dentro de la transacción. |
| Panel y sesión | Conservar la separación conceptual entre API, sesión y pantallas; construir pantallas nuevas en React/TypeScript. El token queda en sessionStorage. |
| Pedidos, caja, cocina, delivery, mesas, recetas y prepizzas | Excluir por completo de esta base. |

No se copió la aplicación gastronómica completa para renombrar sus recursos. Se extrajeron las piezas comunes y se crearon modelos, rutas y pantallas para el dominio inmobiliario. Se redujeron las dependencias del panel a las necesarias para esta etapa.

## Límites de esta revisión

Es una revisión para reutilización y una primera implementación; no certifica que el nuevo sistema esté listo para producción. Las reglas nuevas deben verificarse contra MongoDB y con recorridos reales del panel. Los controles existentes en Pepe’s ayudan a construir esta base, pero no sustituyen esas pruebas.
