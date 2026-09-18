<p align="center">
  <img src="assets/images/logoHoteleriasYa.png" alt="Logo HoteleriasYa" width="220">
</p>

<h1 align="center">HoteleriasYa &middot; Plataforma de Alojamientos</h1>

<p align="center">
  <strong>Donde el Confort lo Encuentra Todo</strong><br>
  Plataforma web frontend moderna para la búsqueda, visualización y gestión de reservas hoteleras en tiempo real.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Responsive-Mobile--First-green?style=for-the-badge" alt="Responsive Design">
  <img src="https://img.shields.io/badge/UTP-Proyecto%20Académico-red?style=for-the-badge" alt="UTP">
</p>

---

## 📌 Descripción del Proyecto

**HoteleriasYa** es una solución digital diseñada para conectar a viajeros, turistas y clientes locales con los mejores hoteles y hospedajes disponibles al instante.

La arquitectura de la interfaz está construida completamente en tecnologías web estándar (**HTML5 semántico, CSS3 moderno y JavaScript ES6+**), garantizando máxima ligereza, velocidad de carga instantánea y compatibilidad universal sin dependencias de frameworks externos.

---

## ✨ Características Principales

### 1. Encabezado Dinámico y Navegación
- Barra de navegación fija con efecto translúcido y transición a sólido (`.scrolled`) al desplazarse verticalmente.
- Menú de acceso directo a secciones clave: **Información**, **Productos**, **Clientes** y **Video**.
- Modal interactivo de autenticación (*Login / Acceso*) con persistencia en `localStorage`.

### 2. Slider Principal (Hero Section)
- Carrusel de 4 fotografías en alta definición representativas del sector hotelero.
- Cambio automatizado de diapositivas cada 5 segundos.
- Controles interactivos con flechas anterior/siguiente y puntos de salto rápido (*dots*).
- Logotipo oficial centrado sobre el encabezado y lemas comerciales de la marca.

### 3. Sección Información
- Propuesta de valor clara: disponibilidad inmediata 24/7, tarifas transparentes y eliminación de intermediarios.
- Indicador flotante con estadísticas de cobertura en tiempo real.

### 4. Catálogo de Productos y Servicios (Cards con Hover Shadow)
- Despliegue dinámico de 6 alojamientos destacados desde `js/data.js`:
  1. **Gran Hotel Central** (Centro Histórico)
  2. **Boutique Suite Valle** (Valle Sur)
  3. **Resort Costa Azul** (Frente al Mar)
  4. **Hostal El Viajero** (Centro Comercial)
  5. **Hotel Mirador Ejecutivo** (Distrito Financiero)
  6. **Cabañas Jardín Imperial** (Zona Campestre)
- **Efecto Hover Premium**: Las tarjetas presentan una suave elevación vertical (`translateY(-8px)`), sombra multicapa acentuada (`box-shadow`), zoom interior en fotografía y retroalimentación interactiva al consultar disponibilidad.

### 5. Segmentación de Clientes
- Responde a la estructura del proyecto: *¿Quiénes son sus clientes?*
- 3 perfiles analizados:
  - **Viajeros y Turistas** (Placer, vacaciones y turismo local).
  - **Parejas y Escapadas Exprés** (Privacidad, descanso y opciones flexibles por horas).
  - **Propietarios y Cadenas Hoteleras** (Maximización de inventario y ocupación).

### 6. Apartado Multimedia (Video Representativo)
- Reproductor de video nativo HTML5 en proporción 16:9.
- Carátula (*poster*) y botón de reproducción personalizado con ocultamiento automático al reproducir.

### 7. Footer Estructurado en 3 Columnas
- **Columna 1 &middot; Redes Sociales & Alianza Académica**:
  - Enlaces a perfiles oficiales en GitHub, Facebook e Instagram.
  - Insignia oficial y enlace directo a la [Universidad Tecnológica del Perú (UTP)](https://www.utp.edu.pe).
- **Columna 2 &middot; Canales de Contacto Directo**:
  - Teléfono / WhatsApp: `947102850` (enlace directo `tel:`).
  - Correo electrónico: `HotelYa@support.com` (enlace `mailto:`).
  - Horario de atención continua 24/7.
- **Columna 3 &middot; Rubros y Socios Relacionados**:
  - Acceso directo a hoteles aliados del sector (Hotel Smart Love, Selva Hotel y Hotel Dak Marlin).

---

## 📁 Estructura del Repositorio

```text
HotelYa-Front/
│
├── index.html                   # Página principal y estructura semántica HTML5
├── README.md                    # Documentación técnica del proyecto
│
├── css/
│   └── main.css                 # Estilos globales, variables CSS, componentes y responsive
│
├── js/
│   ├── data.js                  # Catálogo de datos (mock data de los 6 hoteles)
│   └── main.js                  # Lógica del slider, render dinámico, modal y video
│
└── assets/
    └── images/
        ├── logoHoteleriasYa.png # Logotipo oficial en alta definición
        ├── Utplogonuevo.svg.webp# Logo oficial de la UTP
        ├── hero1.jpg            # Imágenes para el slider principal
        ├── hero2.jpg
        ├── hero3.jpg
        ├── hero4.jpg
        ├── hotel5.jpg           # Imágenes del catálogo y clientes
        └── hotel6.jpg
```

---

## 🚀 Puesta en Marcha / Instalación Local

Para ejecutar el proyecto de manera local, no se requiere Node.js ni la instalación de dependencias vía npm:

### Opción 1: Apertura directa
1. Clona este repositorio:
   ```bash
   git clone https://github.com/ELDSC/HotelYa-Front.git
   ```
2. Accede a la carpeta del proyecto:
   ```bash
   cd HotelYa-Front
   ```
3. Abre el archivo `index.html` en tu navegador favorito (Chrome, Edge, Firefox, Safari).

### Opción 2: Servidor local (Recomendado para testing de recursos)
Utilizando **Python**:
```bash
python -m http.server 3000
```
O con la extensión **Live Server** de VS Code. Luego abre en tu navegador `http://localhost:3000`.

---

## 🛠️ Tecnologías y Metodologías

- **HTML5**: Marcado semántico (`<header>`, `<nav>`, `<section>`, `<article>`, `<footer>`).
- **CSS3**:
  - Sistema de diseño con variables CSS (`:root`).
  - Maquetación híbrida con **CSS Grid** y **Flexbox**.
  - Efectos visuales con `box-shadow`, transiciones cúbicas y transformaciones de hardware.
  - Diseño responsivo adaptativo (*Mobile-First* y puntos de quiebre en `768px` y `1024px`).
- **JavaScript Nativo (ES6+)**:
  - Manipulación eficiente del DOM sin librerías externas.
  - Manejo de estado para carrusel y autenticación con `localStorage`.
  - Eventos de scroll optimizados y modales accesibles.

---

## 👥 Contacto y Enlaces Oficiales

- **Repositorio Oficial**: [github.com/ELDSC/HotelYa-Front](https://github.com/ELDSC/HotelYa-Front)
- **Desarrollador / Administrador**: Josué Sarango
- **Teléfono**: +51 947 102 850
- **Correo Electrónico**: [HotelYa@support.com](mailto:HotelYa@support.com)
- **Institución Académica**: [Universidad Tecnológica del Perú (UTP)](https://www.utp.edu.pe)

---

<p align="center">
  Desarrollado con dedicación para <strong>HoteleriasYa</strong> &copy; 2026. Todos los derechos reservados.
</p>
