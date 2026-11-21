import { appPath } from '../utils/urls';
import { element, requiredElement } from './dom';
import { coordinator, team, type TeamMember } from '../data/team';
import { developerProfiles } from '../data/developer-profiles';

function portrait(member: TeamMember, className: string): HTMLElement {
    const fallback = element('span', className, member.initials);
    fallback.setAttribute('aria-hidden', 'true');
    if (!member.portrait) return fallback;

    const image = element('img', className);
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
    image.src = appPath(member.portrait);
    return image;
}

function cvLink(url: string, label: string, download = false): HTMLAnchorElement {
    const link = element('a', 'cv-link', label);
    const local = url.startsWith('assets/');
    link.href = local ? appPath(url) : url;
    if (local && download) {
        link.download = '';
    } else if (!download) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }
    return link;
}

function skills(label: string, values: readonly string[]): HTMLElement {
    const group = element('section', 'cv-skills');
    const list = element('ul', 'cv-tags');
    for (const value of values) list.append(element('li', '', value));
    group.append(element('h3', '', label), list);
    return group;
}

function profileButton(member: TeamMember, open: () => void, owner?: string): HTMLButtonElement {
    const button = element('button', 'cv-link cv-trigger', owner ? `Ver CV de ${owner}` : 'Ver CV');
    button.type = 'button';
    button.setAttribute('aria-label', `Ver CV de ${owner ?? member.name}`);
    button.addEventListener('click', open);
    return button;
}

function memberCard(member: TeamMember, kind: 'org' | 'developer', open: () => void): HTMLElement {
    const card = element('article', `${kind}-card`);
    const profile = developerProfiles[member.id];
    const avatar = portrait(member, 'team-avatar');
    const name = element('h3', 'team-name', member.name);
    const details = element('div', `${kind}-card-details`);
    details.append(
        name,
        element('p', 'team-role', member.role),
        element('p', 'team-contribution', member.contribution),
    );
    card.append(avatar, details);

    if (profile) {
        const actions = element('div', 'cv-actions');
        actions.append(profileButton(member, open, profile.cv.owner));
        if (kind === 'developer') {
            const label = `Descargar CV de ${profile.cv.owner ?? member.name}`;
            const link = cvLink(profile.cv.download, profile.cv.owner ? label : 'Descargar CV', true);
            link.setAttribute('aria-label', label);
            actions.append(link);
        }
        details.append(actions);
    } else if (kind === 'developer') {
        details.append(element('p', 'cv-pending', 'CV pendiente'));
    }

    return card;
}

export function initTeam(): void {
    const leader = requiredElement('org-leader', 'div');
    const members = requiredElement('org-members', 'ul');
    const cards = requiredElement('developer-cards', 'div');
    const dialog = requiredElement('cv-dialog', 'dialog');
    const content = requiredElement('cv-content', 'div');

    function openProfile(member: TeamMember): void {
        const profile = developerProfiles[member.id];
        if (!profile) return;

        const heading = element('h2', '', member.name);
        heading.id = 'cv-title';
        const header = element('div', 'cv-profile-header');
        const identity = element('div');
        identity.append(heading, element('p', 'team-role', member.role));
        header.append(portrait(member, 'team-avatar'), identity);

        const documents = element('div', 'cv-actions');
        documents.append(
            cvLink(profile.cv.view, profile.cv.owner ? `Abrir CV de ${profile.cv.owner}` : 'Abrir PDF completo'),
            cvLink(profile.cv.download, profile.cv.owner ? `Descargar CV de ${profile.cv.owner}` : 'Descargar CV', true),
        );

        content.replaceChildren(
            header,
            element('p', 'cv-summary', profile.summary),
        );
        const skillGroups = [
            ['Programas y herramientas', profile.tools],
            ['Lenguajes de programación', profile.programmingLanguages],
            ['Habilidades blandas', profile.softSkills],
            ['Certificaciones y capacitación', profile.certifications],
        ] as const;
        for (const [label, values] of skillGroups) {
            if (values?.length) content.append(skills(label, values));
        }
        content.append(documents);
        dialog.showModal();
    }

    leader.append(memberCard(coordinator, 'org', () => openProfile(coordinator)));
    for (const member of team) {
        const item = element('li');
        item.append(memberCard(member, 'org', () => openProfile(member)));
        members.append(item);
    }
    for (const member of [coordinator, ...team]) {
        cards.append(memberCard(member, 'developer', () => openProfile(member)));
    }
}
