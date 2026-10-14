export function initCarousel(): void {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    let currentSlide = 0;
    let slideInterval: ReturnType<typeof setInterval>;

    const goToSlide = (index: number) => {
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

}
