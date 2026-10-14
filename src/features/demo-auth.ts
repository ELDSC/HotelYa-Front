import { requiredElement } from '../ui/dom';

export function initDemoAuth(): void {
    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    let userEmail = localStorage.getItem('userEmail') || '';

    const loginBtnTrigger = document.getElementById('loginBtnTrigger');
    const authButtonLabel = document.getElementById('authButtonLabel');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const authModal = document.getElementById('authModal');
    const loginForm = document.querySelector<HTMLFormElement>('#loginForm');

    const updateAuthUI = () => {
        if (userProfileBtn) userProfileBtn.classList.toggle('active', isLoggedIn);
        if (userNameDisplay) userNameDisplay.textContent = isLoggedIn ? (userEmail.split('@')[0] ?? '') : 'Invitado';
        if (authButtonLabel) authButtonLabel.textContent = isLoggedIn ? 'Cerrar sesión' : 'Acceder';
        if (loginBtnTrigger) {
            loginBtnTrigger.setAttribute('aria-label', isLoggedIn ? 'Cerrar sesión' : 'Acceder');
        }
    };

    updateAuthUI();

    loginBtnTrigger?.addEventListener('click', () => {
        if (!isLoggedIn) {
            authModal?.classList.add('active');
            return;
        }

        if (confirm('¿Deseas cerrar tu sesión actual?')) {
            isLoggedIn = false;
            userEmail = '';
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            updateAuthUI();
        }
    });
    document.getElementById('closeAuthModal')?.addEventListener('click', () => authModal?.classList.remove('active'));

    // Cerrar modal al hacer clic en el fondo oscuro
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        isLoggedIn = true;
        userEmail = requiredElement('email', 'input').value;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', userEmail);
        authModal?.classList.remove('active');
        updateAuthUI();
        loginForm.reset();
        alert(`¡Bienvenido de nuevo a HotelYa, ${userEmail}!`);
    });

}
