import { getHotel } from '../api/catalog';
import { HttpError } from '../api/client';
import type { HotelDetail } from '../types/catalog';
import { element, requiredElement } from '../ui/dom';
import { state } from '../ui/catalog-state';
import { createStayInquiry } from '../ui/stay-inquiry';
import { asset } from '../utils/assets';
import { formatMoney, rateModeLabel } from '../utils/rates';

export function initHotelDetail(): void {
    const container = requiredElement('hotelDetailContainer', 'div');
    const mediaUrls = new Map<string, string>();
    const resolveMedia = (path: string | null) => path ? mediaUrls.get(path) ?? asset(path) : null;
    window.addEventListener('pagehide', () => mediaUrls.forEach(url => URL.revokeObjectURL(url)));

    function section(id: string, title: string, subtitle: string) {
        const wrapper = element('section', 'section-info');
        wrapper.id = id;
        const inner = element('div', 'container');
        const header = element('div', 'section-header');
        header.append(element('h2', 'section-title', title));
        if (subtitle) header.append(element('p', 'section-subtitle', subtitle));
        inner.append(header);
        wrapper.append(inner);
        return { wrapper, inner };
    }
    function image(path: string | null, alt: string, className = '') {
        const url = resolveMedia(path);
        if (!url) return null;
        const node = element('img', className);
        node.src = url;
        node.alt = alt;
        node.loading = 'lazy';
        return node;
    }
    function phoneLink(phone: string | null, label: string, className: string) {
        if (!phone || !/^\+[0-9]{7,15}$/.test(phone)) return null;
        const link = element('a', className, label);
        link.href = `tel:${phone}`;
        return link;
    }
    function row(list: HTMLElement, label: string, value: unknown) {
        if (value === null || value === undefined || value === '') return;
        const item = element('li');
        item.append(element('span', 'editorial-list-title', `${label}: `), document.createTextNode(String(value)));
        list.append(item);
    }
    function render(hotel: HotelDetail) {
        const inquiry = createStayInquiry(hotel);
        document.title = `${hotel.name} | HoteleriasYa`;
        document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = hotel.description;
        document.querySelectorAll('[data-hotel-name]').forEach(node => { node.textContent = hotel.name; });
        document.querySelectorAll<HTMLImageElement>('[data-hotel-logo]').forEach(node => {
            const url = resolveMedia(hotel.logoPath);
            node.hidden = !url;
            if (url) { node.src = url; node.alt = `Logo de ${hotel.name}`; }
        });
        const hero = element('section', 'hero-section catalog-hero');
        const facade = image(hotel.facadePath, `Fachada de ${hotel.name}`, 'carousel-img');
        if (facade) {
            facade.loading = 'eager';
            const carousel = element('div', 'carousel');
            const slide = element('div', 'carousel-slide active');
            slide.append(facade);
            carousel.append(slide);
            hero.append(carousel);
        }
        const heroInner = element('div', 'container hero-content');
        const heroText = element('div', 'hero-text-area');
        heroText.append(element('span', 'hero-tagline', hotel.location),
            element('h1', 'hero-title', hotel.name), element('p', 'hero-subtitle-text', hotel.address));
        heroInner.append(heroText);
        hero.append(heroInner);

        const info = section('informacion', 'Información', hotel.name);
        const split = element('div', 'editorial-info-split');
        const text = element('div', 'editorial-info-text');
        const details = element('ul', 'editorial-list');
        row(details, 'Dirección', hotel.address);
        row(details, 'Teléfono', hotel.phone);
        row(details, 'WhatsApp', hotel.whatsapp);
        row(details, 'Horarios', hotel.openingTime && hotel.closingTime
            ? `${hotel.openingTime.slice(0, 5)} a ${hotel.closingTime.slice(0, 5)}` : hotel.openingHours);
        row(details, 'Entrada y salida', hotel.checkInOutConditions);
        row(details, 'Estacionamiento', hotel.hasParking === null ? 'Por confirmar' : hotel.hasParking ? 'Sí' : 'No');
        text.append(element('p', 'editorial-paragraph', hotel.description), details);
        const logoBox = element('div', 'editorial-info-image');
        const logo = image(hotel.logoPath, `Logo de ${hotel.name}`);
        if (logo) logoBox.append(logo);
        split.append(text, logoBox);
        info.inner.append(split);

        const rooms = section('productos', 'Tipos de habitación', 'Consulta condiciones y disponibilidad directamente con el hotel.');
        const grid = element('div', 'hotel-grid');
        if (hotel.roomTypes.length === 0) state(grid, 'Todavía no hay tipos de habitación registrados.');
        hotel.roomTypes.forEach(type => {
            const card = element('article', 'editorial-room-card');
            const photoBox = element('div', 'editorial-room-image');
            const photo = type.photos[0];
            if (photo) {
                const node = image(photo.path, photo.altText);
                if (node) photoBox.append(node);
            }
            const content = element('div', 'editorial-room-content');
            content.append(element('h3', 'editorial-room-title', type.name),
                element('p', 'editorial-room-desc', type.description));
            if (type.photos.length > 1) {
                const gallery = element('div', 'catalog-gallery');
                type.photos.slice(1).forEach(p => {
                    const node = image(p.path, p.altText);
                    if (node) gallery.append(node);
                });
                content.append(gallery);
            }
            const detailList = element('ul', 'catalog-details');
            const labels = { FEATURE: 'Característica', SERVICE: 'Servicio', RECOMMENDATION: 'Recomendación', PROHIBITION: 'Prohibición' };
            type.details.filter(d => d.kind === 'FEATURE' || d.kind === 'SERVICE')
                .forEach(d => row(detailList, labels[d.kind], d.text));
            content.append(detailList);
            const available = type.availableUnits;
            content.append(element('p', 'catalog-availability', available === null || available === undefined
                ? 'Disponibilidad por confirmar con el hotel.'
                : available === 0 ? 'Sin unidades disponibles actualmente.' : `${available} unidad(es) disponibles actualmente.`));
            if (type.rates.length) {
                content.append(element('h4', 'catalog-rate-title', 'Elige tu estadía'),
                    element('p', 'catalog-rate-hint', 'Selecciona una tarifa para consultar.'));
                const rates = element('ul', 'catalog-rates');
                type.rates.forEach(rate => {
                    const item = element('li');
                    const button = element('button', 'catalog-rate-option'); button.type = 'button';
                    button.setAttribute('aria-haspopup', 'dialog');
                    button.setAttribute('aria-label', `Consultar ${type.name}: ${rateModeLabel(rate)}, ${formatMoney(rate.amount, rate.currency)}`);
                    const caption = element('span', 'catalog-rate-caption');
                    caption.append(element('span', 'catalog-rate-mode', rateModeLabel(rate)),
                        element('span', 'catalog-rate-price', formatMoney(rate.amount, rate.currency)));
                    const arrow = element('span', 'catalog-rate-arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
                    button.append(caption, arrow);
                    button.addEventListener('click', () => inquiry.open(type, rate));
                    item.append(button);
                    rates.append(item);
                });
                content.append(rates);
            } else {
                content.append(element('p', 'editorial-room-desc', 'Consulta tarifas directamente con el hotel.'));
            }
            if (!type.rates.length) {
                const contact = element('button', 'btn btn-primary', 'Consultar estadía'); contact.type = 'button';
                contact.setAttribute('aria-label', `Consultar ${type.name}`); contact.setAttribute('aria-haspopup', 'dialog');
                contact.addEventListener('click', () => inquiry.open(type)); content.append(contact);
            }
            card.append(photoBox, content);
            grid.append(card);
        });
        rooms.inner.append(grid);
        const stay = section('clientes', 'Tu próxima estadía', 'Coordina tu visita directamente con el hotel.');
        stay.wrapper.classList.add('section-audience');
        const audience = element('div', 'audience-grid');
        for (const cardInfo of hotel.stayCards ?? []) {
            const card = element('div', 'audience-card');
            card.append(element('h3', 'audience-card-title', cardInfo.title), element('p', 'audience-card-desc', cardInfo.description));
            audience.append(card);
        }
        stay.inner.append(audience);
        const sections: HTMLElement[] = [hero, info.wrapper, rooms.wrapper];
        if (audience.childElementCount) sections.push(stay.wrapper);
        const videoUrl = resolveMedia(hotel.videoPath);
        if (videoUrl) {
            const videoSection = section('video', 'Video del hotel', hotel.name);
            const box = element('div', 'video-player-box');
            const video = element('video', 'main-video-element');
            video.controls = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.src = videoUrl;
            video.setAttribute('aria-label', `Video de ${hotel.name}`);
            box.append(video);
            videoSection.inner.append(box);
            sections.push(videoSection.wrapper);
        }
        const location = section('ubicacion', 'Cómo llegar', hotel.address);
        const map = element('a', 'btn btn-primary', 'Ver ubicación en el mapa');
        if (hotel.mapUrl?.startsWith('https://')) {
            map.href = hotel.mapUrl;
            map.target = '_blank';
            map.rel = 'noopener noreferrer';
            location.inner.append(map);
        }
        sections.push(location.wrapper);
        sections.push(inquiry.dialog);
        container.replaceChildren(...sections);
        document.querySelectorAll<HTMLAnchorElement>('a[href="#clientes"], a[href="#video"]').forEach(link => {
            link.hidden = !container.querySelector(link.hash);
        });
        const footer = requiredElement('hotelFooterContact', 'div');
        footer.replaceChildren(element('p', 'footer-text', hotel.address));
        const phone = phoneLink(hotel.phone, hotel.phone ?? '', 'contact-value');
        if (phone) footer.append(phone);
    }
    async function loadHotel() {
        state(container, 'Cargando hotel…');
        container.setAttribute('aria-busy', 'true');
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('preview') === '1') {
                const { getOwnerHotel, mediaPreview } = await import('../api/owner');
                const hotel = (await getOwnerHotel()).detail;
                const paths = new Set([hotel.logoPath, hotel.facadePath, hotel.videoPath,
                    ...hotel.roomTypes.flatMap(room => room.photos.map(photo => photo.path))]);
                await Promise.all([...paths].filter((path): path is string => Boolean(path?.startsWith('/api/media/')))
                    .map(async path => { mediaUrls.set(path, await mediaPreview(path)); }));
                render(hotel);
                const banner = element('div', 'catalog-preview-banner', 'Vista previa privada · Estos datos pueden no estar publicados.');
                container.prepend(banner);
                return;
            }
            const id = params.get('id');
            if (id === null) {
                state(container, 'No se ha seleccionado un hotel.');
                return;
            }
            if (!/^[1-9][0-9]*$/.test(id)) { state(container, 'Hotel no encontrado.', loadHotel, true); return; }
            render(await getHotel(id));
        } catch (error) {
            if (error instanceof HttpError && error.status === 401 && new URLSearchParams(window.location.search).get('preview') === '1') { window.location.replace('acceder.html'); return; }
            state(container, error instanceof HttpError && error.status === 404 ? 'Hotel no encontrado.' : 'No pudimos cargar el hotel. Inténtalo de nuevo.', loadHotel, true);
        } finally {
            container.setAttribute('aria-busy', 'false');
        }
    }
    void loadHotel();
}
