# HoteleriasYa · Vite + TypeScript

Aplicación multipágina para el catálogo de hoteles y sus tipos de habitación. Usa Vite 8.3.4, TypeScript estricto y módulos ES. El listado y la ficha consultan Spring Boot; la configuración y los datos del backend no dependen de variables globales en `window`.

## Instalar y ejecutar

Requisitos: Node 24 y npm. Desde `HotelYa-Front`:

```bash
npm ci
npm run dev
```

Abrir <http://127.0.0.1:5173>. La configuración actual está en `.env`. Para obtener datos reales, levantar Spring Boot y la instancia local de HotelYa siguiendo el README de `../HotelYa-Back`.

Vite usa un puerto fijo: si 5173 está ocupado, informa del conflicto. Detenerlo con Ctrl+C en su terminal. En un IDE con soporte npm, seleccionar el script `dev` del `package.json` para el botón Ejecutar. Se retiraron el servidor Python y los scripts antiguos del frontend.

## Configuración por entorno

El archivo `.env` contiene la configuración explícita de la aplicación y de las pruebas:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
HOTELYA_E2E_BASE=/
HOTELYA_E2E_REUSE_SERVER=0
```

Usar directamente `.env`, tanto para desarrollo como para build. No hay archivos de plantilla ni valores de respaldo en el código. `.env` está ignorado por Git. En una copia nueva, crear ese archivo con los valores del entorno que se va a utilizar. Para publicar, establecer la URL real de Spring Boot en `VITE_API_BASE_URL` antes de construir. Solo esa variable se incorpora a la aplicación; las variables `HOTELYA_E2E_*` se usan exclusivamente en las pruebas.

La variable es obligatoria para desarrollo y build. Debe ser un origen HTTP(S), sin usuario, contraseña, rutas, query ni fragmento; se admite una barra final. La variable del proceso tiene prioridad sobre los archivos, según las reglas estándar de Vite.

Vite incorpora la URL al build: después de cambiarla hay que reconstruir `dist`. No existe configuración pública inyectada al servir archivos. Las variables `HOTELYA_API_BASE_URL`, `FRONTEND_HOST` y `FRONTEND_PORT` del frontend quedaron reemplazadas por la configuración de Vite.

El backend debe permitir mediante `HOTELYA_CORS_ORIGINS` los orígenes utilizados por el navegador. Localmente: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173` y `http://127.0.0.1:4173`. Si se cambia el puerto u origen, actualizar CORS y reiniciar Spring Boot. Cambiar de 5500 a 5173 crea un almacenamiento de navegador distinto; la sesión de demostración anterior no se traslada.

## Build y publicación

Para comprobar un build con el backend local:

```bash
npm run build
npm run preview
```

Abrir <http://127.0.0.1:4173>. El build utiliza la URL configurada en `.env`. Preview sirve el build existente: cambiar la variable al ejecutar preview no cambia su API.

Publicar **solo el contenido de `dist`** en un hosting estático. Incluye `index.html`, `hotel-central.html`, los recursos compilados y los archivos públicos del catálogo. Preview es una herramienta de comprobación local. El hosting debe servir ambas páginas como archivos y permitir el acceso directo a la ficha; no se requiere un fallback de SPA. En producción, configurar el dominio del frontend en CORS del backend.

Para montar el sitio bajo `/hotelya/`:

```bash
npm run build -- --base=/hotelya/
```

Para comprobar ese montaje localmente, ejecutar `npm run preview -- --base=/hotelya/` y abrir `http://127.0.0.1:4173/hotelya/`. La base de preview debe coincidir con la del build.

El hosting debe montar el contenido de `dist` en esa subruta. Vite adapta los recursos procesados; el resolvedor de medios del catálogo utiliza `import.meta.env.BASE_URL`. Los enlaces entre las dos páginas conservan la subruta.

## Organización y contratos

