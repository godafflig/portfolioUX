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
// ============================================================================

export const vertexShader = /* glsl */ `
  // --- Données communes à toutes les particules (envoyées par JavaScript) ---
  uniform float uTime;      // temps écoulé, en secondes
  uniform float uCode;      // 0 → 1 : passage du wireframe au code
  uniform float uSand;      // 0 → 1 : désagrégation en sable
  uniform float uScale;     // facteur pour convertir une taille 3D en pixels
  uniform float uObjScale;  // échelle de l'objet (réduit sur petit écran)
  uniform float uHover;     // 0 → 1 : force de répulsion de la souris
  uniform float uCamDist;   // distance entre la caméra et l'objet
  uniform float uMotion;    // 1 = animations normales, 0 = mouvement réduit
  uniform vec3 uRayO;       // rayon de la souris : son point de départ
  uniform vec3 uRayD;       // rayon de la souris : sa direction
  uniform vec3 uBlue;       // couleur bleue
  uniform vec3 uOrange;     // couleur orange
  uniform vec3 uInk;        // couleur noire

  // --- Données propres à chaque particule ---
  // (« position », fournie par Three.js, est sa place sur une arête : l'état wireframe)
  attribute vec3 aCell;     // sa place sur une face, dans la grille de code
  attribute vec3 aNormal;   // la direction « vers l'extérieur » à cet endroit
  attribute vec3 aScatter;  // sa place une fois devenue grain de sable
  attribute vec3 aGrid;     // x = colonne, y = identifiant de ligne, z = 1 si c'est un caractère
  attribute vec4 aRand;     // quatre nombres aléatoires entre 0 et 1

  // --- Valeurs transmises au fragment shader ---
  varying vec3 vColor;      // couleur de la particule
  varying float vAlpha;     // opacité
  varying float vGlyph;     // 0 = point rond, 1 = caractère de code
  varying float vIdx;       // numéro du caractère à afficher (0 à 63)

  const float PI = 3.14159265;

  // Fonction de « hasard » : renvoie toujours le même nombre (entre 0 et 1)
  // pour une même entrée. Astuce classique en GLSL, qui n'a pas de random().
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Cette particule est-elle un caractère de code ? (1 = oui, 0 = non)
    float isGlyph = aGrid.z;

    // ---------------------------------------------------------------------
    // ÉTAT 1 → 2 : du wireframe au code
    // ---------------------------------------------------------------------
    // Chaque particule part avec un léger retard (aRand.x) : elles ne
    // bougent pas toutes en même temps, ce qui donne un effet de vague.
    // smoothstep(a, b, x) renvoie 0 avant a, 1 après b, et une courbe douce entre.
    float c = isGlyph * smoothstep(aRand.x * 0.6, aRand.x * 0.6 + 0.4, uCode);
    // On adoucit encore le départ et l'arrivée (courbe en S)
    float ce = c * c * (3.0 - 2.0 * c);
    // mix(a, b, t) glisse de a vers b : de l'arête vers la case de la grille
    vec3 built = mix(position, aCell, ce);
    // Pendant le trajet, la particule s'écarte un peu du centre (trajectoire bombée)
    built += normalize(built) * sin(ce * PI) * 0.18;

    // ---------------------------------------------------------------------
    // ÉTAT 2 → 3 : la désagrégation en sable
    // ---------------------------------------------------------------------
    // Hauteur de la particule dans l'objet : 0 en bas, 1 en haut
    float h = position.y * 0.5 + 0.5;
    // Retard d'érosion : le haut part en premier, avec une part de hasard.
    // C'est ce qui fait que l'objet s'effrite du sommet vers la base.
    float d = 0.6 * (1.0 - h) + 0.4 * aRand.y;
    // Avancement de l'érosion pour CETTE particule (0 = intacte, 1 = grain libre)
    float s = smoothstep(d, d + 0.35, uSand * 1.35);
    // Un grain libre flotte doucement autour de sa position (vie permanente)
    vec3 drift = aScatter + uMotion * 0.09 * vec3(
      sin(uTime * 0.31 + aRand.z * 6.283),
      cos(uTime * 0.27 + aRand.w * 6.283),
      sin(uTime * 0.23 + aRand.x * 6.283)
    );
    // Position finale : entre l'objet construit et le nuage de sable
    vec3 pos = mix(built, drift, s);
    // Pendant la chute, le grain décrit un petit tourbillon (comme poussé par le vent)
    float angle = aRand.w * 6.283 + s * 4.0;
    pos.xz += sin(s * PI) * 0.35 * vec2(cos(angle), sin(angle));

    // ---------------------------------------------------------------------
    // RÉPULSION DE LA SOURIS
    // ---------------------------------------------------------------------
    // La souris est un point sur l'écran ; en 3D c'est une ligne droite (un
    // « rayon ») qui part de la caméra. On repousse les particules proches.
    vec3 rel = pos - uRayO;                        // de l'origine du rayon vers la particule
    vec3 perp = rel - dot(rel, uRayD) * uRayD;     // chemin le plus court entre le rayon et la particule
    float dist = length(perp);                     // distance au rayon
    // Force : maximale sur le rayon, nulle à 0.6 unité. Plus forte sur le sable.
    float force = uHover * (1.0 - smoothstep(0.0, 0.6, dist)) * mix(0.1, 0.5, s);
    // On pousse la particule en s'éloignant du rayon
    pos += normalize(perp + 0.0001) * force;

    // ---------------------------------------------------------------------
    // PROJECTION : de la 3D vers l'écran
    // ---------------------------------------------------------------------
    // modelViewMatrix place la particule par rapport à la caméra
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // projectionMatrix applique la perspective : c'est la position finale à l'écran
    gl_Position = projectionMatrix * mv;

    // À quel point cette particule est un caractère en ce moment
    // (elle le devient avec le code, elle cesse de l'être en devenant sable)
    float g = c * (1.0 - s);
    vGlyph = g;

    // ---------------------------------------------------------------------
    // QUEL CARACTÈRE AFFICHER ? (le code qui défile)
    // ---------------------------------------------------------------------
    // Chaque ligne de code a sa propre vitesse, tirée au hasard
    float rowSeed = hash(vec2(aGrid.y, 7.3));
    // « tick » : un compteur qui avance par à-coups, comme un curseur
    float tick = floor(uTime * mix(3.0, 9.0, rowSeed) * uMotion + rowSeed * 40.0);
    // On décale la colonne du nombre de ticks : les caractères glissent le long de la ligne
    float key = mod(aGrid.x + tick, 512.0);
    // Numéro du caractère dans la planche (64 caractères, de 0 à 63)
    vIdx = floor(hash(vec2(key, aGrid.y)) * 64.0);
    // Une case sur cinq reste vide : ça crée des « espaces » comme dans du vrai code
    float filled = step(0.2, hash(vec2(key + 31.0, aGrid.y + 3.0)));

    // ---------------------------------------------------------------------
    // OPACITÉ
    // ---------------------------------------------------------------------
    // Le caractère regarde-t-il vers la caméra ? (1 = face avant, 0 = face arrière)
    vec3 n = normalize(normalMatrix * aNormal);
    float front = smoothstep(-0.05, 0.3, dot(n, normalize(-mv.xyz)));
    // Profondeur : 1 pour l'avant de l'objet, 0 pour l'arrière
    float depth = smoothstep(uCamDist + uObjScale, uCamDist - uObjScale, -mv.z);
    // Wireframe : les arêtes du fond sont plus pâles (on lit mieux le volume),
    // et il s'efface un peu quand le code apparaît pour lui laisser la vedette
    float wireAlpha = mix(0.3, 1.0, depth) * mix(1.0, 0.7, uCode * (1.0 - isGlyph));
    // Caractères : presque invisibles sur les faces arrière
    float glyphAlpha = filled * mix(0.08, 1.0, front);
    // Sable : chaque grain a sa propre opacité
    float sandAlpha = mix(0.55, 1.0, aRand.x);
    // On mélange les trois selon l'état de la particule
    vAlpha = mix(mix(wireAlpha, glyphAlpha, g), sandAlpha, s);

    // ---------------------------------------------------------------------
    // COULEUR
    // ---------------------------------------------------------------------
    // Couleur du grain : 50 % noirs, 42 % bleus, 8 % orange
    vec3 sandColor = aRand.z < 0.5 ? uInk : (aRand.z < 0.92 ? uBlue : uOrange);
    // Bleu (wireframe) → orange (code) → couleur de sable
    vColor = mix(mix(uBlue, uOrange, g), sandColor, s);

    // ---------------------------------------------------------------------
    // TAILLE
    // ---------------------------------------------------------------------
    // Point fin pour le wireframe, grand pour un caractère, variable pour un grain
    float size = mix(mix(0.016, 0.09, g), mix(0.012, 0.03, aRand.y), s);
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
