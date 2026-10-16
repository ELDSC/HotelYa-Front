import { getHotels } from '../api/catalog';
import type { HotelSummary } from '../types/catalog';
import { element, requiredElement } from '../ui/dom';
import { state } from '../ui/catalog-state';
import { asset } from '../utils/assets';
import { filterHotels } from '../utils/hotel-search';

function hotelCard(hotel: HotelSummary): HTMLElement {
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
    content.append(header, element('p', 'hotel-code', `Código: ${hotel.code}`),
        element('p', 'hotel-location', hotel.location),
        element('p', 'hotel-description', hotel.description), footer);
    card.append(imageBox, content);
    return card;
}

export function initHotelList(): void {
    const container = requiredElement('hotelListContainer', 'div');
    const form = requiredElement('catalogSearchForm', 'form');
    const fields = requiredElement('catalogSearchFields', 'fieldset');
    const queryInput = requiredElement('catalogQuery', 'input');
    const searchButton = requiredElement('catalogSearchButton', 'button');
    const clearButton = requiredElement('catalogClearButton', 'button');
    const staticTab = requiredElement('catalogStaticTab', 'button');
    const dynamicTab = requiredElement('catalogDynamicTab', 'button');
    const panel = requiredElement('catalogSearchPanel', 'div');
    const hint = requiredElement('catalogSearchHint', 'p');
    const count = requiredElement('catalogResultCount', 'p');
    const tabs = [staticTab, dynamicTab];
    let mode: 'static' | 'dynamic' = 'static';
    let hotels: HotelSummary[] = [];
    let loaded = false;
    let appliedQuery = '';

    function renderHotels(): void {
        if (!loaded) return;
        if (hotels.length === 0) {
            count.hidden = true;
            state(container, 'No hay hoteles registrados.');
            return;
        }
        const matches = filterHotels(hotels, appliedQuery);
        count.hidden = false;
        const amount = matches.length;
        count.textContent = amount === 1 ? '1 hotel encontrado' : `${amount} hoteles encontrados`;
        if (!amount) {
            count.textContent += '. No encontramos hoteles con esos criterios';
            container.replaceChildren(element('p', 'catalog-state', 'No encontramos hoteles con esos criterios'));
        } else {
            container.replaceChildren(...matches.map(hotelCard));
        }
    }

    function applySearch(): void {
        appliedQuery = queryInput.value;
        renderHotels();
    }

    function selectMode(tab: HTMLButtonElement): void {
        mode = tab === staticTab ? 'static' : 'dynamic';
        for (const item of tabs) {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
        }
        panel.setAttribute('aria-labelledby', tab.id);
        searchButton.hidden = mode === 'dynamic';
        hint.textContent = mode === 'static' ? 'Escribe el nombre o código y pulsa Buscar.'
            : 'Los resultados se actualizan mientras escribes.';
        if (mode === 'dynamic') applySearch();
    }

    for (const tab of tabs) {
        tab.addEventListener('click', () => selectMode(tab));
        tab.addEventListener('keydown', event => {
            let target: HTMLButtonElement;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                target = tab === staticTab ? dynamicTab : staticTab;
            } else if (event.key === 'Home') target = staticTab;
            else if (event.key === 'End') target = dynamicTab;
            else return;
            event.preventDefault();
            selectMode(target);
            target.focus();
        });
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        applySearch();
    });
    queryInput.addEventListener('input', () => { if (mode === 'dynamic') applySearch(); });
    clearButton.addEventListener('click', () => {
        queryInput.value = '';
        applySearch();
        queryInput.focus();
    });

    async function loadHotels(): Promise<void> {
        loaded = false;
        fields.disabled = true;
        count.hidden = true;
        state(container, 'Cargando hoteles…');
        container.setAttribute('aria-busy', 'true');
        try {
            hotels = await getHotels();
            loaded = true;
            fields.disabled = false;
            renderHotels();
        } catch (_error) {
            state(container, 'No pudimos cargar los hoteles. Inténtalo de nuevo.', loadHotels, true);
        } finally {
            container.setAttribute('aria-busy', 'false');
        }
    }
    void loadHotels();
}
