// ============================================================================
// L'OBJET SIGNATURE : un icosaèdre fait de particules
//
// Un icosaèdre est un solide à 20 faces triangulaires, 30 arêtes, 12 sommets.
// L'objet raconte une construction, en cinq temps. Chaque particule connaît
// donc CINQ positions, calculées une seule fois ici :
//   1. dans la galaxie          → le code épars, des caractères et des grains
//   2. sur un bout de ligne     → les lignes décomposées, posées de travers
//   3. sur une ligne droite     → les arêtes entières, encore détachées
//   4. sur une arête de la forme → l'icosaèdre assemblé
//   5. sur une face, en grille  → le produit final, couvert de code
// Ensuite, la carte graphique glisse d'une position à l'autre (voir
// signature.shaders.js) selon quatre curseurs pilotés par le scroll :
// `state.gather`, `state.align`, `state.assemble` et `state.code`.
// ============================================================================

import * as THREE from 'three'
import { COLORS, isMobile, prefersReducedMotion } from '../core/env.js'
import { vertexShader, fragmentShader } from './signature.shaders.js'

// Rayon de l'icosaèdre, en unités 3D
const RADIUS = 1
// Nombre de particules : version allégée sur mobile
const PARTICLE_COUNT = isMobile ? 6000 : 14000
// En combien de bouts chaque arête est découpée pour l'étape « lignes décomposées »
const FRAGMENTS_PER_EDGE = 5
// Part des grains de la galaxie affichés comme caractères de code (le reste : des points).
// 0 = que du sable, 1 = que des caractères.
const GLYPH_SHARE = 0.45
// Les 64 caractères qui composent le « code »
const GLYPHS = '{}[]()<>=;:+-*/#&|!?$_.%^~@01234567abcdefghijklmnopqrstuvwxyzACS'

// Convertit une couleur 0xRRVVBB en trois nombres entre 0 et 1 (format des shaders)
function hexToVec3(hex) {
  return new THREE.Vector3(
    ((hex >> 16) & 255) / 255, // rouge : les 8 bits de gauche
    ((hex >> 8) & 255) / 255, // vert : les 8 bits du milieu
    (hex & 255) / 255, // bleu : les 8 bits de droite
  )
}

// Renvoie une direction tirée au hasard (un vecteur de longueur 1)
function randomDirection() {
  return new THREE.Vector3().randomDirection()
}

// ----------------------------------------------------------------------------
// 1. La géométrie : on récupère les faces et les arêtes de l'icosaèdre
// ----------------------------------------------------------------------------
function buildIcosahedron() {
  // Three.js sait construire un icosaèdre (0 = aucune subdivision : la forme pure)
  const geometry = new THREE.IcosahedronGeometry(RADIUS, 0)
  // La liste de ses sommets, rangés par groupes de 3 (un groupe = un triangle)
  const position = geometry.attributes.position

  // On range chaque triangle dans un tableau : faces = [[a, b, c], …]
  const faces = []
  for (let i = 0; i < position.count; i += 3) {
    faces.push([
      new THREE.Vector3().fromBufferAttribute(position, i),
      new THREE.Vector3().fromBufferAttribute(position, i + 1),
      new THREE.Vector3().fromBufferAttribute(position, i + 2),
    ])
  }

  // Les sommets sont répétés d'un triangle à l'autre : on ne garde que les 12 uniques
  const vertices = []
  faces.flat().forEach((v) => {
    // « déjà connu » = un sommet enregistré se trouve (presque) au même endroit
    const known = vertices.some((u) => u.distanceTo(v) < 1e-4)
    if (!known) vertices.push(v)
  })

  // Longueur d'une arête = distance entre deux sommets d'un même triangle
  const edgeLength = faces[0][0].distanceTo(faces[0][1])

  // Une arête relie deux sommets séparés exactement de cette longueur.
  // On teste toutes les paires de sommets : on en trouve 30.
  const edges = []
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (Math.abs(vertices[i].distanceTo(vertices[j]) - edgeLength) < 1e-3) {
        edges.push([vertices[i], vertices[j]])
      }
    }
  }

  // La géométrie de Three.js ne sert plus : on libère sa mémoire
  geometry.dispose()

  return { faces, edges }
}

