# HoteleriasYa

Aplicación Angular 22 con TypeScript estricto, SCSS, Bootstrap 5 y ng-bootstrap. Consume la API REST de Spring Boot para el catálogo, la administración de dueños y el acceso administrativo global.

## Ejecución

Requisitos: Node 24.15 o superior dentro de la versión 24, npm y el backend configurado según su README.

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. La configuración local vive en `.env`, ignorado por Git:

| Variable | Uso |
| --- | --- |
| `HOTELYA_API_BASE_URL` | Origen HTTP(S) de Spring Boot, sin rutas, credenciales ni parámetros. Local: `http://127.0.0.1:8080`. |
| `HOTELYA_OWNER_LOGIN_EMAIL`, `HOTELYA_OWNER_LOGIN_PASSWORD` | Credenciales de demostración precargadas en el acceso del dueño. |
| `HOTELYA_ADMIN_LOGIN_EMAIL`, `HOTELYA_ADMIN_LOGIN_PASSWORD` | Credenciales de demostración precargadas en el acceso administrativo. |
| `HOTELYA_E2E_BASE` | Base de las pruebas: `/` o una subruta terminada en `/`. |
| `HOTELYA_E2E_REUSE_SERVER` | `0` para servidores propios de pruebas; `1` para reutilizar servidores activos del mismo proyecto. |

Todas son explícitas. Las variables del proceso tienen prioridad. El adaptador de Angular incorpora solo la configuración pública al compilar; las credenciales precargadas son visibles en el JavaScript y no crean cuentas ni inician sesión automáticamente. No colocar secretos del backend en estas variables. Cambiar la configuración requiere reconstruir el build.

## Arquitectura y comportamiento

- `src/app`: componentes standalone por funcionalidad, servicios HttpClient, guards y controles compartidos. Signals gestionan el estado; `input()` y `output()` comunican componentes.
- Los formularios usan Reactive Forms tipados, validadores, errores por campo y protección de cambios pendientes. El servidor determina autorización, propiedad y reglas de publicación.
- `src/scss`: estilos comunes, variables y mixins; los temas del hotel y del panel están delimitados para evitar interferencias. ng-bootstrap gestiona carrusel, modal, menú lateral y notificaciones.
- `public/assets`: recursos estáticos con nombres estables. Los archivos subidos se resuelven contra la API; la vista previa privada descarga blobs autenticados y libera sus URLs al salir.

Las rutas son `/`, `/hoteles/:id`, `/acceder`, `/panel`, `/panel/informacion`, `/panel/habitaciones`, `/panel/multimedia`, `/panel/vista-previa`, `/admin/acceder` y `/admin`. Las rutas desconocidas muestran una página no encontrada. El panel usa rutas hijas y carga diferida.

La búsqueda estática se aplica al confirmar; la dinámica filtra mientras se escribe, sobre una sola carga del catálogo. Las tarifas son por hora, paquete o noche, en soles. WhatsApp permite consultar la estadía; no se procesan reservas ni pagos.

Dueños y administradores tienen sesiones independientes. Los JWT de acceso permanecen en memoria; la renovación usa cookies HttpOnly y CSRF explícito. Los interceptores adjuntan el token únicamente a la API privada correspondiente y reintentan una vez tras renovar un `401`. Web Locks coordina la rotación entre pestañas cuando está disponible.

## Build y hosting

```bash
npm run build
npm run preview
```

Preview sirve `dist` en `http://127.0.0.1:4173`. Publicar el contenido de `dist` en un hosting estático con fallback de las rutas de aplicación a `index.html`. El backend debe permitir el origen web mediante `HOTELYA_CORS_ORIGINS`, con credenciales para autenticación.

Para montar el sitio en una subruta:

```bash
npm run build -- --base=/hotelya/
npm run preview -- --base=/hotelya/
```

La base del build y del servidor debe coincidir. Preview verifica el build existente; no cambia su API.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:e2e:build
npm run test:e2e:owner
```

Instalar Chromium con `npx playwright install chromium` si no está disponible. Las suites generales simulan la API. La suite `owner` levanta Spring Boot en 8081 y Angular en 5174, utiliza exclusivamente `hotelya_test` y requiere PostgreSQL local activo. Limpia los datos de ese esquema antes y después de cada proyecto de navegador. No ejecutarla simultáneamente con las pruebas de integración Java. `npm run test:e2e:live` contrasta el catálogo público con el backend configurado sin escribir datos. Las capturas, trazas e informes quedan en directorios ignorados por Git.
