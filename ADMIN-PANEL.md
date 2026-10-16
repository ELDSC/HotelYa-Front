# Panel de control del catálogo

Se agregó una página independiente en `admin/index.html`, accesible en `/admin/` durante desarrollo.

## Endpoints utilizados

- `GET /api/hotels`: carga los hoteles publicados para la tabla, búsqueda, filtro e indicadores.
- `GET /api/hotels/{id}`: carga el detalle del hotel seleccionado, tipos de habitación y tarjetas informativas.

La página usa la configuración existente `VITE_API_BASE_URL` y los tipos/cliente API del proyecto. Los estilos están aislados en `src/styles/admin.css`; no se reemplazan ni modifican las pantallas existentes de inicio de sesión o del panel de propietario. El único cambio en la configuración de build es registrar `admin/index.html` como entrada adicional de Vite.

## Límite actual del backend

El backend incluido expone endpoints públicos de lectura para hoteles y endpoints autenticados bajo `/api/owner/**` para que cada propietario gestione su propio hotel. No se encontraron endpoints administrativos para listar todos los hoteles (incluidos los no publicados), administrar cuentas/roles ni crear, editar o eliminar hoteles como administrador. Por seguridad, esta interfaz es de consulta y no simula acciones de escritura ni utiliza los endpoints de propietario como si fueran administrativos.

Para convertirla en un panel administrativo CRUD, el backend necesita endpoints específicos y autorización de rol administrador.