// ----------------------------------------------------------------------------
// 2. Les poses de chaque arête avant l'assemblage
// ----------------------------------------------------------------------------
// Pour chaque arête, on invente deux « poses » antérieures à la forme finale :
//   - la ligne droite   : l'arête entière, écartée du centre et un peu tournée
//   - les bouts de ligne : la même arête coupée en morceaux, chacun jeté de travers
function buildPoses(edges) {
  return edges.map(([a, b]) => {
    const length = a.distanceTo(b) // longueur de l'arête
    const middle = a.clone().add(b).multiplyScalar(0.5) // son milieu
    const direction = b.clone().sub(a).normalize() // sa direction (vecteur de longueur 1)

    // -- Pose « ligne droite » --
    // Le milieu est poussé vers l'extérieur (× 1.2 à 1.55) puis décalé d'un petit hasard :
    // les arêtes ne se touchent plus, comme les pièces d'une notice de montage
    const lineCenter = middle
      .clone()
      .multiplyScalar(1.2 + Math.random() * 0.35)
      .add(randomDirection().multiplyScalar(0.18))
    // Et la ligne est tournée de quelques degrés (jusqu'à ±0.5 radian, soit ±28°)
    // autour d'un axe au hasard : elle n'est pas encore dans le bon sens
    const lineDirection = direction
      .clone()
      .applyAxisAngle(randomDirection(), (Math.random() - 0.5) * 1.0)

    // -- Pose « bouts de ligne » --
    const fragments = []
    for (let k = 0; k < FRAGMENTS_PER_EDGE; k++) {
      // Où se trouve ce bout sur la ligne droite, mesuré depuis son milieu
      const offset = ((k + 0.5) / FRAGMENTS_PER_EDGE - 0.5) * length
      // On part de là, puis on l'écarte au hasard (de 0.15 à 0.55 unité)
      const center = lineCenter
        .clone()
        .addScaledVector(lineDirection, offset)
        .add(randomDirection().multiplyScalar(0.15 + Math.random() * 0.4))
      fragments.push({
        center, // le milieu du bout de ligne
        direction: randomDirection(), // son orientation, complètement au hasard
        seed: Math.random(), // un nombre au hasard, partagé par toutes ses particules
      })
    }

    // seed : un nombre au hasard partagé par toutes les particules de l'arête
    return { a, b, length, lineCenter, lineDirection, fragments, seed: Math.random() }
  })
}

// ----------------------------------------------------------------------------
// 3. La grille de code : des cases alignées en lignes sur chaque face
// ----------------------------------------------------------------------------
function buildCells(faces) {
  const COL = 0.05 // largeur d'une case (espace entre deux caractères)
  const ROW = 0.092 // hauteur d'une ligne de code
  const MARGIN = 0.045 // marge avec le bord du triangle
  const cells = []

  faces.forEach(([a, b, c], faceIndex) => {
    // La « normale » : la direction qui sort de la face (du centre vers l'extérieur)
    const normal = a.clone().add(b).add(c).normalize()
    // u : la direction des lignes de code, le long du côté a → b
    const u = b.clone().sub(a).normalize()
    // v : perpendiculaire à u, dans le plan de la face (direction « ligne suivante »)
    const v = new THREE.Vector3().crossVectors(normal, u).normalize()
    // Le vecteur du sommet a vers le sommet c
    const ac = c.clone().sub(a)
    // On veut que v pointe vers c (vers l'intérieur du triangle) : sinon on l'inverse
    if (ac.dot(v) < 0) v.negate()

    const width = b.distanceTo(a) // longueur de la base du triangle
    const height = ac.dot(v) // hauteur du triangle
    const apexX = ac.dot(u) // où se trouve la pointe, mesurée le long de la base

    // On parcourt le triangle ligne par ligne…
    let row = 0
    for (let y = ROW * 0.6; y < height - MARGIN; y += ROW, row++) {
      // À cette hauteur, le triangle va de `left` à `right` (il se resserre vers la pointe)
      const left = (apexX * y) / height + MARGIN
      const right = width + ((apexX - width) * y) / height - MARGIN
      // …et case par case
      let col = 0
      for (let x = 0; x < width; x += COL, col++) {
        // Case en dehors du triangle : on la saute
        if (x < left || x > right) continue
        // Position 3D de la case : on part de a, on avance de x le long de u,
        // de y le long de v, et on décolle à peine de la surface
        const point = a
          .clone()
          .addScaledVector(u, x)
          .addScaledVector(v, y)
          .addScaledVector(normal, 0.004)
        // rowKey : un identifiant unique de ligne (face + numéro de ligne)
        cells.push({ point, normal, col, rowKey: faceIndex * 64 + row })
      }
    }
  })

  return cells
}

