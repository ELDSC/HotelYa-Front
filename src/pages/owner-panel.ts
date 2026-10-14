import '../styles/owner.css';
import { element, requiredElement } from '../ui/dom';
import { HttpError } from '../api/client';
import { restoreSession, signOut } from '../features/auth';
import * as api from '../api/owner';
import type { OwnerHotel, HotelWrite, RoomWrite, MediaInfo } from '../api/owner';
import type { RoomTypeDetail, Photo, RoomDetail, RateInfo, StayCard, DetailKind, RateMode } from '../types/catalog';
import { asset } from '../utils/assets';
import { busy, hasChanges, markDirty, markSaved, loader, notify, protectChanges, showFailure, watchForm } from '../ui/forms';
const content = requiredElement('panelContent', 'div');
const globalMessage = requiredElement('panelMessage', 'div');
const sections = new Map<string, HTMLElement>();
const previews = new Map<string, string>();
let current: OwnerHotel | null = null;
let files: MediaInfo[] = [];
let active = 'dashboard';
let roomForm: HTMLFormElement | null = null;
let roomEditor: HTMLElement;
let roomList: HTMLElement;
let mediaGallery: HTMLElement;
let hotelMediaForm: HTMLFormElement | null = null;
let serial = 0;
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
    form.append(grid, status, actions); watchForm(form); return { form, grid, status, submit };
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
    const badge = requiredElement('publicationBadge', 'span'); badge.textContent = current?.published ? 'Publicado' : 'Borrador'; badge.classList.toggle('published', Boolean(current?.published));
    renderDashboard();
}
function updateHeading(): void {
    const titles: Record<string, string> = { dashboard: current?.detail.name ?? 'Mi hotel', hotel: 'Información', rooms: 'Habitaciones', media: 'Multimedia', content: 'Contenido' };
    requiredElement('hotelHeading', 'h1').textContent = titles[active] ?? 'Mi hotel';
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
                if (creating) { render(); notify(globalMessage, 'Tu hotel está creado en borrador. Añade habitaciones y archivos antes de publicarlo.'); }
                else { header(); notify(status, 'Información guardada.'); }
            } catch (error) { showFailure(form, status, error); }
        });
    });
    section.append(form);
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
    }).catch(() => { box.textContent = 'No pudimos cargar la imagen.'; });
    return box;
}
function discardRoom(): boolean { return !roomForm?.dataset.dirty || confirm('Hay cambios sin guardar en esta habitación. ¿Deseas descartarlos?'); }
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
    const rates: RateInfo[] = structuredClone(room?.rates ?? []);
    const photoSection = element('div', 'editor-subsection'); const photoRows = element('div', 'photo-editor');
    photoSection.append(element('h3', '', 'Fotografías'), photoRows);
    const drawPhotos = () => {
        photoRows.replaceChildren();
        photos.forEach((photo, index) => {
            const row = element('div', 'photo-row'); row.append(previewNode(photo.path, false, photo.altText));
            const controls = element('div'); const input = field(controls, `photos.${index}.altText`, 'Texto alternativo *', photo.altText); input.required = true; input.maxLength = 300; input.addEventListener('input', () => { photo.altText = input.value; });
            const actions = element('div', 'compact-actions');
            const up = button('↑', () => { [photos[index - 1], photos[index]] = [photos[index]!, photos[index - 1]!]; markDirty(form); drawPhotos(); }); up.disabled = index === 0; up.setAttribute('aria-label', 'Mover foto arriba');
            const down = button('↓', () => { [photos[index + 1], photos[index]] = [photos[index]!, photos[index + 1]!]; markDirty(form); drawPhotos(); }); down.disabled = index === photos.length - 1; down.setAttribute('aria-label', 'Mover foto abajo');
            actions.append(up, down, button('Quitar foto', () => { photos.splice(index, 1); markDirty(form); drawPhotos(); }, 'danger-link')); controls.append(actions); row.append(controls); photoRows.append(row);
        });
    };
    drawPhotos();
    const photoSelect = select(photoSection, 'photoPicker', 'Añadir desde mis archivos', '', [['', 'Selecciona una imagen'], ...files.filter(file => file.contentType.startsWith('image/')).map(file => [file.path, file.originalName] as [string, string])]);
    photoSection.append(button('Añadir fotografía', () => { if (!photoSelect.value) return; photos.push({ path: photoSelect.value, altText: `Habitación ${name.value || 'del hotel'}` }); markDirty(form); drawPhotos(); }));
    const upload = field(photoSection, 'photoUpload', 'O subir una imagen nueva', '', 'file') as HTMLInputElement; upload.accept = 'image/jpeg,image/png,image/webp';
    upload.addEventListener('change', () => {
        const file = upload.files?.[0]; if (!file) return; upload.disabled = true; submit.disabled = true;
        const indicator = loader('Subiendo imagen'); status.replaceChildren(indicator);
        void api.uploadMedia(file).then(saved => { files.push(saved); photos.push({ path: saved.path, altText: `Habitación ${name.value || 'del hotel'}` }); markDirty(form); drawPhotos(); renderMediaGallery(); notify(status, 'Imagen subida. Guarda la habitación para incorporarla a la ficha.'); })
            .catch(error => showFailure(form, status, error)).finally(() => { indicator.remove(); upload.disabled = false; submit.disabled = false; upload.value = ''; });
    });
    const detailSection = element('div', 'editor-subsection'); const detailRows = element('div'); detailSection.append(element('h3', '', 'Características y condiciones'), detailRows);
    const kinds: [string, string][] = [['FEATURE', 'Característica'], ['SERVICE', 'Servicio'], ['RECOMMENDATION', 'Recomendación'], ['PROHIBITION', 'Prohibición']];
    const drawDetails = () => {
        detailRows.replaceChildren(); details.forEach((detail, i) => {
            const row = element('div', 'inline-editor'); const kind = select(row, `details.${i}.kind`, 'Categoría', detail.kind, kinds); kind.addEventListener('change', () => { detail.kind = kind.value as DetailKind; });
            const text = field(row, `details.${i}.text`, 'Descripción *', detail.text, 'textarea'); text.required = true; text.maxLength = 5000; text.addEventListener('input', () => { detail.text = text.value; });
            row.append(button('Quitar', () => { details.splice(i, 1); markDirty(form); drawDetails(); }, 'danger-link')); detailRows.append(row);
        });
    };
    drawDetails(); detailSection.append(button('Añadir detalle', () => { details.push({ kind: 'FEATURE', text: '' }); markDirty(form); drawDetails(); }));
    const rateSection = element('div', 'editor-subsection'); const rateRows = element('div'); rateSection.append(element('h3', '', 'Tarifas'), rateRows);
    const drawRates = () => {
        rateRows.replaceChildren(); rates.forEach((rate, i) => {
            const row = element('div', 'rate-editor'); const mode = select(row, `rates.${i}.mode`, 'Modalidad', rate.mode, [['HOUR', 'Por hora'], ['PACKAGE', 'Paquete de horas'], ['NIGHT', 'Por noche']]);
            mode.addEventListener('change', () => { rate.mode = mode.value as RateMode; rate.packageHours = rate.mode === 'PACKAGE' ? 3 : null; rate.additionalHourAmount = rate.mode === 'PACKAGE' ? 0 : null; drawRates(); });
            const amount = field(row, `rates.${i}.amount`, 'Importe *', rate.amount, 'number') as HTMLInputElement; amount.required = true; amount.min = '0.01'; amount.step = '0.01'; amount.addEventListener('input', () => { rate.amount = Number(amount.value); });
            const currency = field(row, `rates.${i}.currency`, 'Moneda *', rate.currency) as HTMLInputElement; currency.required = true; currency.maxLength = 3; currency.pattern = '[A-Z]{3}'; currency.addEventListener('input', () => { rate.currency = currency.value; });
            if (rate.mode === 'PACKAGE') {
                const hours = field(row, `rates.${i}.packageHours`, 'Duración (horas) *', rate.packageHours, 'number') as HTMLInputElement; hours.required = true; hours.min = '1'; hours.step = '1'; hours.addEventListener('input', () => { rate.packageHours = Number(hours.value); });
                const extra = field(row, `rates.${i}.additionalHourAmount`, 'Hora adicional *', rate.additionalHourAmount, 'number') as HTMLInputElement; extra.required = true; extra.min = '0'; extra.step = '0.01'; extra.addEventListener('input', () => { rate.additionalHourAmount = Number(extra.value); });
            }
            const simulated = select(row, `rates.${i}.simulated`, 'Tipo de tarifa', String(rate.simulated), [['false', 'Tarifa del hotel'], ['true', 'Tarifa de demostración']]); simulated.addEventListener('change', () => { rate.simulated = simulated.value === 'true'; });
            row.append(button('Quitar tarifa', () => { rates.splice(i, 1); markDirty(form); drawRates(); }, 'danger-link')); rateRows.append(row);
        });
    };
    drawRates(); rateSection.append(button('Añadir tarifa', () => { rates.push({ mode: 'HOUR', amount: 0, currency: 'PEN', packageHours: null, additionalHourAmount: null, simulated: false }); markDirty(form); drawRates(); }));
    form.insertBefore(photoSection, status); form.insertBefore(detailSection, status); form.insertBefore(rateSection, status);
    if (room) {
        const remove = button('Eliminar tipo de habitación', () => {
            if (!confirm(`¿Eliminar ${room.name} y sus fotos asociadas, detalles y tarifas?`)) return;
            void busy(remove, async () => {
                try { current = await api.deleteRoom(room.id); markSaved(form); renderRoomList(); editRoom(); header(); notify(globalMessage, 'Tipo de habitación eliminado. Los archivos siguen disponibles en Multimedia.'); }
                catch (error) { showFailure(form, status, error); }
            });
        }, 'danger'); form.append(remove);
    }
    form.addEventListener('submit', event => {
        event.preventDefault(); void busy(submit, async () => {
            const body: RoomWrite = { name: name.value, description: desc.value, displayOrder: Number(order.value), totalUnits: total.value === '' ? null : Number(total.value), availableUnits: available.value === '' ? null : Number(available.value), photos, details, rates };
            try {
                current = await api.saveRoom(body, room?.id); markSaved(form); renderRoomList(); header();
                const updated = room ? current.detail.roomTypes.find(r => r.id === room.id) : current.detail.roomTypes.find(r => !(roomIdsAtOpen.includes(r.id)));
                editRoom(updated); notify(roomEditor.querySelector('[aria-live]') as HTMLElement, 'Tipo de habitación guardado.');
            } catch (error) { showFailure(form, status, error); }
        });
    });
    const roomIdsAtOpen = current!.detail.roomTypes.map(r => r.id);
}
function renderRooms(section: HTMLElement): void {
    const layout = element('div', 'rooms-layout'); const aside = element('div', 'room-list'); roomList = element('div'); roomEditor = element('div');
    aside.append(button('+ Nuevo tipo', () => { if (discardRoom()) editRoom(); }, 'primary'), roomList); layout.append(aside, roomEditor); section.append(layout); renderRoomList(); editRoom(current!.detail.roomTypes[0]);
}
function mediaSelectors(form: HTMLFormElement): void {
    for (const key of ['logoPath', 'facadePath', 'videoPath'] as const) {
        const input = form.querySelector<HTMLSelectElement>(`[name="${key}"]`)!; const value = input.value;
        input.querySelectorAll('[data-uploaded]').forEach(node => node.remove());
        for (const file of files.filter(file => file.contentType.startsWith(key === 'videoPath' ? 'video/' : 'image/'))) {
            const option = element('option', '', file.originalName); option.value = file.path; option.dataset.uploaded = 'true'; input.append(option);
        }
        input.value = value;
    }
}
function renderMediaGallery(): void {
    if (!mediaGallery) return;
    document.querySelectorAll<HTMLSelectElement>('[name="photoPicker"]').forEach(input => {
        const selected = input.value; input.replaceChildren();
        const empty = element('option', '', 'Selecciona una imagen'); empty.value = ''; input.append(empty);
        for (const file of files.filter(item => item.contentType.startsWith('image/'))) { const option = element('option', '', file.originalName); option.value = file.path; input.append(option); }
        input.value = selected;
    });
    mediaGallery.replaceChildren(); if (hotelMediaForm) mediaSelectors(hotelMediaForm);
    for (const file of files) {
        const card = element('article', 'media-card'); card.append(previewNode(file.path, file.contentType.startsWith('video/'), file.originalName), element('strong', '', file.originalName), element('span', 'muted', `${(file.byteSize / 1024 / 1024).toFixed(1)} MB`));
        const remove = button('Eliminar archivo', () => {
            if (!confirm(`¿Eliminar definitivamente ${file.originalName}? Primero debe estar retirado de la ficha y de las habitaciones.`)) return;
            void busy(remove, async () => {
                try { await api.deleteMedia(file.id); files = files.filter(item => item.id !== file.id); const url = previews.get(file.path); if (url) URL.revokeObjectURL(url); previews.delete(file.path); renderMediaGallery(); notify(globalMessage, 'Archivo eliminado.'); }
                catch (error) { showFailure(card, globalMessage, error); }
            });
        }, 'danger-link'); card.append(remove); mediaGallery.append(card);
    }
    if (!files.length) mediaGallery.append(element('p', 'muted', 'Aún no has subido archivos nuevos. Las fotos originales se conservan en la ficha y en cada tipo.'));
}
function renderMedia(section: HTMLElement): void {
    const uploadCard = element('div', 'editor-card'); uploadCard.append(element('h2', '', 'Biblioteca de archivos'), element('p', 'muted', 'JPEG, PNG o WebP hasta 10 MB. Video MP4 hasta 100 MB. Los archivos de borradores son privados.'));
    const input = field(uploadCard, 'file', 'Subir fotos o video', '', 'file') as HTMLInputElement; input.accept = 'image/jpeg,image/png,image/webp,video/mp4'; input.multiple = true;
    const status = element('div'); status.setAttribute('aria-live', 'polite'); uploadCard.append(status);
    input.addEventListener('change', () => {
        const selected = [...input.files ?? []]; if (!selected.length) return; input.disabled = true;
        const indicator = loader('Subiendo archivos'); status.replaceChildren(indicator);
        void (async () => {
            let added = 0;
            try { for (const file of selected) { files.push(await api.uploadMedia(file)); added++; renderMediaGallery(); } notify(status, `${added} archivo(s) subido(s). Selecciónalos para usarlos en la ficha.`); }
            catch (error) { showFailure(uploadCard, status, error); }
            finally { indicator.remove(); input.disabled = false; input.value = ''; }
        })();
    });
    mediaGallery = element('div', 'media-grid'); uploadCard.append(mediaGallery); section.append(uploadCard);
    const editor = formCard('Logo, portada y video'); hotelMediaForm = editor.form;
    for (const [key, label] of [['logoPath', 'Logo'], ['facadePath', 'Portada / fachada'], ['videoPath', 'Video del hotel']] as const) {
        const path = current!.detail[key]; const options: [string, string][] = [['', 'Sin archivo']];
        if (path && !path.startsWith('/api/media/')) options.push([path, 'Archivo actual del hotel']);
        const input = select(editor.grid, key, label, path ?? '', options);
        const previewBox = element('div', 'identity-preview'); editor.grid.append(previewBox);
        const draw = () => { previewBox.replaceChildren(); if (input.value) previewBox.append(previewNode(input.value, key === 'videoPath', label)); };
        input.addEventListener('change', draw); mediaSelectorsForInitial(input, key); input.value = path ?? ''; draw();
    }
    editor.form.addEventListener('submit', event => {
        event.preventDefault(); void busy(editor.submit, async () => {
            try {
                const data = new FormData(editor.form); const body = current!.detail;
                current = await api.saveHotel({ ...body, logoPath: String(data.get('logoPath') || '') || null, facadePath: String(data.get('facadePath') || '') || null, videoPath: String(data.get('videoPath') || '') || null }, false);
                markSaved(editor.form); header(); notify(editor.status, 'Logo, portada y video guardados.');
            } catch (error) { showFailure(editor.form, editor.status, error); }
        });
    }); section.append(editor.form); renderMediaGallery();
}
function mediaSelectorsForInitial(input: HTMLSelectElement, key: string): void {
    for (const file of files.filter(file => file.contentType.startsWith(key === 'videoPath' ? 'video/' : 'image/'))) { const option = element('option', '', file.originalName); option.value = file.path; option.dataset.uploaded = 'true'; input.append(option); }
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
            try { current = await api.saveCards(cards); markSaved(form); header(); notify(status, 'Contenido guardado.'); }
            catch (error) { showFailure(form, status, error); }
        });
    }); section.append(form);
}
function renderDashboard(): void {
    const section = sections.get('dashboard'); if (!section) return;
    if (section.querySelector('form[data-dirty="true"]')) return;
    section.replaceChildren();
    if (!current) {
        section.append(button('Configurar mi hotel', () => activate('hotel'), 'primary')); return;
    }
    const actions = element('div', 'dashboard-actions'); const status = element('div'); status.setAttribute('aria-live', 'polite');
    const change = button(current.published ? 'Ocultar hotel' : 'Publicar hotel', () => {
        if (hasChanges()) { notify(status, 'Guarda los cambios pendientes antes de cambiar la publicación.', true); return; }
        if (current!.published && !confirm('¿Ocultar el hotel del catálogo público?')) return;
        void busy(change, async () => {
            try { current = await api.setPublication(!current!.published); header(); notify(globalMessage, current.published ? 'Hotel publicado.' : 'Hotel oculto.'); }
            catch (error) { showFailure(section, status, error); }
        });
    }, current.published ? 'secondary' : 'primary');
    actions.append(change);
    if (current.published) {
        const publicLink = element('a', 'secondary', 'Ver ficha pública'); publicLink.href = `hotel-central.html?id=${current.detail.id}`;
        publicLink.target = '_blank'; publicLink.rel = 'noopener'; actions.append(publicLink);
    }
    const parking = formCard('Estacionamiento');
    const choice = select(parking.grid, 'hasParking', '¿Tiene estacionamiento?', String(current.detail.hasParking ?? false), [['true', 'Sí'], ['false', 'No']]);
    parking.submit.textContent = 'Guardar estacionamiento';
    parking.form.addEventListener('submit', event => {
        event.preventDefault(); void busy(parking.submit, async () => {
            try {
                current = await api.saveHotel({ ...current!.detail, hasParking: choice.value === 'true' }, false);
                markSaved(parking.form); notify(parking.status, 'Estacionamiento guardado.');
            } catch (error) { showFailure(parking.form, parking.status, error); }
        });
    });
    section.append(actions, status, parking.form);
}
function render(): void {
    content.replaceChildren(); sections.clear(); roomForm = null; hotelMediaForm = null;
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
        try { current = await api.getOwnerHotel(); files = await api.getMedia(); }
        catch (error) { if (error instanceof HttpError && error.status === 404) current = null; else throw error; }
        render();
    } catch (error) {
        content.replaceChildren(); const retry = button('Reintentar', () => { void load(); }); content.append(retry); showFailure(content, globalMessage, error); content.setAttribute('aria-busy', 'false');
    }
}
requiredElement('panelNav', 'nav').addEventListener('click', event => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-section]'); if (target?.dataset.section) activate(target.dataset.section); });
requiredElement('logout', 'button').addEventListener('click', () => {
    if (hasChanges() && !confirm('Hay cambios sin guardar. ¿Deseas cerrar sesión y descartarlos?')) return;
    const logout = requiredElement('logout', 'button');
    void busy(logout, async () => { try { await signOut(); document.querySelectorAll<HTMLFormElement>('form').forEach(markSaved); window.location.href = 'acceder.html'; } catch (error) { showFailure(content, globalMessage, error); } });
});
void load();
