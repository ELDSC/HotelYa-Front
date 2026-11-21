interface DeveloperProfile {
    summary: string;
    tools: readonly string[];
    programmingLanguages: readonly string[];
    softSkills: readonly string[];
    certifications?: readonly string[];
    cv: {
        view: string;
        download: string;
        owner?: string;
    };
}

function driveCv(id: string): DeveloperProfile['cv'] {
    return {
        view: `https://drive.google.com/file/d/${id}/view`,
        download: `https://drive.google.com/uc?export=download&id=${id}`,
    };
}

const rafaelCv = driveCv('1LUtmm0-FJNCvMpXAgul5RnHFmT4RJcVI');

export const developerProfiles: Readonly<Partial<Record<string, DeveloperProfile>>> = {
    'alvaro-ramirez': {
        summary: 'Desarrollador de aplicaciones móviles Android e iOS con experiencia en arquitectura e integración de software.',
        tools: ['Docker', 'Git', 'PostgreSQL'],
        programmingLanguages: ['TypeScript', 'JavaScript', 'SQL'],
        softSkills: ['Liderazgo', 'Comunicación', 'Resolución de problemas'],
        cv: driveCv('1DY0-0BBBGDCjxKmNOUO8kX1AyvTItMye'),
    },
    'josue-sarango': {
        summary: 'Estudiante de Ingeniería de Sistemas orientado al desarrollo Full Stack y al análisis de datos.',
        tools: ['Astro', 'PostgreSQL', 'Supabase'],
        programmingLanguages: ['Python', 'Java', 'SQL'],
        softSkills: ['Pensamiento analítico', 'Atención al detalle', 'Trabajo en equipo'],
        certifications: ['Ciencia de Datos', 'Excel Intermedio', 'Inglés Intermedio'],
        cv: driveCv('16h4Tut579jAJUGU6-VK8h2Ok7BbUSU7r'),
    },
    'jessus-chu': {
        summary: 'Desarrollador Full Stack con experiencia en aplicaciones web, integración de servicios y automatización.',
        tools: ['Spring Boot', 'Node.js', 'Postman'],
        programmingLanguages: ['Java', 'JavaScript', 'SQL'],
        softSkills: ['Trabajo en equipo', 'Pensamiento analítico', 'Resolución de problemas', 'Aprendizaje continuo', 'Adaptabilidad'],
        cv: { view: 'assets/cv/jessus-chu.pdf', download: 'assets/cv/jessus-chu.pdf' },
    },
    'rafael-palomino': {
        summary: 'Desarrollador frontend enfocado en interfaces web responsivas, accesibles y fáciles de usar.',
        tools: ['Astro', 'Tailwind CSS', 'Git'],
        programmingLanguages: ['JavaScript'],
        softSkills: ['Trabajo en equipo', 'Comunicación', 'Resolución de problemas'],
        cv: rafaelCv,
    },
    'christian-villanueva': {
        summary: 'Maquetación web y diseño adaptable.',
        tools: [],
        programmingLanguages: [],
        softSkills: [],
        cv: { ...rafaelCv, owner: 'Rafael Palomino' },
    },
};
