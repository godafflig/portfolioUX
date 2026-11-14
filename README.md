# Portfolio 2027 — Tom Benat

Portfolio interactif en 3D : un objet fait de particules se construit au fil du défilement.

1. **Érosion** — une galaxie de caractères de code et de grains (intro)
2. **Esquisse** — la galaxie se rassemble en lignes décomposées, des bouts de fil qui ondulent (à propos)
3. **Construction** — les fils se tendent en lignes droites, encore détachées (parcours)
4. **Produit** — les lignes s'assemblent en icosaèdre (projets), puis le code couvre ses faces (contact)

La souris ouvre un trou dans la galaxie et repousse les lignes.

Technologies : [Three.js](https://threejs.org) · [GSAP ScrollTrigger](https://gsap.com) ·
[Lenis](https://lenis.darkroom.engineering) · [Vite](https://vite.dev)

## Lancer le projet

```bash
npm install
```

```bash
npm run dev
```

Si `node_modules` a été copié depuis une autre machine (Windows vers Linux, par exemple) et que
`npm run dev` répond « Permission denied », relancer `npm install` puis `npm rebuild`.

Le site est alors visible sur http://localhost:5173.
`npm run build` produit la version à mettre en ligne dans `dist/`.

## Mise en ligne

Le site est publié sur https://tombenat.fr par GitHub Pages. À chaque envoi sur la branche `main`,
le fichier `.github/workflows/deploy.yml` demande à GitHub de compiler le site et de publier `dist/`.
Le nom de domaine est indiqué dans `public/CNAME`.

Réglage à faire une seule fois sur GitHub : *Settings → Pages → Build and deployment → Source* :
choisir **GitHub Actions**.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `src/data/content.json` | **Tous les textes** : intro, à propos, parcours, projets, contact |
| `src/main.js` | Point d'entrée : démarre chaque partie dans l'ordre |
| `src/core/env.js` | Détection mobile / mouvement réduit, couleurs |
| `src/core/dom.js` | Petit outil pour créer les éléments HTML |
| `src/core/scroll.js` | Défilement fluide (Lenis) relié à ScrollTrigger |
| `src/three/stage.js` | Scène, caméra, renderer, boucle d'animation |
| `src/three/signature.js` | L'objet : calcul des 5 positions de chaque particule, souris |
| `src/three/signature.shaders.js` | Les shaders : mouvement, couleur et forme des particules |
| `src/sections/header.js` | En-tête : nom, étiquette d'état de l'objet 3D, navigation |
| `src/sections/intro.js` | Section 1 : nom géant découpé sur deux lignes |
| `src/sections/about.js` | Section 2 : titre géant, texte ligne par ligne, photo en parallaxe |
| `src/sections/objectTimeline.js` | Quel état de l'objet à quel endroit de la page |
| `src/sections/parcours.js` | Section 3 : frise horizontale épinglée, ligne bleue, années géantes |
| `src/sections/projets.js` | Section 4 : couloir 3D des cartes, survol, clic, page détaillée |
| `src/sections/contact.js` | Section 5 : titre géant, message, bouton d'appel à l'action, liens |
| `public/images/` | Les images (photo, visuels des projets) |
| `public/videos/` | Les vidéos de présentation des projets |
| `public/erosion.html` | Le projet Érosion, page autonome ouverte depuis sa carte |
| `assets-src/` | Captures d'origine et outil de fabrication des visuels (hors site) |
| `src/styles/main.css` | Styles et variables de couleur |

## Avancement

- [x] Étape 1 — Intro + objet signature (galaxie, lignes, forme, produit ; souris, mobile, mouvement réduit)
- [x] Étape 2 — À propos (texte ligne par ligne, parallaxe photo)
- [x] Étape 3 — Parcours (défilement horizontal épinglé, ligne bleue, années géantes)
- [x] Étape 4 — Projets (couloir 3D, brume, survol, entrée dans l'image)
- [x] Étape 5 — Contact (objet terminé, message, bouton, liens)

## Contenus

Tout se règle dans `src/data/content.json`.

### En place

- La photo (`about.photo.src`), les sept visuels de projets (`projets.items[].image`) et la vidéo d'Aldret
- L'adresse e-mail, le numéro de téléphone (`contact.phone`) et les liens GitHub, GitLab et LinkedIn
  de la section Contact

### Reste à compléter

- `parcours.steps[0]` : l'année du déclic (`year`) et sa période (`period`). Tant que l'année est vide,
  le mot du champ `mark` (« Déclic ») s'affiche en géant à sa place.
- `projets.items[].summary` : textes encore trop courts pour Fontenay Restaurants,
  Festival Film Scolaire et Couple & Familles.
- `about.lead`, `about.paragraphs`, `about.profile` : textes de présentation (brouillons à réécrire)

### Ajouter ou changer un visuel

- `about.photo.src` : la photo, dans `public/images/` (format portrait 4:5 conseillé).
  Si le champ est vide, un fond pointillé « Photo à venir » la remplace.
- `projets.items[].image` : le visuel d'un projet, dans `public/images/projets/` (format 16:10 conseillé).
  Si le champ est vide, la carte affiche le numéro du projet sur un fond pointillé.
  Dans le couloir, chaque image est affichée en deux tons bleu / blanc ; ses vraies couleurs
  reviennent au survol et à l'ouverture. Aucune retouche à faire à la main.
- `projets.items[].tint` : mettre `false` pour un visuel déjà dans la palette du site
  (téléphones sur fond pointillé, comme PerfPro) ; il échappe alors au traitement deux tons,
  qui le rendrait presque blanc.
- `projets.items[].video` et `url` (facultatifs) : une vidéo de présentation (dans `public/videos/`)
  et le lien du site en ligne, affichés dans la page détaillée
- `assets-src/compose.html` fabrique un visuel à partir de captures de téléphone : il les aligne
  dans des cadres sur un fond aux couleurs du site, à photographier ensuite avec Chrome (1600 × 1000 px).
  Utilisation : `compose.html?img=a.png,b.png&crop=5`.

## Régler l'objet

Dans `src/three/signature.js` :

- `GLYPH_SHARE` : part des grains de la galaxie affichés comme caractères de code
  (0 = que du sable, 1 = que des caractères ; 0.45 par défaut)
- `FRAGMENTS_PER_EDGE` : en combien de bouts chaque arête est découpée
- `PARTICLE_COUNT` : nombre de particules (ordinateur / mobile)

## Tester depuis la console

En développement, deux objets sont accessibles dans la console du navigateur :

- `lenis.scrollTo(1200)` défile jusqu'à 1200 px, `lenis.stop()` / `lenis.start()` fige ou relance le défilement
- `signature.uniforms.uGlyphShare.value = 1` change la part de caractères dans la galaxie, en direct
