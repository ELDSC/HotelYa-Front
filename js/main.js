document.addEventListener('DOMContentLoaded', () => {
    // 1. Renderizado de las 6 tarjetas de hoteles (Productos y Servicios)
    const hotelContainer = document.getElementById('hotelListContainer');
    const hotels = window.MOCK_HOTELS || [];
    
    if (hotelContainer) {
        if (hotels.length === 0) {
            hotelContainer.innerHTML = '<div class="no-results">No se encontraron alojamientos disponibles en este momento.</div>';
        } else {
            hotelContainer.innerHTML = '';
            hotels.forEach(hotel => {
                const card = document.createElement('div');
                card.className = 'hotel-card';
                
                const amenitiesHtml = hotel.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('');
                const extraAmenities = hotel.amenities.length > 3 ? `<span class="amenity-tag">+${hotel.amenities.length - 3}</span>` : '';
                
                card.innerHTML = `
                    <div class="hotel-card-image">
                        <img src="${hotel.image}" alt="${hotel.name}" loading="lazy">
                        ${hotel.featured ? '<div class="hotel-badge">Destacado</div>' : ''}
                    </div>
                    <div class="hotel-card-content">
                        <div class="hotel-header">
                            <h3 class="hotel-name">${hotel.name}</h3>
                            <div class="hotel-rating">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                ${hotel.rating} <span>(${hotel.reviews})</span>
                            </div>
                        </div>
                        <p class="hotel-location">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            ${hotel.location}
                        </p>
                        <div class="hotel-amenities">${amenitiesHtml}${extraAmenities}</div>
                        <div class="hotel-footer">
                            <div class="hotel-price" style="display: none;">
                                <span class="price-value">S/ ${hotel.price.toFixed(2)}</span>
                                <span class="price-type">/ ${hotel.type}</span>
                            </div>
                            <button class="btn btn-primary btn-sm btn-check-hotel" data-name="${hotel.name}">Ver Disponibilidad</button>
                        </div>
                    </div>
                `;
                hotelContainer.appendChild(card);
            });

            // Botones de acción en tarjetas de hotel
            hotelContainer.querySelectorAll('.btn-check-hotel').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const hotelName = e.target.getAttribute('data-name');
                    if (hotelName === 'Gran Hotel Central') {
                        window.location.href = 'hotel-central.html';
                    } else {
                        alert(`¡Excelente elección! Consultando disponibilidad en tiempo real para: ${hotelName}`);
                    }
                });
            });
        }
    }

    // 2. Efecto de fondo en la barra de navegación al hacer scroll
    const header = document.getElementById('mainHeader');
    window.addEventListener('scroll', () => {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // 3. Lógica del Slider / Carrusel (3 a 5 imágenes)
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    let currentSlide = 0;
    let slideInterval;

    const goToSlide = (index) => {
        if (slides.length === 0) return;
        slides[currentSlide]?.classList.remove('active');
        dots[currentSlide]?.classList.remove('active');
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide]?.classList.add('active');
        dots[currentSlide]?.classList.add('active');
    };

    const nextSlide = () => goToSlide(currentSlide + 1);
    const prevSlide = () => goToSlide(currentSlide - 1);
    const resetInterval = () => { 
        clearInterval(slideInterval); 
        slideInterval = setInterval(nextSlide, 5000); 
    };

    if (slides.length > 0) {
        document.getElementById('carouselNextBtn')?.addEventListener('click', () => { 
            nextSlide(); 
            resetInterval(); 
        });
        document.getElementById('carouselPrevBtn')?.addEventListener('click', () => { 
            prevSlide(); 
            resetInterval(); 
        });
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => { 
                goToSlide(i); 
                resetInterval(); 
            });
        });
        slideInterval = setInterval(nextSlide, 5000);
    }

    // 4. Control del Video Representativo
    const hotelVideo = document.getElementById('hotelVideo');
    const videoOverlay = document.getElementById('videoOverlay');
    const customPlayBtn = document.getElementById('customPlayBtn');

    if (hotelVideo && videoOverlay) {
        const playVideo = () => {
            hotelVideo.play();
            videoOverlay.classList.add('hidden');
        };

        customPlayBtn?.addEventListener('click', playVideo);
        videoOverlay.addEventListener('click', playVideo);

        hotelVideo.addEventListener('pause', () => {
            if (!hotelVideo.seeking) {
                videoOverlay.classList.remove('hidden');
            }
        });

        hotelVideo.addEventListener('ended', () => {
            videoOverlay.classList.remove('hidden');
        });
    }

    // 5. Gestión de Sesión (Login / Perfil)
    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    let userEmail = localStorage.getItem('userEmail') || '';
    
    const loginBtnTrigger = document.getElementById('loginBtnTrigger');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    
    const updateAuthUI = () => {
        if (loginBtnTrigger) loginBtnTrigger.classList.toggle('hidden', isLoggedIn);
        if (userProfileBtn) userProfileBtn.classList.toggle('active', isLoggedIn);
        if (isLoggedIn && userNameDisplay) userNameDisplay.textContent = userEmail.split('@')[0];
    };
    
    updateAuthUI();

    loginBtnTrigger?.addEventListener('click', () => authModal?.classList.add('active'));
    document.getElementById('closeAuthModal')?.addEventListener('click', () => authModal?.classList.remove('active'));
    
    // Cerrar modal al hacer clic en el fondo oscuro
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        isLoggedIn = true;
        userEmail = document.getElementById('email').value;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', userEmail);
        authModal?.classList.remove('active');
        updateAuthUI();
        e.target.reset();
        alert(`¡Bienvenido de nuevo a HotelYa, ${userEmail}!`);
    });

    userProfileBtn?.addEventListener('click', () => {
        if (confirm("¿Deseas cerrar tu sesión actual?")) {
            isLoggedIn = false;
            localStorage.clear();
            updateAuthUI();
        }
    });

    // 6. Motor de búsqueda rápida
    document.getElementById('searchForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.btn-search');
        const locationVal = document.getElementById('location').value.trim();
        const dateVal = document.getElementById('dates').value;
        
        if (!btn) return;
        
        const origText = btn.innerHTML;
        btn.innerHTML = 'Buscando...';
        btn.style.opacity = '0.8';
        
        setTimeout(() => {
            const destinoTexto = locationVal ? locationVal : 'tu zona actual';
            alert(`Buscando alojamientos disponibles en: ${destinoTexto} (Modalidad: ${dateVal}). Mostrando resultados...`);
            btn.innerHTML = origText;
            btn.style.opacity = '1';

            // Desplazamiento automático a la sección de productos
            document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
        }, 600);
    });
});
