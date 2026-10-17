import '../styles/admin.css';
import { adminFetch, restoreSession, signOut } from '../features/admin-auth';
import type { HotelSummary } from '../types/catalog';
import { asset } from '../utils/assets';
import { appPath } from '../utils/urls';
import { element, requiredElement } from '../ui/dom';

const rows = requiredElement('hotelRows', 'tbody');
const search = requiredElement('hotelSearch', 'input');
const searchForm = requiredElement('hotelSearchForm', 'form');
const searchSubmit = requiredElement('hotelSearchSubmit', 'button');
const errorBox = requiredElement('adminError', 'div');
const errorMessage = requiredElement('adminErrorMessage', 'span');
const catalogRetry = requiredElement('catalogRetry', 'button');
let hotels: HotelSummary[] = [];
let loading = false;

function showError(message: string): void {
    errorMessage.textContent = message;
    errorBox.hidden = false;
}
function tableState(message: string): void {
    const tr = element('tr');
    const td = element('td', 'admin-table-state', message);
    td.colSpan = 3; tr.append(td); rows.replaceChildren(tr);
}
function hotelLogo(hotel: HotelSummary): HTMLElement {
    const wrapper = element('span', 'admin-hotel-logo');
    const initial = hotel.name.trim().charAt(0).toUpperCase() || 'H';
    const url = asset(hotel.logoPath);
    if (url) {
        const image = element('img');
        image.src = url; image.alt = ''; image.loading = 'lazy';
        image.onerror = () => { wrapper.textContent = initial; };
        wrapper.append(image);
    } else wrapper.textContent = initial;
    return wrapper;
}
function renderRows(): void {
    const term = search.value.trim().toLocaleLowerCase('es');
    const filtered = hotels.filter(hotel => `${hotel.name} ${hotel.location}`.toLocaleLowerCase('es').includes(term));
    if (!filtered.length) {
        tableState(hotels.length ? 'No se encontraron hoteles.' : 'No hay hoteles publicados.');
        return;
    }
    rows.replaceChildren(...filtered.map(hotel => {
        const tr = element('tr');
        const nameCell = element('td');
        const hotelCell = element('div', 'admin-hotel-cell');
        hotelCell.append(hotelLogo(hotel), element('span', '', hotel.name));
        nameCell.append(hotelCell);
        const locationCell = element('td', 'admin-location', hotel.location || 'Sin ubicación');
        const actionCell = element('td', 'admin-action');
        const link = element('a', 'secondary admin-view-link', 'Ver ficha ↗');
        link.href = `${appPath('hotel-central.html')}?id=${encodeURIComponent(hotel.id)}`;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `Ver ficha de ${hotel.name}`);
        actionCell.append(link); tr.append(nameCell, locationCell, actionCell);
        return tr;
    }));
}
async function loadHotels(): Promise<void> {
    if (loading) return;
    loading = true; catalogRetry.disabled = true; errorBox.hidden = true;
    search.disabled = true; searchSubmit.disabled = true; tableState('Cargando hoteles…');
    try {
        hotels = await (await adminFetch('/admin/hotels')).json() as HotelSummary[];
        renderRows();
    } catch {
        showError('No se pudieron cargar los hoteles. Inténtalo de nuevo.');
        tableState('Listado no disponible.');
    } finally { loading = false; search.disabled = false; searchSubmit.disabled = false; catalogRetry.disabled = false; }
}
searchForm.addEventListener('submit', event => { event.preventDefault(); renderRows(); });
catalogRetry.addEventListener('click', () => { void loadHotels(); });
const shell = requiredElement('adminShell', 'div');
const gate = requiredElement('adminGate', 'div');
const gateMessage = requiredElement('adminGateMessage', 'p');
const retry = requiredElement('adminGateRetry', 'button');
function goToLogin(): void {
    shell.hidden = true; gate.hidden = false;
    window.location.replace(appPath('admin/acceder/'));
}
window.addEventListener('admin-session-ended', goToLogin);
async function start(): Promise<void> {
    retry.hidden = true; gateMessage.textContent = 'Comprobando sesión…';
    try {
        if (!await restoreSession()) { goToLogin(); return; }
        gate.hidden = true; shell.hidden = false;
        await loadHotels();
    } catch {
        shell.hidden = true; gate.hidden = false;
        gateMessage.textContent = 'No se pudo comprobar la sesión. Revisa la conexión e inténtalo de nuevo.';
        retry.hidden = false;
    }
}
retry.addEventListener('click', () => { void start(); });
const logout = requiredElement('adminLogout', 'button');
logout.addEventListener('click', () => {
    logout.disabled = true;
    void signOut().then(goToLogin).catch(() => { showError('No se pudo cerrar la sesión. Inténtalo de nuevo.'); })
        .finally(() => { logout.disabled = false; });
});
void start();
