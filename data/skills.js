/**
 * Données de la section "Compétences" (sélection essentielle, max 5 par catégorie).
 * @typedef {{ category: string, skills: string[] }} SkillCategory
 * @type {SkillCategory[]}
 */
const skillsData = [
    {
        category: "Langages",
        skills: ["JavaScript", "TypeScript", "PHP", "C#", "SQL"]
    },
    {
        category: "Front-end",
        skills: ["React", "Vue.js", "Flutter", "Bootstrap", "Stimulus (Symfony UX)"]
    },
    {
        category: "Back-end, API & architecture",
        skills: ["Symfony", ".NET Framework", "API REST", "JWT", "Architecture MVC"]
    },
    {
        category: "Bases de données",
        skills: [
            "PostgreSQL", "Doctrine ORM", "Bases de données relationnelles",
            "Développement de bases de données", "Oracle SQL Developer"
        ]
    },
    {
        category: "DevOps & cloud",
        skills: ["Git", "Docker", "Docker Compose", "CI/CD", "GitHub Actions"]
    },
    {
        category: "Systèmes & réseau",
        skills: [
            "Infrastructure informatique", "Systèmes informatiques",
            "Administration réseau", "Sécurité réseau"
        ]
    },
    {
        category: "Design & UX",
        skills: [
            "Figma", "Design d'interface utilisateur (UI)",
            "Expérience utilisateur (UX)", "Wireframing", "Design system"
        ]
    },
    {
        category: "Data",
        skills: [
            "Analyse des données", "Analyses Big Data", "Dataviz",
            "Ignition (supervision)"
        ]
    },
    {
        category: "Gestion de projet & méthodes",
        skills: [
            "Gestion de projet", "Chef de projet", "Développement web agile",
            "No-code / Low-code", "SEO"
        ]
    },
    {
        category: "Langues",
        skills: ["Anglais"]
    }
];
