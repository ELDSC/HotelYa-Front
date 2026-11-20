import { appPath } from '../utils/urls';
import { element, requiredElement } from './dom';
import { coordinator, team, type TeamMember } from '../data/team';

function portrait(member: TeamMember): HTMLElement {
    const fallback = element('span', 'team-avatar', member.initials);
    fallback.setAttribute('aria-hidden', 'true');
    if (!member.portrait) return fallback;

    const image = element('img', 'team-avatar');
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(fallback), { once: true });
    image.src = appPath(member.portrait);
    return image;
}

function orgCard(member: TeamMember): HTMLElement {
    const card = element('article', 'org-card');
    card.append(
        portrait(member),
        element('p', 'team-role', member.role),
        element('h3', 'team-name', member.name),
        element('p', 'team-contribution', member.contribution),
    );
    return card;
}

export function initOrgChart(): void {
    const leader = requiredElement('org-leader', 'div');
    const members = requiredElement('org-members', 'ul');
    leader.append(orgCard(coordinator));
    for (const member of team) {
        const item = element('li');
        item.append(orgCard(member));
        members.append(item);
    }
}
