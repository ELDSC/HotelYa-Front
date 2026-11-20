interface CarouselOptions {
    autoplay?: boolean;
    onChange?: (index: number, total: number) => void;
}

export function initCarousel({ autoplay = true, onChange }: CarouselOptions = {}): void {
    const slides = document.querySelectorAll('.carousel-slide');
    if (!slides.length) return;

    const dots = document.querySelectorAll('.carousel-dot');
    let currentSlide = 0;
    let slideInterval: ReturnType<typeof setInterval>;

    const goToSlide = (index: number) => {
        slides[currentSlide]?.classList.remove('active');
        slides[currentSlide]?.setAttribute('aria-hidden', 'true');
        dots[currentSlide]?.classList.remove('active');
        dots[currentSlide]?.setAttribute('aria-pressed', 'false');

        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide]?.classList.add('active');
        slides[currentSlide]?.setAttribute('aria-hidden', 'false');
        dots[currentSlide]?.classList.add('active');
        dots[currentSlide]?.setAttribute('aria-pressed', 'true');
        onChange?.(currentSlide, slides.length);
    };

    const nextSlide = () => goToSlide(currentSlide + 1);
    const resetInterval = () => {
        if (!autoplay) return;
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000);
    };

    document.getElementById('carouselNextBtn')?.addEventListener('click', () => {
        nextSlide();
        resetInterval();
    });
    document.getElementById('carouselPrevBtn')?.addEventListener('click', () => {
        goToSlide(currentSlide - 1);
        resetInterval();
    });
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetInterval();
        });
    });
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== currentSlide)));
    dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === currentSlide)));
    resetInterval();
}
