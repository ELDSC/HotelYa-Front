import '../styles/admin.css';
import { getHotel, getHotels } from '../api/catalog';
import type { HotelDetail, HotelSummary } from '../types/catalog';
import { asset } from '../utils/assets';
import { element, requiredElement } from '../ui/dom';

const rows = requiredElement('hotelRows', 'tbody');
const search = requiredElement('hotelSearch', 'input');
const locationFilter = requiredElement('locationFilter', 'select');
const errorBox = requiredElement('adminError', 'div');
const refreshButton = requiredElement('refreshButton', 'button');
const detailContainer = requiredElement('hotelDetail', 'div');
const detailTitle = requiredElement('detailTitle', 'h2');
const detailBadge = requiredElement('detailBadge', 'span');
let hotels: HotelSummary[] = [];
let selectedId: number | null = null;
let detailRequest = 0;
let loading = false;

function setApiStatus(online: boolean, message: string): void {
    const dot = requiredElement('apiStatusDot', 'span');
    dot.classList.toggle('online', online);
    dot.classList.toggle('offline', !online);
    requiredElement('apiStatusText', 'span').textContent = message;
    requiredElement('sidebarApiStatus', 'strong').textContent = online ? 'Conectada' : 'Sin conexión';
    const metric = requiredElement('apiMetric', 'strong');
    metric.textContent = online ? 'Conectada' : 'Sin conexión';
    metric.classList.toggle('is-online', online);
    metric.classList.toggle('is-offline', !online);
    requiredElement('apiMetricHint', 'p').textContent = online ? 'GET /api/hotels respondió correctamente' : 'No se pudo consultar GET /api/hotels';
}