- `src/pages`: una entrada por HTML; importa CSS e inicializa únicamente las funciones de esa página.
- `src/api`: transporte HTTP con timeout de diez segundos y operaciones `getHotels()` / `getHotel(id)`.
- `src/types`: tipos que reflejan los DTO de Spring Boot, sus valores enumerados y campos anulables. El tipado no sustituye la validación del servidor.
- `src/features`: listado, ficha y sesión de demostración.
- `src/ui`: DOM tipado, estados de carga/error y controles compartidos.
- `src/utils`: referencias multimedia seguras y formato de tarifas.
- `src/styles`: estilos importados por las entradas, procesados por Vite.
- `src/assets`: recursos propios de la interfaz; Vite transforma sus URLs y nombres al construir.
- `public/assets`: fotografías y video cuyos nombres devuelve la API; se copian a `dist/assets` sin cambiar nombres.

Los módulos exportan funciones explícitas y no registran eventos ni realizan consultas al importarlos. Cada HTML tiene una sola entrada `type="module"`; no depende del orden de scripts clásicos. Vite comparte automáticamente las dependencias entre páginas.

`index.html` consulta `GET /api/hotels`. «Ver hotel» abre `hotel-central.html?id=<id>` y consulta `GET /api/hotels/{id}`. Una ficha sin identificador consulta el listado y usa el primer hotel. Ambos flujos tienen carga, vacío, error y reintento, sin datos mock de respaldo.

Los textos recibidos se insertan con `textContent`. Los medios de la API solo admiten referencias locales bajo `assets/images/` y `assets/videos/`; se rechazan rutas externas, traversal y referencias codificadas. Las referencias del catálogo quedan en `public` porque su nombre es parte del contrato HTTP, no por compatibilidad con el servidor anterior.

El hotel inicial es **Lumi’s Hotel**, con tipos **Temática, Matrimonial y Premium**, tratados como productos. Las tarifas son de referencia. No hay habitaciones físicas identificadas, stock, disponibilidad, reservas en línea, calificaciones ni reseñas. El login conserva su demostración en `localStorage` y no representa autenticación del backend.

## Calidad y pruebas

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run test:e2e:build
```

`build` también ejecuta `typecheck`. ESLint usa configuración plana y rechaza advertencias. Vitest prueba el origen de la API, medios con distintas bases, tarifas, errores HTTP y timeout. Playwright prueba ambas páginas, imágenes, video, navegación, estados, renderizado seguro, controles y vista móvil. Sus fixtures son exclusivos de pruebas y no se incluyen en la aplicación.

Playwright arranca y detiene las instancias de Vite que necesita. Los comandos generales usan respuestas HTTP controladas y no necesitan el backend. Las pruebas de preview construyen primero con la URL de API explícita de `.env`.

Con Spring Boot activo:

```bash
npm run test:e2e:live
```

La suite live consulta el catálogo real tanto en desarrollo como en preview, sin cambiar datos. Para usar otro backend, cambiar `VITE_API_BASE_URL` en `.env`. Configurar `HOTELYA_E2E_BASE` con la base que se va a probar y `HOTELYA_E2E_REUSE_SERVER` con `0` (iniciar servidores propios) o `1` (reutilizar servidores activos). Ambas variables son obligatorias, sin valores de respaldo. Para reutilizar un servidor ya activo, establecer `HOTELYA_E2E_REUSE_SERVER=1`; ese servidor debe pertenecer a este checkout y tener la misma API y base esperadas. La reutilización de preview omite el build automático, por lo que antes se debe reconstruir con esa configuración.

Prueba completa del build bajo una subruta:

```bash
HOTELYA_E2E_BASE=/hotelya/ npm run test:e2e:build
```

Las capturas de escritorio y móvil, trazas de fallos y evidencias quedan en `test-results/`. El informe HTML está en `playwright-report/`; ambos directorios están ignorados por Git. Las pruebas generales aíslan los recursos externos de demostración para evitar dependencia de su disponibilidad; la suite live comprueba los datos y recursos locales reales.

## Fuente de los datos de Lumi’s

Dirección y teléfono proceden de las referencias conservadas en el proyecto: https://yandex.com/maps/org/lumi_hotel/132122445572/; la dirección fue contrastada con https://monjitasclub.com/hospedajes/ el 18/09/2026. No se verificó contacto telefónico. Fotografías, video y nombres de tipos de habitación fueron proporcionados para el proyecto. Las descripciones se basan en las imágenes. Los importes actuales son datos de demostración, no tarifas confirmadas del hotel. WhatsApp, horarios, coordenadas y estacionamiento quedan sin confirmar.