// ----------------------------------------------------------------------------
// 4. La planche de caractères : une image contenant les 64 glyphes
// ----------------------------------------------------------------------------
function buildAtlas() {
  const SIZE = 512 // taille de l'image en pixels
  const CELL = SIZE / 8 // grille de 8 × 8 cases de 64 px
  // On dessine dans un <canvas> 2D invisible, jamais ajouté à la page
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE) // on efface tout (fond transparent)
    ctx.fillStyle = '#fff' // lettres blanches : la couleur est appliquée par le shader
    ctx.textAlign = 'center' // centrées horizontalement dans la case
    ctx.textBaseline = 'middle' // et verticalement
    ctx.font = '700 44px "JetBrains Mono Variable", ui-monospace, Consolas, monospace'
    // Chaque caractère dans sa case : colonne = i modulo 8, ligne = i divisé par 8
    Array.from(GLYPHS).forEach((char, i) => {
      const x = (i % 8) * CELL + CELL / 2
      const y = Math.floor(i / 8) * CELL + CELL / 2
      ctx.fillText(char, x, y)
    })
  }

  // Premier dessin, avec la police disponible à cet instant
  draw()

  // On transforme le canvas en « texture » : une image utilisable par la carte graphique
  const texture = new THREE.CanvasTexture(canvas)
  // « Mipmaps » : des copies de plus en plus petites de l'image, préparées à l'avance.
  // Dans la galaxie, beaucoup de caractères sont minuscules : la carte graphique pioche
  // alors dans la copie de la bonne taille, et ils restent nets au lieu de scintiller.
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter

  // La police JetBrains Mono peut arriver après : on redessine quand elle est chargée
  document.fonts.load('700 44px "JetBrains Mono Variable"').then(() => {
    draw()
    texture.needsUpdate = true // prévient Three.js que l'image a changé
  })

  return texture
}

