import '../styles/owner.css';
import { restoreSession, signIn } from '../features/auth';
import { requiredElement } from '../ui/dom';
import { busy, notify, showFailure } from '../ui/forms';
const form = requiredElement('accessForm', 'form');
const submit = requiredElement('accessSubmit', 'button');
const message = requiredElement('accessMessage', 'div');
const email = requiredElement('email', 'input');
const password = requiredElement('password', 'input');
const confirmation = requiredElement('confirmation', 'input');
let register = false;
for (const id of ['loginTab', 'registerTab']) {
    requiredElement(id, 'button').addEventListener('click', () => {
        register = id === 'registerTab';
        requiredElement('loginTab', 'button').setAttribute('aria-selected', String(!register));
        requiredElement('registerTab', 'button').setAttribute('aria-selected', String(register));
        requiredElement('formTitle', 'h2').textContent = register ? 'Crea tu cuenta de dueño' : 'Bienvenido de nuevo';
        requiredElement('confirmationField', 'label').hidden = !register;
        confirmation.required = register; password.minLength = register ? 8 : 1;
        password.autocomplete = register ? 'new-password' : 'current-password';
        submit.textContent = register ? 'Crear cuenta' : 'Ingresar al panel'; message.replaceChildren();
    });
}
form.addEventListener('submit', event => {
    event.preventDefault();
    if (register && password.value !== confirmation.value) { notify(message, 'Las contraseñas no coinciden.', true); confirmation.focus(); return; }
    void busy(submit, async () => {
        try { await signIn(email.value, password.value, register); window.location.href = 'panel-dueno.html'; }
        catch (error) { showFailure(form, message, error); }
    });
});
void restoreSession().then(user => { if (user) window.location.replace('panel-dueno.html'); }).catch(() => { /* Login itself reports connectivity errors. */ });
