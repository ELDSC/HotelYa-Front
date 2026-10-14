import logo from '../assets/images/logoHoteleriasYa.png';
import { ownerPages, type OwnerPage } from '../config/owner-pages';
import { appPath } from '../utils/urls';

export function mountOwnerLayout(page: OwnerPage): void {
    const root = document.getElementById('ownerApp');
    if (!root) throw new Error('Falta el contenedor del panel.');
    // Only application constants enter this shared shell; hotel data uses textContent.
    root.innerHTML = `
        <header class="owner-mobile-header">
            <span>HoteleriasYa</span>
            <button id="sidebarToggle" type="button" data-bs-toggle="offcanvas" data-bs-target="#ownerSidebar"
                aria-controls="ownerSidebar" aria-expanded="false" aria-label="Abrir menú"><span aria-hidden="true">☰</span></button>
        </header>
        <div class="owner-layout">
            <aside id="ownerSidebar" class="owner-sidebar offcanvas offcanvas-start" tabindex="-1" aria-label="Menú de administración">
                <div class="owner-sidebar-header">
                    <a href="${appPath('index.html')}" class="owner-brand"><img src="${logo}" width="40" height="40" alt="">HoteleriasYa</a>
                    <button class="owner-sidebar-close" type="button" data-bs-dismiss="offcanvas" aria-label="Cerrar menú">×</button>
                </div>
                <nav id="panelNav" aria-label="Administración">
                    ${Object.entries(ownerPages).map(([key, entry]) => `<a href="${appPath(entry.path)}" data-section="${key}"${key === page ? ' class="selected" aria-current="page"' : ''}>${entry.title}</a>`).join('')}
                </nav>
                <div class="owner-sidebar-footer">
                    <a id="publicHotelLink" class="owner-page-link" href="#" target="_blank" rel="noopener" hidden>Ver mi página ↗</a>
                    <div class="owner-account"><span id="ownerEmail"></span><button id="logout" type="button">Cerrar sesión</button></div>
                </div>
            </aside>
            <main class="owner-main">
                <header class="panel-heading"><div><h1 id="hotelHeading">${ownerPages[page].title}</h1></div></header>
                <div id="panelError" aria-live="polite"></div>
                <div id="panelContent" aria-busy="true"><span class="loading-indicator" role="status" aria-label="Cargando panel"><span class="spinner"></span></span></div>
            </main>
        </div>
        <div class="owner-toast-container" aria-live="polite" aria-atomic="true">
            <div id="ownerToast" class="toast owner-toast fade" role="status" aria-live="polite" aria-atomic="true">
                <div class="toast-body" id="ownerToastMessage"></div>
                <button class="toast-close" type="button" data-bs-dismiss="toast" aria-label="Cerrar notificación">×</button>
            </div>
        </div>`;
}
