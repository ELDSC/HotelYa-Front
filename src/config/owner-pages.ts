import { appPath } from '../utils/urls';

export const ownerPages = {
    dashboard: { path: 'panel/', title: 'Inicio' },
    hotel: { path: 'panel/informacion/', title: 'Información' },
    rooms: { path: 'panel/habitaciones/', title: 'Habitaciones' },
    media: { path: 'panel/multimedia/', title: 'Multimedia' },
} as const;
export type OwnerPage = keyof typeof ownerPages;

export function ownerDestination(path: string | null): string {
    return appPath(Object.values(ownerPages).find(page => page.path === path)?.path ?? ownerPages.dashboard.path);
}
