// js/data.js
const MOCK_HOTELS = [
    {
        id: 1,
        name: "Gran Hotel Central",
        location: "Centro Histórico",
        price: 85.00,
        type: "Noche",
        rating: 4.8,
        reviews: 124,
        amenities: ["Wifi", "Desayuno", "Estacionamiento"],
        image: "assets/images/hero1.jpg",
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
        amenities: ["Wifi", "Desayuno", "Piscina", "Gimnasio", "Estacionamiento"],
        image: "assets/images/hero1.jpg",
        featured: false
    },
    {
        id: 4,
        name: "Hostal El Viajero",
        location: "Centro Comercial",
        price: 25.00,
        type: "Por Hora",
        rating: 4.2,
        reviews: 56,
        amenities: ["Wifi", "Recepción 24h"],
        image: "assets/images/hero2.jpg",
        featured: false
    }
];

window.MOCK_HOTELS = MOCK_HOTELS;
