import Toast from 'bootstrap/js/dist/toast';
import { requiredElement } from './dom';

let instance: Toast | null = null;
export function toast(message = 'Guardado correctamente.'): void {
    const node = requiredElement('ownerToast', 'div');
    requiredElement('ownerToastMessage', 'div').textContent = message;
    instance ??= new Toast(node, { autohide: true, delay: 3500, animation: true });
    instance.show();
}
