// ============================================================================
// SHADERS DE L'OBJET SIGNATURE
//
// Un « shader » est un petit programme exécuté par la carte graphique.
// Il est écrit en GLSL (un langage proche du C) et il y en a deux :
//   - le vertex shader   : calcule OÙ se trouve chaque particule
//   - le fragment shader : calcule la COULEUR de chaque pixel d'une particule
//
// Pourquoi ici et pas en JavaScript ? Parce que la carte graphique traite
// les 14 000 particules en parallèle : c'est ce qui permet les 60 images/s.
//
// Vocabulaire :
//   attribute = une donnée différente pour chaque particule (sa position…)
//   uniform   = une donnée commune à toutes (le temps, l'avancement du scroll…)
//   varying   = une valeur passée du vertex shader au fragment shader
//
// L'histoire racontée, pilotée par quatre curseurs qui vont de 0 à 1 :
//   galaxie de code ──uGather──▶ lignes décomposées ──uAlign──▶ lignes droites
//   ──uAssemble──▶ forme finale ──uCode──▶ produit (le code range ses faces)
// ============================================================================

export const vertexShader = /* glsl */ `
  // --- Données communes à toutes les particules (envoyées par JavaScript) ---
  uniform float uTime;        // temps écoulé, en secondes
  uniform float uGather;      // 0 → 1 : la galaxie se rassemble en lignes décomposées
  uniform float uAlign;       // 0 → 1 : les lignes décomposées deviennent des lignes droites
  uniform float uAssemble;    // 0 → 1 : les lignes droites s'assemblent en icosaèdre
  uniform float uCode;        // 0 → 1 : le code vient couvrir les faces (produit final)
  uniform float uGlyphShare;  // part des grains de la galaxie qui sont des caractères (0 à 1)
  uniform float uScale;       // facteur pour convertir une taille 3D en pixels
  uniform float uObjScale;    // échelle de l'objet (réduit sur petit écran)
  uniform float uHover;       // 0 → 1 : force de répulsion de la souris
  uniform float uCamDist;     // distance entre la caméra et l'objet
  uniform float uMotion;      // 1 = animations normales, 0 = mouvement réduit
  uniform vec3 uRayO;         // rayon de la souris : son point de départ
  uniform vec3 uRayD;         // rayon de la souris : sa direction
  uniform vec3 uBlue;         // couleur bleue
  uniform vec3 uOrange;       // couleur orange
  uniform vec3 uInk;          // couleur noire

  // --- Les cinq positions de chaque particule, une par étape de l'histoire ---
  attribute vec3 aScatter;    // 1. quelque part dans la galaxie
  attribute vec3 aFrag;       // 2. sur un petit bout de ligne, posé de travers
  attribute vec3 aLine;       // 3. sur une ligne droite entière, encore détachée
  // (« position », fournie par Three.js, est la 4e : sur une arête de la forme finale)
  attribute vec3 aCell;       // 5. sur une face, dans la grille de code

  // --- Autres données propres à chaque particule ---
  attribute vec3 aNormal;     // la direction « vers l'extérieur » à cet endroit
  attribute vec3 aGroup;      // x = place le long de son bout de ligne (0 → 1),
                              // y = nombre au hasard commun à tout le bout de ligne,
                              // z = nombre au hasard commun à toute l'arête
  attribute vec3 aGrid;       // x = colonne, y = identifiant de ligne, z = 1 si c'est un caractère de face
  attribute vec4 aRand;       // quatre nombres aléatoires entre 0 et 1

  // --- Valeurs transmises au fragment shader ---
  varying vec3 vColor;        // couleur de la particule
  varying float vAlpha;       // opacité
  varying float vGlyph;       // 0 = point rond, 1 = caractère de code
  varying float vIdx;         // numéro du caractère à afficher (0 à 63)

  const float PI = 3.14159265;

  // Fonction de « hasard » : renvoie toujours le même nombre (entre 0 et 1)
  // pour une même entrée. Astuce classique en GLSL, qui n'a pas de random().
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Courbe en S : démarre doucement, accélère, puis ralentit avant d'arriver
  float ease(float t) {
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    float isFaceGlyph = aGrid.z;   // deviendra-t-elle un caractère sur une face ? (1 = oui)
    float along = aGroup.x;        // sa place le long de son bout de ligne
    float fragSeed = aGroup.y;     // le « hasard » de son bout de ligne
    float edgeSeed = aGroup.z;     // le « hasard » de son arête

    // ---------------------------------------------------------------------
    // AVANCEMENT DE CHAQUE ÉTAPE, POUR CETTE PARTICULE
    // ---------------------------------------------------------------------
    // smoothstep(a, b, x) renvoie 0 avant a, 1 après b, et une courbe douce entre.
    // Chaque particule reçoit un « retard » : elles ne bougent pas toutes en même
    // temps, ce qui donne des vagues plutôt qu'un bloc qui se déplace.

    // 1 → 2 : le retard dépend surtout du bout de ligne. Ses particules arrivent
    // donc à peu près ensemble : les bouts de ligne apparaissent un par un.
    float delay = 0.55 * fragSeed + 0.45 * aRand.y;
    // s = « à quel point la particule est encore libre dans la galaxie » (1 = libre, 0 = rangée)
    float s = 1.0 - smoothstep(delay, delay + 0.35, uGather * 1.35);

    // 2 → 3 : même avancement pour toutes les particules d'un bout de ligne,
    // qui se redresse ainsi d'un seul tenant, comme une baguette
    float a = ease(smoothstep(fragSeed * 0.6, fragSeed * 0.6 + 0.4, uAlign));

    // 3 → 4 : même avancement pour toute une arête, qui vient se fixer d'un bloc
    float b = ease(smoothstep(edgeSeed * 0.6, edgeSeed * 0.6 + 0.4, uAssemble));

    // 4 → 5 : seulement pour les particules destinées aux faces
    float c = isFaceGlyph * ease(smoothstep(aRand.x * 0.6, aRand.x * 0.6 + 0.4, uCode));

    // ---------------------------------------------------------------------
    // ÉTAPE 2 : LA LIGNE DÉCOMPOSÉE (un bout de fil qui ondule)
    // ---------------------------------------------------------------------
    // Une direction au hasard, la même pour tout le bout de ligne
    vec3 waveDir = normalize(vec3(
      hash(vec2(fragSeed, 1.0)),
      hash(vec2(fragSeed, 2.0)),
      hash(vec2(fragSeed, 3.0))
    ) - 0.5);
    // L'ondulation : un sinus le long du bout de ligne, qui avance avec le temps.
    // C'est elle qui fait que la ligne n'est pas droite.
    float wave = sin(along * 7.0 + uTime * 1.6 * uMotion + fragSeed * 6.283);
    // Le bout de ligne flotte aussi doucement sur place
    vec3 floating = 0.06 * uMotion * vec3(
      sin(uTime * 0.40 + fragSeed * 30.0),
      cos(uTime * 0.33 + fragSeed * 50.0),
      sin(uTime * 0.27 + fragSeed * 70.0)
    );
    vec3 fragPos = aFrag + waveDir * 0.05 * wave + floating;

    // ---------------------------------------------------------------------
    // ON ENCHAÎNE LES ÉTAPES : chaque mix() glisse vers la position suivante
    // ---------------------------------------------------------------------
    // mix(a, b, t) renvoie a quand t = 0, b quand t = 1, et un mélange entre les deux
    vec3 built = mix(fragPos, aLine, a);     // le fil ondulé se tend en ligne droite
    built = mix(built, position, b);         // la ligne droite rejoint sa place dans la forme
    built = mix(built, aCell, c);            // le caractère quitte l'arête pour sa face
    // Pendant ce dernier trajet, il s'écarte un peu du centre (trajectoire bombée)
    built += normalize(built + 0.0001) * sin(c * PI) * 0.18;

    // ---------------------------------------------------------------------
    // ÉTAPE 1 : LA GALAXIE
    // ---------------------------------------------------------------------
    // Un grain libre flotte doucement autour de sa position (vie permanente)
    vec3 drift = aScatter + uMotion * 0.09 * vec3(
      sin(uTime * 0.31 + aRand.z * 6.283),
      cos(uTime * 0.27 + aRand.w * 6.283),
      sin(uTime * 0.23 + aRand.x * 6.283)
    );
    // Position finale : entre l'objet en construction et la galaxie
    vec3 pos = mix(built, drift, s);
    // Pendant le trajet, le grain décrit un petit tourbillon (comme aspiré)
    float angle = aRand.w * 6.283 + s * 4.0;
    pos.xz += sin(s * PI) * 0.35 * vec2(cos(angle), sin(angle));

    // ---------------------------------------------------------------------
    // RÉPULSION DE LA SOURIS (le « trou » sous le curseur)
    // ---------------------------------------------------------------------
    // La souris est un point sur l'écran ; en 3D c'est une ligne droite (un
    // « rayon ») qui part de la caméra. On repousse les particules proches.
    vec3 rel = pos - uRayO;                        // de l'origine du rayon vers la particule
    vec3 perp = rel - dot(rel, uRayD) * uRayD;     // chemin le plus court entre le rayon et la particule
    float dist = length(perp);                     // distance au rayon
    // Force : très marquée dans la galaxie, moyenne sur les bouts de ligne,
    // légère une fois la forme construite
    float strength = mix(0.1, 0.5, s) + 0.2 * (1.0 - a) * (1.0 - s);
    // Maximale sur le rayon, nulle à 0.6 unité de distance
    float force = uHover * (1.0 - smoothstep(0.0, 0.6, dist)) * strength;
    // On pousse la particule en s'éloignant du rayon
    pos += normalize(perp + 0.0001) * force;

    // ---------------------------------------------------------------------
    // PROJECTION : de la 3D vers l'écran
    // ---------------------------------------------------------------------
    // modelViewMatrix place la particule par rapport à la caméra
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // projectionMatrix applique la perspective : c'est la position finale à l'écran
    gl_Position = projectionMatrix * mv;

    // ---------------------------------------------------------------------
    // POINT OU CARACTÈRE ?
    // ---------------------------------------------------------------------
    // Dans la galaxie, une partie des grains sont des caractères (les autres des points).
    // step(a, b) vaut 1 si b >= a, sinon 0 : ici « 1 si le tirage est sous la part voulue »
    float isGalaxyGlyph = step(aRand.w, uGlyphShare);
    // La particule est un caractère soit dans la galaxie, soit sur une face à la fin.
    // Le passage point ↔ caractère se fait sur le premier tiers du trajet seulement
    // (smoothstep de 0 à 0.35) : la particule est alors encore petite, ce qui évite
    // de voir un gros disque flou pendant la transformation.
    vGlyph = clamp(smoothstep(0.0, 0.35, c) + smoothstep(0.0, 0.35, s) * isGalaxyGlyph, 0.0, 1.0);

    // ---------------------------------------------------------------------
    // QUEL CARACTÈRE AFFICHER ?
    // ---------------------------------------------------------------------
    // -- Sur une face : le code défile le long de sa ligne --
    // Chaque ligne de code a sa propre vitesse, tirée au hasard
    float rowSeed = hash(vec2(aGrid.y, 7.3));
    // « tick » : un compteur qui avance par à-coups, comme un curseur
    float tick = floor(uTime * mix(3.0, 9.0, rowSeed) * uMotion + rowSeed * 40.0);
    // On décale la colonne du nombre de ticks : les caractères glissent le long de la ligne
    float key = mod(aGrid.x + tick, 512.0);
    // Numéro du caractère dans la planche (64 caractères, de 0 à 63)
    float faceIdx = floor(hash(vec2(key, aGrid.y)) * 64.0);
    // Une case sur cinq reste vide : ça crée des « espaces » comme dans du vrai code
    float filled = step(0.2, hash(vec2(key + 31.0, aGrid.y + 3.0)));

    // -- Dans la galaxie : chaque caractère change de temps en temps, à son rythme --
    float galaxyTick = floor(uTime * mix(0.2, 1.2, aRand.x) * uMotion + aRand.w * 40.0);
    float galaxyIdx = floor(hash(vec2(aRand.z * 91.7 + galaxyTick, aRand.w * 53.1)) * 64.0);

    // On prend l'un ou l'autre selon l'endroit où se trouve la particule
    vIdx = s > 0.001 ? galaxyIdx : faceIdx;

    // ---------------------------------------------------------------------
    // OPACITÉ
    // ---------------------------------------------------------------------
    // Le caractère regarde-t-il vers la caméra ? (1 = face avant, 0 = face arrière)
    vec3 n = normalize(normalMatrix * aNormal);
    float front = smoothstep(-0.05, 0.3, dot(n, normalize(-mv.xyz)));
    // Profondeur : 1 pour l'avant de l'objet, 0 pour l'arrière
    float depth = smoothstep(uCamDist + uObjScale, uCamDist - uObjScale, -mv.z);
    // Lignes : celles du fond sont plus pâles (on lit mieux le volume), et elles
    // s'effacent un peu quand le code apparaît pour lui laisser la vedette
    float lineAlpha = mix(0.3, 1.0, depth) * mix(1.0, 0.7, uCode * (1.0 - isFaceGlyph));
    // Caractères des faces : presque invisibles sur les faces arrière
    float faceAlpha = filled * mix(0.08, 1.0, front);
    // Galaxie : chaque grain a sa propre opacité
    float galaxyAlpha = mix(0.55, 1.0, aRand.x);
    // On mélange les trois selon l'état de la particule
    vAlpha = mix(mix(lineAlpha, faceAlpha, c), galaxyAlpha, s);

    // ---------------------------------------------------------------------
    // COULEUR
    // ---------------------------------------------------------------------
    // Dans la galaxie : 50 % de noirs, 42 % de bleus, 8 % d'orange
    vec3 galaxyColor = aRand.z < 0.5 ? uInk : (aRand.z < 0.92 ? uBlue : uOrange);
    // Lignes bleues, code orange sur les faces, couleurs mêlées dans la galaxie
    vColor = mix(mix(uBlue, uOrange, c), galaxyColor, s);

    // ---------------------------------------------------------------------
    // TAILLE
    // ---------------------------------------------------------------------
    // Dans la galaxie : un grain est fin, un caractère est plus grand.
    // pow(x, 2.0) favorise les petites valeurs : beaucoup de petits caractères, quelques grands.
    float grainSize = mix(0.012, 0.03, aRand.y);
    float glyphSize = mix(0.045, 0.13, pow(aRand.y, 2.0));
    float galaxySize = mix(grainSize, glyphSize, isGalaxyGlyph);
    // Ailleurs : point fin pour une ligne, grand pour un caractère de face
    float size = mix(mix(0.016, 0.09, c), galaxySize, s);
    // On divise par la distance : plus c'est loin, plus c'est petit (perspective)
    gl_PointSize = size * uObjScale * uScale / -mv.z;
  }
`

