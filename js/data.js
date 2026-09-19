// Catálogo de 6 productos y alojamientos de HotelYa
const MOCK_HOTELS = [
    {
        id: 1,
        name: "Lumi's Hotel",
        location: "San Juan de Miraflores, Lima",
        price: 85.00,
        type: "Noche",
        rating: null,
        reviews: 0,
        amenities: ["San Juan de Miraflores", "Consultar habitaciones"],
        image: "assets/images/lumis-hotel-logo.jpg",
        imageFit: "contain",
        detailUrl: "hotel-central.html",
        featured: true
    },
    {
        id: 2,
        name: "Boutique Suite Valle",
        location: "Valle Sur",
        price: 45.00,
        type: "Paquete 3h",
        rating: 4.5,
        reviews: 89,
        amenities: ["Wifi", "Piscina", "Spa"],
        image: "assets/images/hero2.jpg",
        featured: false
    },
    {
        id: 3,
        name: "Resort Costa Azul",
        location: "Frente al Mar",
        price: 120.00,
        type: "Noche",
        rating: 4.9,
        reviews: 312,
        amenities: ["Wifi", "Desayuno", "Piscina", "Gimnasio"],
        image: "assets/images/hero3.jpg",
        featured: true
    },
    {
        id: 4,
        name: "Hostal El Viajero",
        location: "Centro Comercial",
        price: 25.00,
        type: "Por Hora",
        rating: 4.2,
        reviews: 56,
        amenities: ["Wifi", "Recepción 24h", "Aire Acondicionado"],
        image: "assets/images/hero4.jpg",
        featured: false
    },
    {
        id: 5,
        name: "Hotel Mirador Ejecutivo",
        location: "Distrito Financiero",
        price: 95.00,
        type: "Noche",
        rating: 4.7,
        reviews: 140,
        amenities: ["Wifi Alta Velocidad", "Desayuno Buffet", "Sala de Reuniones"],
        image: "assets/images/hotel5.jpg",
        featured: false
    },
    {
        id: 6,
        name: "Cabañas Jardín Imperial",
        location: "Zona Campestre",
        price: 60.00,
        type: "Paquete 6h",
        rating: 4.6,
        reviews: 98,
        amenities: ["Wifi", "Áreas Verdes", "Jacuzzi", "Parrilla"],
        image: "assets/images/hotel6.jpg",
        featured: true
    }
];

window.MOCK_HOTELS = MOCK_HOTELS;
