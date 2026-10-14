import '../styles/owner.css';
import { toast } from '../ui/toast';
import { roomRates } from '../ui/room-rates';
import { element, requiredElement } from '../ui/dom';
import { HttpError } from '../api/client';
import { restoreSession, signOut } from '../features/auth';
import * as api from '../api/owner';
import type { OwnerHotel, HotelWrite, RoomWrite } from '../api/owner';
import type { RoomTypeDetail, Photo, RoomDetail, StayCard, DetailKind } from '../types/catalog';
import { asset } from '../utils/assets';
import { busy, hasChanges, markDirty, markSaved, loader, notify, protectChanges, showFailure, watchForm } from '../ui/forms';
const content = requiredElement('panelContent', 'div');
const globalError = requiredElement('panelError', 'div');
const sections = new Map<string, HTMLElement>();
const previews = new Map<string, string>();
let current: OwnerHotel | null = null;
let active = 'dashboard';
let roomForm: HTMLFormElement | null = null;
let roomEditor: HTMLElement;
let roomList: HTMLElement;
let serial = 0;
let settingsPending = false;
protectChanges();
window.addEventListener('pagehide', () => previews.forEach(url => URL.revokeObjectURL(url)));
function button(text: string, action?: () => void, className = 'secondary'): HTMLButtonElement {
    const node = element('button', className, text); node.type = 'button'; if (action) node.addEventListener('click', action); return node;
}
function field(parent: HTMLElement, name: string, label: string, value: unknown = '', type = 'text'): HTMLInputElement | HTMLTextAreaElement {
    const wrapper = element('label', type === 'textarea' ? 'form-field full-width' : 'form-field');
    const caption = element('span'); caption.append(label.replace(/ \*$/, ''));
    if (label.endsWith(' *')) caption.append(' ', element('span', 'required-mark', '*'));
    wrapper.append(caption);
    const input = type === 'textarea' ? element('textarea') : element('input');
    if (input instanceof HTMLInputElement) input.type = type;
    input.id = `field-${++serial}`; input.name = name; input.value = value === null || value === undefined ? '' : String(value);
    wrapper.append(input); parent.append(wrapper); return input;
}
function select(parent: HTMLElement, name: string, label: string, value: string, options: [string, string][]): HTMLSelectElement {
    const wrapper = element('label', 'form-field'); wrapper.append(element('span', '', label));
    const input = element('select'); input.id = `field-${++serial}`; input.name = name;
    for (const [id, text] of options) { const option = element('option', '', text); option.value = id; input.append(option); }
    input.value = value; wrapper.append(input); parent.append(wrapper); return input;
}
function formCard(title: string): { form: HTMLFormElement; grid: HTMLDivElement; status: HTMLDivElement; submit: HTMLButtonElement } {
    const form = element('form', 'editor-card'); if (title) form.append(element('h2', '', title));
    const grid = element('div', 'form-grid'); const status = element('div'); status.setAttribute('aria-live', 'polite');
    const submit = button('Guardar cambios', undefined, 'primary'); submit.type = 'submit';
    const actions = element('div', 'form-actions'); actions.append(submit);
    form.append(grid, status, actions); return { form, grid, status, submit };
}
function view(name: string): HTMLElement {
    const section = element('section', 'panel-section'); section.id = `section-${name}`; sections.set(name, section); content.append(section); return section;
}
function activate(name: string): void {
    active = name; updateHeading(); sections.forEach((section, key) => { section.hidden = key !== name; });
    document.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(node => {
        const selected = node.dataset.section === name; node.classList.toggle('selected', selected); if (selected) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
    });
}
function header(): void {
    updateHeading();
    renderDashboard();
}
function updateHeading(): void {
    const titles: Record<string, string> = { dashboard: current?.detail.name ?? 'Mi hotel', hotel: 'Información', rooms: 'Habitaciones', media: 'Multimedia', content: 'Contenido' };
    requiredElement('hotelHeading', 'h1').textContent = titles[active] ?? 'Mi hotel';
    const link = requiredElement('publicHotelLink', 'a'); link.hidden = !current;
    if (current) link.href = `hotel-central.html?id=${current.detail.id}${current.published ? '' : '&preview=1'}`;
}
function hotelBody(form: HTMLFormElement): HotelWrite {
    const data = new FormData(form);
    const text = (key: string): string => String(data.get(key) ?? '').trim();
    const optional = (key: string): string | null => text(key) || null;
    return {
        name: text('name'), description: text('description'), address: text('address'), location: text('location'),
        phone: optional('phone'), whatsapp: optional('whatsapp'), latitude: current?.detail.latitude ?? null, longitude: current?.detail.longitude ?? null, mapUrl: optional('mapUrl'),
        openingHours: null, openingTime: optional('openingTime'), closingTime: optional('closingTime'), checkInOutConditions: optional('checkInOutConditions'),
        hasParking: current?.detail.hasParking ?? null,
        logoPath: current?.detail.logoPath ?? null, facadePath: current?.detail.facadePath ?? null, videoPath: current?.detail.videoPath ?? null,
    };
}
function renderHotel(section: HTMLElement): void {
    const { form, grid, status, submit } = formCard('');
    const hotel = current?.detail;
    for (const [key, label] of [['name', 'Nombre del hotel *'], ['location', 'Zona o distrito *'], ['address', 'Dirección *'], ['phone', 'Teléfono (formato +51…)'], ['whatsapp', 'WhatsApp (formato +51…)']] as const) {
        const input = field(grid, key, label, hotel?.[key]); input.required = ['name', 'location', 'address'].includes(key); input.maxLength = key === 'address' ? 500 : key === 'phone' || key === 'whatsapp' ? 40 : 200;
    }
    const desc = field(grid, 'description', 'Descripción *', hotel?.description, 'textarea'); desc.required = true; desc.maxLength = 10000;
    const map = field(grid, 'mapUrl', 'URL del lugar', hotel?.mapUrl, 'url'); map.maxLength = 2048;
    map.placeholder = 'https://maps.app.goo.gl/…';
    const opening = field(grid, 'openingTime', 'Hora de apertura', hotel?.openingTime?.slice(0, 5), 'time');
    const closing = field(grid, 'closingTime', 'Hora de cierre', hotel?.closingTime?.slice(0, 5), 'time');
    const validateHours = () => { opening.required = Boolean(closing.value); closing.required = Boolean(opening.value); };
    opening.addEventListener('input', validateHours); closing.addEventListener('input', validateHours); validateHours();
    field(grid, 'checkInOutConditions', 'Condiciones de entrada y salida', hotel?.checkInOutConditions, 'textarea').maxLength = 5000;
    if (!current) submit.textContent = 'Crear mi hotel en borrador';
    form.addEventListener('submit', event => {
        event.preventDefault(); void busy(submit, async () => {
            try {
                const creating = !current; current = await api.saveHotel(hotelBody(form), creating); markSaved(form);
                if (creating) { render(); toast('Hotel creado en borrador.'); }
                else { header(); status.replaceChildren(); toast('Información guardada.'); }
            } catch (error) { showFailure(form, status, error); }
        });
    });
    watchForm(form); section.append(form);
}
async function preview(path: string): Promise<string | null> {
    if (!path.startsWith('/api/media/')) return asset(path);
    if (previews.has(path)) return previews.get(path)!;
    const url = await api.mediaPreview(path); previews.set(path, url); return url;
}
function previewNode(path: string, video: boolean, alt: string): HTMLElement {
    const box = element('div', 'media-preview'); const indicator = loader('Cargando archivo'); box.append(indicator);
    void preview(path).then(url => {
        if (!url || !box.isConnected) return;
        indicator.remove();
        if (video) { const node = element('video'); node.src = url; node.controls = true; node.preload = 'metadata'; node.setAttribute('aria-label', alt); box.append(node); }
        else { const node = element('img'); node.src = url; node.alt = alt; node.loading = 'lazy'; box.append(node); }
    }).catch(() => { box.textContent = 'No pudimos cargar el archivo.'; });
    return box;
}
async function removeMediaFiles(photos: Pick<Photo, 'path'>[]): Promise<boolean> {
    const paths = [...new Set(photos.map(photo => photo.path).filter(path => path.startsWith('/api/media/')))];
    const results = await Promise.allSettled(paths.map(async path => {
        await api.deleteMedia(path.slice('/api/media/'.length));
        const url = previews.get(path); if (url) URL.revokeObjectURL(url); previews.delete(path);
    }));
    return results.every(result => result.status === 'fulfilled');
}
function discardRoom(): boolean { if (roomForm?.dataset.uploading) return false; return !roomForm?.dataset.dirty || confirm('Hay cambios sin guardar en esta habitación. ¿Deseas descartarlos?'); }
function renderRoomList(): void {
    roomList.replaceChildren();
    for (const room of current?.detail.roomTypes ?? []) {
        const card = button('', () => { if (discardRoom()) editRoom(room); }, 'room-list-item');
        card.dataset.roomId = String(room.id);
        card.append(element('strong', '', room.name), element('span', '', room.availableUnits === null || room.availableUnits === undefined ? 'Disponibilidad sin configurar' : `${room.availableUnits} disponibles · ${room.totalUnits} en total`)); roomList.append(card);
    }
    if (!current?.detail.roomTypes.length) roomList.append(element('p', 'muted', 'Todavía no hay tipos de habitación. Crea el primero.'));
}
function editRoom(room?: RoomTypeDetail): void {
    const { form, grid, status, submit } = formCard(room ? '' : 'Nuevo tipo de habitación');
    roomForm = form; roomEditor.replaceChildren(form);
    roomList.querySelectorAll<HTMLButtonElement>('[data-room-id]').forEach(node => {
        const selected = node.dataset.roomId === String(room?.id); node.classList.toggle('selected', selected); node.setAttribute('aria-pressed', String(selected));
    });
    const name = field(grid, 'name', 'Nombre *', room?.name); name.required = true; name.maxLength = 200;
    const order = field(grid, 'displayOrder', 'Orden de presentación', room ? current!.detail.roomTypes.findIndex(item => item.id === room.id) : current!.detail.roomTypes.length, 'number') as HTMLInputElement; order.required = true; order.min = '0'; order.step = '1';
    const desc = field(grid, 'description', 'Descripción *', room?.description, 'textarea'); desc.required = true; desc.maxLength = 10000;
    const total = field(grid, 'totalUnits', 'Cantidad total *', room?.totalUnits, 'number') as HTMLInputElement;
    const available = field(grid, 'availableUnits', 'Disponibles ahora *', room?.availableUnits, 'number') as HTMLInputElement;
    for (const input of [total, available]) { input.required = true; input.min = '0'; input.step = '1'; }
    const unavailable = element('p', 'muted full-width'); grid.append(unavailable);
    const counts = () => { available.max = total.value; unavailable.textContent = total.value && available.value ? `No disponibles: ${Number(total.value) - Number(available.value)}` : ''; }; counts(); total.addEventListener('input', counts); available.addEventListener('input', counts);
    const photos: Photo[] = structuredClone(room?.photos ?? []);
    const details: RoomDetail[] = structuredClone(room?.details ?? []);
    const photoScope = room?.code ?? `room-${crypto.randomUUID()}`;
    const photoSection = element('div', 'editor-subsection'); const photoRows = element('div', 'room-photo-grid');
    photoSection.append(element('h3', '', 'Fotografías'));
    const upload = element('input', 'form-control sr-only'); upload.type = 'file'; upload.name = 'photoUpload'; upload.tabIndex = -1; upload.setAttribute('aria-label', 'Subir fotografías');
    upload.accept = 'image/jpeg,image/png,image/webp'; upload.multiple = true;
    const pickPhotos = button('Subir fotografías', () => upload.click(), 'secondary'); photoSection.append(pickPhotos, upload);
    const uploadStatus = element('div'); uploadStatus.setAttribute('aria-live', 'polite'); photoSection.append(uploadStatus, photoRows);
    const drawPhotos = () => {
        photoRows.replaceChildren();
        photos.forEach((photo, index) => {
            const tile = element('figure', 'room-photo'); tile.append(previewNode(photo.path, false, photo.altText));
            const caption = element('figcaption', 'photo-caption', index === 0 ? 'Portada' : `Foto ${index + 1}`);
            const actions = element('div', 'photo-actions');
            const up = button('←', () => { [photos[index - 1], photos[index]] = [photos[index]!, photos[index - 1]!]; markDirty(form); drawPhotos(); }, 'icon-button'); up.disabled = index === 0; up.setAttribute('aria-label', 'Mover foto arriba'); up.title = 'Mover antes';
            const down = button('→', () => { [photos[index + 1], photos[index]] = [photos[index]!, photos[index + 1]!]; markDirty(form); drawPhotos(); }, 'icon-button'); down.disabled = index === photos.length - 1; down.setAttribute('aria-label', 'Mover foto abajo'); down.title = 'Mover después';
            const remove = button('×', () => { photos.splice(index, 1); markDirty(form); drawPhotos(); }, 'icon-button remove-icon'); remove.setAttribute('aria-label', `Eliminar fotografía ${index + 1}`); remove.title = 'Eliminar fotografía';
            actions.append(up, down, remove); tile.append(caption, actions); photoRows.append(tile);
        });
    };
    drawPhotos();
    upload.addEventListener('change', () => {
        const selected = [...upload.files ?? []]; if (!selected.length) return;
        void busy(pickPhotos, async () => {
            form.dataset.uploading = 'true'; submit.disabled = true;
            try {
                for (const file of selected) {
                    const saved = await api.uploadMedia(file, photoScope);
                    photos.push({ path: saved.path, altText: `Habitación ${name.value || 'del hotel'}` }); markDirty(form); drawPhotos();
                }
                uploadStatus.replaceChildren(); toast('Fotografías subidas. Guarda la habitación para confirmar.');
            } catch (error) { showFailure(form, uploadStatus, error); }
            finally { delete form.dataset.uploading; upload.value = ''; }
        });
    });
    const detailSection = element('div', 'editor-subsection'); const detailRows = element('div', 'detail-list'); const detailHeading = element('div', 'subsection-heading'); detailHeading.append(element('h3', '', 'Características y condiciones')); detailSection.append(detailHeading, detailRows);
    const kinds: [string, string][] = [['FEATURE', 'Característica'], ['SERVICE', 'Servicio'], ['RECOMMENDATION', 'Recomendación'], ['PROHIBITION', 'Prohibición']];
    const drawDetails = () => {
        detailRows.replaceChildren(); details.forEach((detail, i) => {
            const row = element('div', 'inline-editor'); const kind = select(row, `details.${i}.kind`, 'Categoría', detail.kind, kinds); kind.addEventListener('change', () => { detail.kind = kind.value as DetailKind; });
            const text = field(row, `details.${i}.text`, 'Descripción *', detail.text, 'textarea'); text.required = true; text.maxLength = 5000; text.addEventListener('input', () => { detail.text = text.value; });
            const remove = button('×', () => { details.splice(i, 1); markDirty(form); drawDetails(); }, 'icon-button remove-icon'); remove.setAttribute('aria-label', 'Eliminar detalle'); remove.title = 'Eliminar detalle'; row.append(remove); detailRows.append(row);
        });
    };
    drawDetails(); detailHeading.append(button('Añadir detalle', () => { details.push({ kind: 'FEATURE', text: '' }); markDirty(form); drawDetails(); }));
    const rateSection = element('div', 'editor-subsection'); rateSection.append(element('h3', '', 'Tarifas'));
    const rates = roomRates(room?.rates ?? [], () => markDirty(form)); rateSection.append(rates.table);
    form.insertBefore(photoSection, status); form.insertBefore(detailSection, status); form.insertBefore(rateSection, status);
    if (room) {
        const remove = button('Eliminar tipo de habitación', () => {
            if (!confirm(`¿Eliminar ${room.name} y sus fotos asociadas, detalles y tarifas?`)) return;
            void busy(remove, async () => {
                try { current = await api.deleteRoom(room.id); markSaved(form); const cleaned = await removeMediaFiles([...room.photos, ...photos]); renderRoomList(); editRoom(); header(); toast(cleaned ? 'Tipo de habitación eliminado.' : 'Tipo de habitación eliminado. No pudimos eliminar algún archivo asociado.'); }
                catch (error) { showFailure(form, status, error); }
            });
        }, 'danger'); form.querySelector('.form-actions')!.prepend(remove);
    }
    const roomBody = (): RoomWrite => ({ name: name.value.trim(), description: desc.value.trim(), displayOrder: Number(order.value),
        totalUnits: total.value === '' ? null : Number(total.value), availableUnits: available.value === '' ? null : Number(available.value),
        photoScope, photos: photos.map(photo => ({ path: photo.path })), details: details.map(detail => ({ kind: detail.kind, text: detail.text.trim() })), rates: rates.value() });
    form.addEventListener('submit', event => {
        event.preventDefault(); void busy(submit, async () => {
            const body = roomBody();
            try {
                current = await api.saveRoom(body, room?.id); markSaved(form); renderRoomList(); header();
                const updated = room ? current.detail.roomTypes.find(r => r.id === room.id) : current.detail.roomTypes.find(r => !(roomIdsAtOpen.includes(r.id)));
                const removed = (room?.photos ?? []).filter(photo => photo.path.startsWith('/api/media/') && !photos.some(item => item.path === photo.path));
                const cleaned = await removeMediaFiles(removed);
                editRoom(updated); if (!cleaned) toast('Habitación guardada. No pudimos eliminar algún archivo retirado.'); else toast('Tipo de habitación guardado.');
            } catch (error) { showFailure(form, status, error); }
        });
    });
    const roomIdsAtOpen = current!.detail.roomTypes.map(r => r.id);
    watchForm(form, roomBody);
}
function renderRooms(section: HTMLElement): void {
    const layout = element('div', 'rooms-layout'); const aside = element('div', 'room-list'); roomList = element('div'); roomEditor = element('div');
    aside.append(button('+ Nuevo tipo', () => { if (discardRoom()) editRoom(); }, 'primary'), roomList); layout.append(aside, roomEditor); section.append(layout); renderRoomList(); editRoom(current!.detail.roomTypes[0]);
}
function renderMedia(section: HTMLElement): void {
    const form = element('form', 'editor-card hotel-media');
    form.addEventListener('submit', event => event.preventDefault());
    for (const [key, label] of [['logoPath', 'Logo'], ['facadePath', 'Portada'], ['videoPath', 'Video']] as const) {
        const row = element('div', 'hotel-media-row'); row.dataset.media = key;
        const copy = element('div', 'hotel-media-copy'); copy.append(element('h2', '', label),
            element('p', 'muted', key === 'videoPath' ? 'MP4 · Hasta 100 MB' : 'JPEG, PNG o WebP · Hasta 10 MB'));
        const previewBox = element('div', 'identity-preview');
        const controls = element('div', 'compact-actions');
        const input = element('input', 'form-control sr-only'); input.type = 'file'; input.name = key;
        input.accept = key === 'videoPath' ? 'video/mp4' : 'image/jpeg,image/png,image/webp';
        input.setAttribute('aria-label', `Subir ${label.toLowerCase()}`);
        const status = element('div'); status.setAttribute('aria-live', 'polite');
        let pending: File | null = null;
        const upload = button('Subir archivo', () => { if (pending) void save(pending); else input.click(); });
        const choose = button('Elegir otro archivo', () => input.click());
        const remove = button('Eliminar', () => { void save(null); }, 'danger');
        const draw = () => {
            const path = current!.detail[key]; previewBox.replaceChildren();
            if (path) previewBox.append(previewNode(path, key === 'videoPath', label));
            else previewBox.append(element('span', 'muted', 'Sin archivo'));
            upload.textContent = pending ? 'Reintentar' : path ? 'Cambiar archivo' : 'Subir archivo';
            remove.hidden = !path; choose.hidden = !pending;
        };
        const save = async (file: File | null): Promise<void> => {
            const trigger = file ? upload : remove;
            await busy(trigger, async () => {
                let uploaded: string | null = null;
                const previous = current!.detail[key];
                try {
                    if (file) uploaded = (await api.uploadMedia(file)).path;
                    current = await api.saveHotel({ ...current!.detail, [key]: uploaded }, false);
                    pending = null; input.value = ''; markSaved(form); status.replaceChildren(); header();
                    const cleaned = previous && previous !== uploaded
                        ? await removeMediaFiles([{ path: previous }]) : true;
                    toast(cleaned ? `${label} ${file ? key === 'facadePath' ? 'guardada' : 'guardado' : key === 'facadePath' ? 'eliminada' : 'eliminado'} correctamente.`
                        : `${label} guardado. No pudimos eliminar el archivo anterior.`);
                } catch (error) {
                    if (uploaded) await removeMediaFiles([{ path: uploaded }]);
                    showFailure(row, status, error);
                }
            });
            draw();
        };
        input.addEventListener('change', () => {
            pending = input.files?.[0] ?? null; if (pending) void save(pending);
        });
        controls.append(input, upload, choose, remove); row.append(copy, previewBox, controls, status); form.append(row); draw();
    }
    section.append(form);
}
function renderCards(section: HTMLElement): void {
    const { form, grid, status, submit } = formCard('Tu próxima estadía'); grid.className = 'card-editor-list';
    const cards: StayCard[] = structuredClone(current!.detail.stayCards ?? []);
    const draw = () => {
        grid.replaceChildren(); cards.forEach((card, i) => {
            const row = element('div', 'content-card-editor');
            const title = field(row, `stayCards.${i}.title`, 'Título *', card.title); title.required = true; title.maxLength = 200; title.addEventListener('input', () => { card.title = title.value; });
            const desc = field(row, `stayCards.${i}.description`, 'Texto *', card.description, 'textarea'); desc.required = true; desc.maxLength = 5000; desc.addEventListener('input', () => { card.description = desc.value; });
            const actions = element('div', 'compact-actions');
            const up = button('↑', () => { [cards[i - 1], cards[i]] = [cards[i]!, cards[i - 1]!]; markDirty(form); draw(); }); up.disabled = i === 0; up.setAttribute('aria-label', 'Mover tarjeta arriba');
            const down = button('↓', () => { [cards[i + 1], cards[i]] = [cards[i]!, cards[i + 1]!]; markDirty(form); draw(); }); down.disabled = i === cards.length - 1; down.setAttribute('aria-label', 'Mover tarjeta abajo');
            actions.append(up, down, button('Quitar tarjeta', () => { cards.splice(i, 1); markDirty(form); draw(); }, 'danger-link')); row.append(actions); grid.append(row);
        });
    }; draw();
    form.insertBefore(button('+ Añadir tarjeta', () => { cards.push({ title: '', description: '' }); markDirty(form); draw(); }), status);
    form.addEventListener('submit', event => {
        event.preventDefault(); void busy(submit, async () => {
            try { current = await api.saveCards(cards); markSaved(form); header(); status.replaceChildren(); toast('Contenido guardado.'); }
            catch (error) { showFailure(form, status, error); }
        });
    }); watchForm(form, () => cards.map(card => ({ title: card.title.trim(), description: card.description.trim() }))); section.append(form);
}
function settingRow(label: string, checked: boolean, save: (next: boolean) => Promise<OwnerHotel>, publication = false): HTMLElement {
    const row = element('div', 'setting-row'); const copy = element('div', 'setting-copy');
    copy.append(element('span', 'setting-label', label));
    const status = element('div'); status.id = `setting-status-${++serial}`; status.setAttribute('aria-live', 'polite'); copy.append(status);
    const controls = element('div', 'setting-controls'); controls.append(element('span', 'setting-value', checked ? 'Sí' : 'No'));
    const toggle = button('', () => {
        if (settingsPending) return;
        if (publication && hasChanges()) { notify(status, 'Guarda los cambios pendientes antes de cambiar la publicación.', true); return; }
        void busy(toggle, async () => {
            settingsPending = true;
            document.querySelectorAll<HTMLButtonElement>('.setting-switch').forEach(node => { node.disabled = true; });
            status.replaceChildren();
            try { current = await save(!checked); header(); toast(); }
            catch (error) { showFailure(row, status, error); toggle.setAttribute('aria-describedby', status.id); }
            finally {
                settingsPending = false;
                document.querySelectorAll<HTMLButtonElement>('.setting-switch').forEach(node => { node.disabled = false; });
            }
        });
    }, 'setting-switch');
    toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-label', label); toggle.setAttribute('aria-checked', String(checked)); toggle.disabled = settingsPending;
    const track = element('span', 'switch-track'); track.setAttribute('aria-hidden', 'true'); track.append(element('span', 'switch-thumb')); toggle.append(track);
    controls.append(toggle); row.append(copy, controls); return row;
}
function renderDashboard(): void {
    const section = sections.get('dashboard'); if (!section) return;
    section.replaceChildren();
    if (!current) {
        section.append(button('Configurar mi hotel', () => activate('hotel'), 'primary')); return;
    }
    const settings = element('div', 'settings-list');
    settings.append(
        settingRow('Hotel publicado', current.published, next => api.setPublication(next), true),
        settingRow('Estacionamiento', current.detail.hasParking === true, next => api.saveHotel({ ...current!.detail, hasParking: next }, false)),
    );
    section.append(settings);
}
function render(): void {
    content.replaceChildren(); sections.clear(); roomForm = null;
    view('dashboard'); renderHotel(view('hotel'));
    for (const key of ['rooms', 'media', 'content']) {
        const section = view(key);
        if (!current) { section.append(element('div', 'editor-card', 'Primero guarda la información de tu hotel en Mi hotel.')); continue; }
        if (key === 'rooms') renderRooms(section);
        if (key === 'media') renderMedia(section);
        if (key === 'content') renderCards(section);
    }
    if (!current) active = 'hotel';
    header(); activate(active); content.setAttribute('aria-busy', 'false');
}
async function load(): Promise<void> {
    content.setAttribute('aria-busy', 'true'); content.replaceChildren(loader('Cargando panel'));
    try {
        const user = await restoreSession(); if (!user) { window.location.replace('acceder.html'); return; }
        requiredElement('ownerEmail', 'span').textContent = user.email;
        try { current = await api.getOwnerHotel(); }
        catch (error) { if (error instanceof HttpError && error.status === 404) current = null; else throw error; }
        render();
    } catch (error) {
        content.replaceChildren(); const retry = button('Reintentar', () => { void load(); }); content.append(retry); showFailure(content, globalError, error); content.setAttribute('aria-busy', 'false');
    }
}
requiredElement('panelNav', 'nav').addEventListener('click', event => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-section]'); if (target?.dataset.section) activate(target.dataset.section); });
requiredElement('logout', 'button').addEventListener('click', () => {
    if (hasChanges() && !confirm('Hay cambios sin guardar. ¿Deseas cerrar sesión y descartarlos?')) return;
    const logout = requiredElement('logout', 'button');
    void busy(logout, async () => { try { await signOut(); document.querySelectorAll<HTMLFormElement>('form').forEach(markSaved); window.location.href = 'acceder.html'; } catch (error) { showFailure(content, globalError, error); } });
});
void load();
