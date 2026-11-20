export interface TeamMember {
    id: string;
    name: string;
    initials: string;
    role: string;
    contribution: string;
    portrait?: string;
}

export const coordinator: TeamMember = {
    id: 'alvaro-ramirez',
    name: 'Álvaro Ramírez',
    initials: 'AR',
    role: 'Coordinador',
    contribution: 'Coordina el desarrollo y la integración de las partes del proyecto.',
    portrait: 'assets/images/equipo/alvaro-ramirez.jpg',
};

export const team: readonly TeamMember[] = [
    {
        id: 'josue-sarango',
        name: 'Josué Sarango',
        initials: 'JS',
        role: 'Encargado de desarrollo Full Stack',
        contribution: 'Integra la interfaz con los datos y servicios de la aplicación.',
        portrait: 'assets/images/equipo/josue-sarango.jpg',
    },
    {
        id: 'jessus-chu',
        name: 'Jessus Hemir Chu Díaz',
        initials: 'JC',
        role: 'Desarrollador Full Stack',
        contribution: 'Trabaja en la integración web y el desarrollo de servicios.',
        portrait: 'assets/images/equipo/jessus-chu.jpg',
    },
    {
        id: 'rafael-palomino',
        name: 'Rafael Palomino',
        initials: 'RP',
        role: 'Desarrollador frontend',
        contribution: 'Desarrolla interfaces que se adaptan a distintos tamaños de pantalla.',
        portrait: 'assets/images/equipo/rafael-palomino.jpg',
    },
    {
        id: 'integrante-pendiente',
        name: 'Integrante de prueba',
        initials: '—',
        role: 'Cargo por confirmar',
        contribution: 'Espacio reservado para el próximo integrante del equipo.',
    },
];
