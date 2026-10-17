import '../styles/owner.css';
import { restoreSession, signIn } from '../features/admin-auth';
import { requiredElement } from '../ui/dom';
import { busy, showFailure } from '../ui/forms';
import { appPath } from '../utils/urls';
const form = requiredElement('adminAccessForm', 'form');
const email = requiredElement('email', 'input');
const password = requiredElement('password', 'input');
const submit = requiredElement('accessSubmit', 'button');
const message = requiredElement('accessMessage', 'div');
email.value = import.meta.env.VITE_ADMIN_LOGIN_EMAIL;
password.value = import.meta.env.VITE_ADMIN_LOGIN_PASSWORD;
form.addEventListener('submit', event => {
    event.preventDefault();
    void busy(submit, async () => {
        try { await signIn(email.value, password.value); window.location.replace(appPath('admin/')); }
        catch (error) { showFailure(form, message, error); }
    });
});
void restoreSession().then(user => { if (user) window.location.replace(appPath('admin/')); })
    .catch(error => { showFailure(form, message, error); });
