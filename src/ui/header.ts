export function initHeader(): void {
    const header = document.getElementById('mainHeader');
    window.addEventListener('scroll', () => {
        header?.classList.toggle('scrolled', window.scrollY > 50);
    });
}
