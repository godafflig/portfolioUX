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
| `src/three/signature.js` | L'objet : calcul des 5 positions de chaque particule, souris |
| `src/three/signature.shaders.js` | Les shaders : mouvement, couleur et forme des particules |
| `src/sections/intro.js` | Section 1 : nom géant découpé sur deux lignes |
| `src/sections/about.js` | Section 2 : titre géant, texte ligne par ligne, photo en parallaxe |
| `src/sections/objectTimeline.js` | Quel état de l'objet à quel endroit de la page |
| `src/sections/parcours.js` | Section 3 : frise horizontale épinglée, ligne bleue, années géantes |
| `src/sections/projets.js` | Section 4 : couloir 3D des cartes, survol, clic, page détaillée |
| `src/sections/stubs.js` | Section 5 en version provisoire |
| `public/images/` | Les images (photo, visuels des projets) |
| `src/styles/main.css` | Styles et variables de couleur |

## Avancement

- [x] Étape 1 — Intro + objet signature (galaxie, lignes, forme, produit ; souris, mobile, mouvement réduit)
- [x] Étape 2 — À propos (texte ligne par ligne, parallaxe photo)
- [x] Étape 3 — Parcours (défilement horizontal épinglé, ligne bleue, années géantes)
- [x] Étape 4 — Projets (couloir 3D, brume, survol, entrée dans l'image)
- [ ] Étape 5 — Contact (version finale)

## À compléter dans `content.json`

- `contact.cta.href` et `contact.links[].href` : adresse e-mail, GitHub, LinkedIn
- `about.photo.src` : déposer la photo dans `public/images/` (format portrait 4:5 conseillé),
  puis écrire son chemin, par exemple `"/images/portrait.jpg"`. Tant que le champ est vide,
  un fond pointillé « Photo à venir » la remplace.
- `projets.items[].image` : les visuels des projets (même principe, format 16:10 conseillé).
  Tant que le champ est vide, la carte affiche le numéro du projet sur un fond pointillé.
- `projets.items[].summary` et `stack` : le texte et les technologies de la page détaillée
- `parcours.steps[0]` et `[1]` : l'année du déclic et du stage Agence 36 (`year`).
  Tant qu'elle est vide, le mot du champ `mark` (« Déclic », « Stage ») s'affiche en géant à sa place.
- `about.lead`, `about.paragraphs`, `about.profile` : textes de présentation (brouillons à réécrire)

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