function showError(message: string): void {
    errorBox.textContent = message;
    errorBox.hidden = false;
}
function clearError(): void { errorBox.hidden = true; errorBox.textContent = ''; }
function hotelLogo(path: string | null, name: string, className = 'admin-hotel-logo'): HTMLElement {
    const wrapper = element('span', className);
    const url = asset(path);
    if (url) {
        const image = element('img');
        image.src = url;
        image.alt = '';
        image.loading = 'lazy';
        image.onerror = () => { wrapper.replaceChildren(document.createTextNode(name.trim().charAt(0).toUpperCase() || 'H')); };
        wrapper.append(image);
    } else wrapper.textContent = name.trim().charAt(0).toUpperCase() || 'H';
    return wrapper;
}
function filteredHotels(): HotelSummary[] {
    const term = search.value.trim().toLocaleLowerCase('es');
    const location = locationFilter.value;
    return hotels.filter(hotel => (!term || `${hotel.name} ${hotel.location} ${hotel.description ?? ''}`.toLocaleLowerCase('es').includes(term))
        && (!location || hotel.location === location));
}
function renderRows(): void {
    const filtered = filteredHotels();
    requiredElement('visibleCount', 'span').textContent = `${filtered.length} ${filtered.length === 1 ? 'hotel' : 'hoteles'}`;
    requiredElement('listFooterText', 'span').textContent = filtered.length === hotels.length
        ? `Mostrando ${hotels.length} alojamientos publicados`
        : `Mostrando ${filtered.length} de ${hotels.length} alojamientos`;
    if (!filtered.length) {
        const tr = element('tr');
        const td = element('td', 'admin-table-state', hotels.length ? 'No hay resultados para esos filtros.' : 'No hay hoteles publicados en el catálogo.');
        td.colSpan = 3; tr.append(td); rows.replaceChildren(tr); return;
    }
    rows.replaceChildren(...filtered.map(hotel => {
        const tr = element('tr', `admin-hotel-row${hotel.id === selectedId ? ' selected' : ''}`);
        tr.tabIndex = 0;
        tr.setAttribute('aria-label', `Ver detalles de ${hotel.name}`);
        tr.setAttribute('aria-selected', String(hotel.id === selectedId));
        const nameCell = element('td');
        const hotelCell = element('div', 'admin-hotel-cell');
        hotelCell.append(hotelLogo(hotel.logoPath, hotel.name));
        const copy = element('span');
        copy.append(element('span', 'admin-hotel-name', hotel.name), element('span', 'admin-hotel-id', `ID #${hotel.id}`));
        hotelCell.append(copy); nameCell.append(hotelCell);
        const locationCell = element('td', 'admin-location-cell', hotel.location || 'Sin ubicación');
        const actionCell = element('td');
        const button = element('button', 'admin-view-button', 'Ver ficha ↗');
        button.type = 'button'; button.setAttribute('aria-label', `Ver ficha de ${hotel.name}`);
        button.addEventListener('click', event => { event.stopPropagation(); void selectHotel(hotel.id); });
        actionCell.append(button); tr.append(nameCell, locationCell, actionCell);
        tr.addEventListener('click', () => { void selectHotel(hotel.id); });
        tr.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void selectHotel(hotel.id); } });
        return tr;
    }));
}
function renderLocationFilter(): void {
    const previous = locationFilter.value;
    const locations = [...new Set(hotels.map(hotel => hotel.location?.trim()).filter((location): location is string => Boolean(location)))].sort((a, b) => a.localeCompare(b, 'es'));
    locationFilter.replaceChildren(new Option('Todas las ubicaciones', ''));
    for (const location of locations) locationFilter.append(new Option(location, location));
    locationFilter.value = locations.includes(previous) ? previous : '';
}
function renderStats(): void {
    requiredElement('hotelCount', 'strong').textContent = String(hotels.length);
    requiredElement('locationCount', 'strong').textContent = String(new Set(hotels.map(hotel => hotel.location?.trim()).filter(Boolean)).size);
}
function detailField(label: string, value: string): HTMLElement {
    const row = element('div'); row.append(element('dt', '', label), element('dd', '', value || 'No especificado')); return row;
}
function renderHotelDetail(hotel: HotelDetail): void {
    detailTitle.textContent = hotel.name;
    detailBadge.textContent = 'Publicado';
    detailContainer.replaceChildren();
    const cover = element('div', 'admin-detail-cover');
    cover.append(hotelLogo(hotel.logoPath, hotel.name, 'admin-detail-logo'));
    const coverCopy = element('div');
    coverCopy.append(element('h3', '', hotel.name), element('p', '', `ID de catálogo #${hotel.id}`));
    cover.append(coverCopy);
    detailContainer.append(cover);
    if (hotel.description?.trim()) detailContainer.append(element('p', 'admin-detail-description', hotel.description));
    const fields = element('dl', 'admin-detail-fields');
    fields.append(detailField('Ubicación', hotel.location), detailField('Dirección', hotel.address), detailField('Teléfono', hotel.phone ?? ''),
        detailField('Horario', hotel.openingTime && hotel.closingTime ? `${hotel.openingTime} – ${hotel.closingTime}` : hotel.openingHours ?? ''),
        detailField('Estacionamiento', hotel.hasParking === null ? 'No especificado' : hotel.hasParking ? 'Disponible' : 'No disponible'));
    detailContainer.append(fields);
    const roomsSection = element('section', 'admin-detail-section');
    roomsSection.append(element('h3', '', `Tipos de habitación (${hotel.roomTypes.length})`));
    const roomList = element('div', 'admin-room-list');
    if (!hotel.roomTypes.length) roomList.append(element('p', 'admin-muted', 'Este hotel no tiene tipos de habitación publicados.'));
    for (const room of hotel.roomTypes) {
        const item = element('article', 'admin-room-item');
        item.append(element('strong', '', room.name), element('span', '', `${room.availableUnits ?? '—'} disponibles · ${room.totalUnits ?? '—'} unidades totales`));
        roomList.append(item);
    }
    roomsSection.append(roomList); detailContainer.append(roomsSection);
    if (hotel.stayCards.length) {
        const cardsSection = element('section', 'admin-detail-section');
        cardsSection.append(element('h3', '', 'Información destacada'));
        for (const card of hotel.stayCards) {
            const item = element('article', 'admin-stay-card');
            item.append(element('strong', '', card.title), element('p', '', card.description)); cardsSection.append(item);
        }
        detailContainer.append(cardsSection);
    }
    const publicLink = element('a', 'admin-public-link', 'Abrir ficha pública ↗');
    publicLink.href = `/hotel-central.html?id=${encodeURIComponent(hotel.id)}`;
    publicLink.target = '_blank'; publicLink.rel = 'noopener noreferrer';
    detailContainer.append(publicLink);
}
async function selectHotel(id: number): Promise<void> {
    selectedId = id;
    renderRows();
    const request = ++detailRequest;
    const summary = hotels.find(hotel => hotel.id === id);
    detailTitle.textContent = summary?.name ?? 'Detalle del hotel';
    detailBadge.textContent = 'Cargando';
    detailContainer.replaceChildren();
    const loading = element('div', 'admin-table-state'); loading.append(element('span', 'admin-loader'), document.createTextNode(' Consultando GET /api/hotels/' + id + '…'));
    detailContainer.append(loading);
    try {
        const hotel = await getHotel(id);
        if (request !== detailRequest) return;
        renderHotelDetail(hotel);
    } catch {
        if (request !== detailRequest) return;
        detailBadge.textContent = 'Error';
        detailContainer.replaceChildren(element('p', 'admin-detail-error', 'No se pudo cargar la ficha completa. Comprueba que el backend esté activo e inténtalo de nuevo.'));
    }
}
async function loadHotels(): Promise<void> {
    if (loading) return;
    loading = true; refreshButton.disabled = true; refreshButton.textContent = 'Actualizando…'; clearError();
    rows.replaceChildren();
    const tr = element('tr'); const td = element('td', 'admin-table-state'); td.colSpan = 3;
    td.append(element('span', 'admin-loader'), document.createTextNode(' Consultando el catálogo…')); tr.append(td); rows.append(tr);
    try {
        hotels = await getHotels();
        setApiStatus(true, 'API conectada');
        renderStats(); renderLocationFilter(); renderRows();
        requiredElement('lastUpdated', 'span').textContent = `Actualizado ${new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
        if (hotels.length && !hotels.some(hotel => hotel.id === selectedId)) await selectHotel(hotels[0]!.id);
        else if (!hotels.length) {
            selectedId = null; detailTitle.textContent = 'Sin hoteles publicados'; detailBadge.textContent = 'Vacío';
            detailContainer.replaceChildren(element('p', 'admin-muted', 'Cuando existan alojamientos publicados aparecerán aquí.'));
        } else renderRows();
    } catch {
        setApiStatus(false, 'API sin conexión');
        showError('No se pudo consultar el catálogo. Verifica que el backend esté ejecutándose y que VITE_API_BASE_URL apunte al origen correcto.');
        rows.replaceChildren();
        const tr = element('tr'); const td = element('td', 'admin-table-state', 'No fue posible cargar los hoteles.'); td.colSpan = 3; tr.append(td); rows.append(tr);
        requiredElement('hotelCount', 'strong').textContent = '—'; requiredElement('locationCount', 'strong').textContent = '—';
        requiredElement('listFooterText', 'span').textContent = 'Error de conexión';
    } finally {
        loading = false; refreshButton.disabled = false; const icon = element('span', '', '↻'); icon.setAttribute('aria-hidden', 'true'); refreshButton.replaceChildren(icon, document.createTextNode(' Actualizar'));
    }
}

search.addEventListener('input', renderRows);
locationFilter.addEventListener('change', renderRows);
refreshButton.addEventListener('click', () => { void loadHotels(); });
document.querySelector('[data-scroll-hotels]')?.addEventListener('click', event => {
    event.preventDefault(); requiredElement('hoteles', 'section').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
void loadHotels();