export const fragmentShader = /* glsl */ `
  // Précision des calculs (obligatoire dans un fragment shader)
  precision highp float;

  uniform sampler2D uAtlas; // la planche de 64 caractères (une image)

  varying vec3 vColor;
  varying float vAlpha;
  varying float vGlyph;
  varying float vIdx;

  void main() {
    // gl_PointCoord : position du pixel DANS le carré de la particule
    // (0,0) = coin haut-gauche, (1,1) = coin bas-droite
    vec2 pc = gl_PointCoord;

    // --- Forme 1 : un point rond ---
    // Opaque au centre, transparent au-delà d'un rayon de 0.5 (bord adouci)
    float dotAlpha = 1.0 - smoothstep(0.35, 0.5, length(pc - 0.5));

    // --- Forme 2 : un caractère ---
    // La planche est une grille de 8 × 8 cases : on retrouve la colonne et la ligne
    float idx = floor(vIdx + 0.5);
    float col = mod(idx, 8.0);
    float row = floor(idx / 8.0);
    // Coordonnées du pixel à lire dans la planche (l'axe vertical est inversé)
    vec2 uv = vec2((col + pc.x) / 8.0, 1.0 - (row + pc.y) / 8.0);
    // L'opacité du pixel de la planche dessine la forme de la lettre
    float glyphAlpha = texture2D(uAtlas, uv).a;

    // On passe du point au caractère selon l'état de la particule
    float alpha = mix(dotAlpha, glyphAlpha, vGlyph) * vAlpha;

    // Pixel quasi transparent : on ne le dessine pas (gain de performance)
    if (alpha < 0.01) discard;

    // Couleur finale du pixel
    gl_FragColor = vec4(vColor, alpha);
  }
`
