# Portfolio 2027 — Tom Benat

Portfolio interactif en 3D : un icosaèdre de particules se construit (wireframe bleu),
se code (caractères orange) puis s'érode en sable au fil du défilement, avant de se
reformer dans la section contact.

Technologies : [Three.js](https://threejs.org) · [GSAP ScrollTrigger](https://gsap.com) ·
[Lenis](https://lenis.darkroom.engineering) · [Vite](https://vite.dev)

## Lancer le projet

```bash
npm install
```

```bash
npm run dev
```

Le site est alors visible sur http://localhost:5173.
`npm run build` produit la version à mettre en ligne dans `dist/`.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `src/data/content.json` | **Tous les textes** : intro, à propos, parcours, projets, contact |
| `src/main.js` | Point d'entrée : démarre chaque partie dans l'ordre |
| `src/core/env.js` | Détection mobile / mouvement réduit, couleurs |
| `src/core/scroll.js` | Défilement fluide (Lenis) relié à ScrollTrigger |
| `src/three/stage.js` | Scène, caméra, renderer, boucle d'animation |
| `src/three/signature.js` | L'icosaèdre : calcul des 3 positions de chaque particule, souris |
| `src/three/signature.shaders.js` | Les shaders : mouvement, couleur et forme des particules |
| `src/sections/intro.js` | Section 1 : nom géant découpé sur deux lignes |
| `src/sections/about.js` | Section 2 : titre géant, texte ligne par ligne, photo en parallaxe |
| `src/sections/objectTimeline.js` | Quel état de l'objet à quel endroit de la page |
| `src/sections/stubs.js` | Sections 3 à 5 en version provisoire |
| `public/images/` | Les images (photo, visuels des projets) |
| `src/styles/main.css` | Styles et variables de couleur |

## Avancement

- [x] Étape 1 — Intro + objet signature (3 états, souris, mobile, mouvement réduit)
- [x] Étape 2 — À propos (texte ligne par ligne, parallaxe photo)
- [ ] Étape 3 — Parcours (défilement horizontal épinglé, ligne bleue, années géantes)
- [ ] Étape 4 — Projets (couloir 3D, brume, survol, entrée dans l'image)
- [ ] Étape 5 — Contact (version finale)

## À compléter dans `content.json`

- `contact.cta.href` et `contact.links[].href` : adresse e-mail, GitHub, LinkedIn
- `about.photo.src` : déposer la photo dans `public/images/` (format portrait 4:5 conseillé),
  puis écrire son chemin, par exemple `"/images/portrait.jpg"`. Tant que le champ est vide,
  un fond pointillé « Photo à venir » la remplace.
- `projets.items[].image` : les visuels des projets (même principe)
- `parcours.steps[0]` et `[1]` : l'année du déclic et du stage Agence 36 (`year`)
- `about.lead`, `about.paragraphs`, `about.profile` : textes de présentation (brouillons à réécrire)

## Tester le défilement depuis la console

En développement, Lenis est accessible dans la console du navigateur :
`lenis.scrollTo(1200)` défile jusqu'à 1200 px, `lenis.stop()` / `lenis.start()` le fige ou le relance.
