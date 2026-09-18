/* 
   ==========================================================================
   Gran Hotel Central - Animaciones Nativas
   ==========================================================================
   Usando IntersectionObserver para animaciones al hacer scroll.
*/

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si el usuario prefiere movimiento reducido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        // Seleccionar todos los elementos a animar
        const animatedElements = document.querySelectorAll('.animate-fade-up, .animate-fade-in');

        // Configurar el observador
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15 // El elemento debe estar 15% visible para animarse
        };

        const scrollObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Dejar de observar una vez que ya es visible
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Iniciar observación
        animatedElements.forEach(el => scrollObserver.observe(el));
    }
});
