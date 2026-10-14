import { getHotels } from '../api/catalog';
import { element, requiredElement } from '../ui/dom';
import { state } from '../ui/catalog-state';
import { asset } from '../utils/assets';

export function initHotelList(): void {
    const hotelContainer = requiredElement('hotelListContainer', 'div');
    async function loadHotels() {
        state(hotelContainer, 'Cargando hoteles…');
        hotelContainer.setAttribute('aria-busy', 'true');
        try {
            const hotels = await getHotels();
            if (hotels.length === 0) {
                state(hotelContainer, 'No hay hoteles registrados.');
                return;
            }
            const cards = hotels.map(hotel => {
                const card = element('article', 'hotel-card');
                const imageBox = element('div', 'hotel-card-image hotel-card-image-logo');
                const imageUrl = asset(hotel.logoPath);
                if (imageUrl) {
                    const image = element('img');
                    image.src = imageUrl;
                    image.alt = hotel.name;
                    image.loading = 'lazy';
                    imageBox.append(image);
                }
                const content = element('div', 'hotel-card-content');
                const header = element('div', 'hotel-header');
                header.append(element('h3', 'hotel-name', hotel.name));
                const footer = element('div', 'hotel-footer');
                const link = element('a', 'btn btn-primary btn-sm', 'Ver hotel');
                link.href = `hotel-central.html?id=${encodeURIComponent(hotel.id)}`;
                footer.append(link);
                content.append(header, element('p', 'hotel-location', hotel.location),
                    element('p', 'hotel-description', hotel.description), footer);
                card.append(imageBox, content);
                return card;
            });
            hotelContainer.replaceChildren(...cards);
        } catch (_error) {
            state(hotelContainer, 'No pudimos cargar los hoteles. Inténtalo de nuevo.', loadHotels, true);
        } finally {
            hotelContainer.setAttribute('aria-busy', 'false');
        }
    }
    void loadHotels();

}