// ----------------------------------------------------------------------------
// 5. L'objet complet
// ----------------------------------------------------------------------------
export function createSignature(stage) {
  const { faces, edges } = buildIcosahedron()
  const poses = buildPoses(edges)
  const cells = buildCells(faces)

  // --- Les tableaux de données, un par « attribut » de particule -----------
  // Float32Array = tableau de nombres compact, le format attendu par la carte graphique
  const N = PARTICLE_COUNT
  const aScatter = new Float32Array(N * 3) // 1. position dans la galaxie (x, y, z)
  const aFrag = new Float32Array(N * 3) // 2. position sur un bout de ligne
  const aLine = new Float32Array(N * 3) // 3. position sur une ligne droite
  const aEdge = new Float32Array(N * 3) // 4. position sur une arête de la forme
  const aCell = new Float32Array(N * 3) // 5. position dans la grille de code
  const aNormal = new Float32Array(N * 3) // direction « vers l'extérieur »
  const aGroup = new Float32Array(N * 3) // place sur le bout de ligne + hasards partagés
  const aGrid = new Float32Array(N * 3) // colonne, ligne, est-un-caractère-de-face
  const aRand = new Float32Array(N * 4) // 4 nombres aléatoires

  const p = new THREE.Vector3() // vecteurs de travail, réutilisés pour ne pas en créer 14 000
  const q = new THREE.Vector3()

  for (let i = 0; i < N; i++) {
    // i % poses.length répartit les particules équitablement entre les 30 arêtes
    const pose = poses[i % poses.length]
    // t : où se trouve la particule le long de l'arête (0 = un bout, 1 = l'autre)
    const t = Math.random()

    // -- Position 4 : sur l'arête de la forme finale --
    // lerpVectors(a, b, t) : le point situé à t du chemin de a vers b
    p.lerpVectors(pose.a, pose.b, t)
    aEdge.set([p.x, p.y, p.z], i * 3)

    // -- Position 3 : au même endroit de la ligne droite, encore détachée --
    // On part du milieu de la ligne et on avance de (t - 0.5) × longueur dans sa direction
    q.copy(pose.lineCenter).addScaledVector(pose.lineDirection, (t - 0.5) * pose.length)
    aLine.set([q.x, q.y, q.z], i * 3)

    // -- Position 2 : sur un bout de ligne --
    // k : dans quel bout tombe la particule (0 à 4)
    const k = Math.min(FRAGMENTS_PER_EDGE - 1, Math.floor(t * FRAGMENTS_PER_EDGE))
    // along : sa place à l'intérieur de ce bout (0 = début, 1 = fin)
    const along = t * FRAGMENTS_PER_EDGE - k
    const fragment = pose.fragments[k]
    q.copy(fragment.center).addScaledVector(
      fragment.direction,
      (along - 0.5) * (pose.length / FRAGMENTS_PER_EDGE),
    )
    aFrag.set([q.x, q.y, q.z], i * 3)
    // Les hasards partagés : toutes les particules d'un même bout (ou d'une même arête)
    // reçoivent le même nombre, ce qui leur permet de bouger ensemble
    aGroup.set([along, fragment.seed, pose.seed], i * 3)

    // -- Position 5 : une case de la grille de code --
    // Les premières particules deviendront des caractères (une par case) ;
    // les autres restent sur leur arête et continuent de dessiner la forme.
    const cell = cells[i]
    if (cell) {
      aCell.set([cell.point.x, cell.point.y, cell.point.z], i * 3)
      aNormal.set([cell.normal.x, cell.normal.y, cell.normal.z], i * 3)
      aGrid.set([cell.col, cell.rowKey, 1], i * 3)
    } else {
      aCell.set([p.x, p.y, p.z], i * 3)
      // Pour un point d'arête, « l'extérieur » est simplement la direction depuis le centre
      const n = p.clone().normalize()
      aNormal.set([n.x, n.y, n.z], i * 3)
      aGrid.set([0, 0, 0], i * 3)
    }

    // -- Position 1 : un grain dans la galaxie, un large nuage --
    aScatter.set(
      [
        (Math.random() - 0.5) * 10, // largeur : de -5 à +5
        -2.2 + Math.pow(Math.random(), 1.8) * 4.4, // hauteur : la puissance concentre les grains vers le bas
        -3.5 + Math.random() * 5, // profondeur : de -3.5 (loin) à +1.5 (près)
      ],
      i * 3,
    )

    // -- Le hasard propre à cette particule (retards, taille, couleur…) --
    aRand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
  }

  // --- La géométrie : on y range tous les attributs ------------------------
  const geometry = new THREE.BufferGeometry()
  // « position » est le nom imposé par Three.js : on y met la position sur l'arête.
  // Le second nombre indique combien de valeurs par particule (3 = x, y, z).
  geometry.setAttribute('position', new THREE.BufferAttribute(aEdge, 3))
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(aScatter, 3))
  geometry.setAttribute('aFrag', new THREE.BufferAttribute(aFrag, 3))
  geometry.setAttribute('aLine', new THREE.BufferAttribute(aLine, 3))
  geometry.setAttribute('aCell', new THREE.BufferAttribute(aCell, 3))
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(aNormal, 3))
  geometry.setAttribute('aGroup', new THREE.BufferAttribute(aGroup, 3))
  geometry.setAttribute('aGrid', new THREE.BufferAttribute(aGrid, 3))
  geometry.setAttribute('aRand', new THREE.BufferAttribute(aRand, 4))

  // --- Le matériau : nos deux shaders + les valeurs qu'on leur envoie ------
  const uniforms = {
    uTime: { value: 0 },
    uGather: { value: 0 },
    uAlign: { value: 0 },
    uAssemble: { value: 0 },
    uCode: { value: 0 },
    uGlyphShare: { value: GLYPH_SHARE },
    uScale: { value: 1 },
    uObjScale: { value: 1 },
    uHover: { value: 0 },
    uCamDist: { value: stage.camera.position.z },
    uMotion: { value: prefersReducedMotion ? 0 : 1 },
    uRayO: { value: new THREE.Vector3(0, 0, 100) }, // au départ : un rayon très loin, sans effet
    uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uBlue: { value: hexToVec3(COLORS.blue) },
    uOrange: { value: hexToVec3(COLORS.orange) },
    uInk: { value: hexToVec3(COLORS.ink) },
    uAtlas: { value: buildAtlas() },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true, // les particules ont des bords transparents
    depthWrite: false, // elles ne se cachent pas les unes les autres (évite des carrés noirs)
  })

  // Points = un objet Three.js qui dessine un carré par sommet de la géométrie
  const points = new THREE.Points(geometry, material)
  // Les particules sortent largement de la forme finale : on interdit à
  // Three.js de masquer l'objet quand il le croit hors champ
  points.frustumCulled = false

  // --- La coque invisible, pour détecter le survol -------------------------
  // Le « raycasting » lance un rayon depuis la souris et cherche ce qu'il touche.
  // Il lui faut une surface : un icosaèdre plein, jamais affiché.
  const hull = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS * 1.05, 0))
  hull.visible = false // non dessiné, mais toujours détectable par le rayon

  // Un groupe rassemble les deux : on déplace / tourne / réduit le groupe entier
  const group = new THREE.Group()
  group.add(points, hull)
  stage.scene.add(group)

  // --- L'état piloté par le scroll (modifié par src/sections/objectTimeline.js)
  const state = {
    gather: 0, // 0 = galaxie, 1 = lignes décomposées
    align: 0, // 0 = lignes décomposées, 1 = lignes droites
    assemble: 0, // 0 = lignes droites détachées, 1 = icosaèdre assemblé
    code: 0, // 0 = forme nue, 1 = faces couvertes de code
    x: 0, // décalage horizontal, en proportion de la largeur visible
    scale: 1, // échelle supplémentaire
    spin: 0, // rotation ajoutée par le scroll, en radians
  }

  // --- La souris -----------------------------------------------------------
  const pointer = new THREE.Vector2(0, 0) // position de la souris, de -1 à +1 sur chaque axe
  const smooth = new THREE.Vector2(0, 0) // la même, lissée (elle suit avec un léger retard)
  let pointerActive = false // la souris a-t-elle bougé ?
  let hovered = false // la souris survole-t-elle l'objet ?
  let idleSpin = 0 // rotation automatique accumulée
  let spinSpeed = 0.12 // vitesse de rotation actuelle (radians par seconde)

  // On n'écoute la souris que sur un vrai pointeur (pas au doigt),
  // et pas si les animations doivent être réduites
  if (!isMobile && !prefersReducedMotion) {
    window.addEventListener('pointermove', (event) => {
      // On convertit les pixels en coordonnées -1 → +1 (le centre de l'écran vaut 0).
      // L'axe vertical est inversé : en 3D « haut » est positif, en pixels c'est l'inverse.
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
      pointerActive = true
    })
    // La souris quitte la page : on coupe la répulsion
    document.addEventListener('pointerleave', () => (pointerActive = false))
  }

  const raycaster = new THREE.Raycaster() // l'outil qui lance les rayons
  const inverse = new THREE.Matrix4() // sert à passer du monde vers « l'intérieur » de l'objet
  const localRay = new THREE.Ray() // le rayon, exprimé dans le repère de l'objet
  let view = stage.getView() // taille de la zone visible, en unités 3D
  let fit = 1 // échelle d'ajustement à l'écran

  // --- Redimensionnement ---------------------------------------------------
  stage.onResize((newView) => {
    view = newView
    // Sur écran étroit, on réduit l'objet pour qu'il tienne dans la largeur
    fit = Math.min(1, view.width * 0.42)
    // Facteur de conversion « taille 3D → pixels » pour gl_PointSize :
    // hauteur du dessin en pixels ÷ (2 × tan(angle de vue / 2))
    const fov = THREE.MathUtils.degToRad(stage.camera.fov)
    const bufferHeight = stage.renderer.domElement.height
    uniforms.uScale.value = bufferHeight / (2 * Math.tan(fov / 2))
  })

  // --- À chaque image ------------------------------------------------------
  stage.onFrame((time, dt) => {
    // On transmet le temps et l'état du scroll aux shaders
    uniforms.uTime.value = time
    uniforms.uGather.value = state.gather
    uniforms.uAlign.value = state.align
    uniforms.uAssemble.value = state.assemble
    uniforms.uCode.value = state.code

    // Position et échelle du groupe
    const scale = fit * state.scale
    group.scale.setScalar(scale)
    group.position.x = state.x * view.width
    uniforms.uObjScale.value = scale

    // La position lissée rejoint la vraie position de la souris petit à petit.
    // (1 - e^(-k·dt) : un lissage qui donne le même résultat quelle que soit la fréquence d'images)
    const ease = 1 - Math.exp(-6 * dt)
    smooth.lerp(pointer, ease)

    // Rotation automatique : plus rapide au survol, à l'arrêt en mouvement réduit
    const targetSpeed = prefersReducedMotion ? 0 : hovered ? 0.45 : 0.12
    spinSpeed += (targetSpeed - spinSpeed) * ease
    idleSpin += spinSpeed * dt

    // Rotation finale = automatique + scroll + légère inclinaison vers la souris
    group.rotation.y = idleSpin + state.spin + smooth.x * 0.35
    group.rotation.x = 0.25 - smooth.y * 0.25

    // Three.js recalcule la « matrice » du groupe (sa position/rotation/échelle
    // réunies) : on en a besoin tout de suite pour le rayon
    group.updateMatrixWorld()

    // On lance le rayon depuis la caméra à travers la souris
    raycaster.setFromCamera(smooth, stage.camera)
    // Touche-t-il la coque ? (seulement une fois la forme assemblée)
    hovered = pointerActive && state.assemble > 0.5 && raycaster.intersectObject(hull).length > 0

    // Les particules sont calculées dans le repère de l'objet (qui tourne) :
    // on y transporte le rayon grâce à la matrice inverse
    inverse.copy(points.matrixWorld).invert()
    localRay.copy(raycaster.ray).applyMatrix4(inverse)
    uniforms.uRayO.value.copy(localRay.origin)
    uniforms.uRayD.value.copy(localRay.direction)

    // La force de répulsion monte ou descend en douceur
    const hoverTarget = pointerActive ? 1 : 0
    uniforms.uHover.value += (hoverTarget - uniforms.uHover.value) * ease
  })

  // On expose l'état pour que le scroll puisse le piloter
  // (et les uniforms, pour pouvoir régler l'objet depuis la console en développement)
  return { state, group, uniforms }
}
