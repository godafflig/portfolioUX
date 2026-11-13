// ============================================================================
// SECTION 4 — PROJETS : un couloir en profondeur
//
// Les projets sont des cartes (des rectangles plats) placées les unes derrière
// les autres dans la scène 3D, en alternance à gauche et à droite. La section
// est épinglée, et le scroll fait avancer le couloir vers nous.
//
//   - Parallaxe : gratuite ! En perspective, ce qui est proche défile plus vite.
//   - Brume     : plus une carte est loin, plus elle est transparente.
//   - Survol    : un rayon lancé depuis la souris trouve la carte visée (raycasting).
//   - Clic      : la carte vient se placer face à nous, remplit l'écran,
//                 puis la page détaillée du projet s'ouvre.
//
// Les titres ne sont PAS dessinés en 3D : ce sont de vrais boutons HTML, que
// l'on déplace à chaque image pour les coller sous leur carte. Ils restent
// ainsi nets, sélectionnables au clavier et lisibles par un lecteur d'écran.
// ============================================================================

import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { el } from '../core/dom.js'
import { isMobile, prefersReducedMotion } from '../core/env.js'

const CARD_W = 2.2 // largeur d'une carte, en unités 3D
const CARD_H = 1.375 // hauteur (format 16:10)
const SPACING = 4 // distance entre deux cartes, en profondeur
const FOG_FAR = 15 // au-delà de cette distance, la carte est invisible (noyée dans la brume)
const FOG_NEAR = 8 // en deçà, elle est pleinement visible
const OPEN_DISTANCE = 2 // distance à la caméra d'une carte ouverte en plein écran

// Interpolation linéaire : la valeur située à t (0 → 1) du chemin entre a et b
const lerp = (a, b, t) => a + (b - a) * t
// Courbe douce entre deux bornes : 0 avant a, 1 après b (fonctionne aussi avec a > b)
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
// Écrit toujours deux chiffres : 3 → « 03 »
const pad = (n) => String(n).padStart(2, '0')

// ----------------------------------------------------------------------------
// L'image d'une carte
// ----------------------------------------------------------------------------
// Si le projet a une image dans le JSON, on la charge. Sinon on dessine une
// image d'attente : fond gris clair, pointillés bleus et numéro du projet.
function buildCardTexture(item, index, placeholderText) {
  if (item.image) {
    const texture = new THREE.TextureLoader().load(item.image)
    texture.colorSpace = THREE.SRGBColorSpace // les couleurs de l'image sont affichées telles quelles
    return texture
  }

  const canvas = document.createElement('canvas') // une toile 2D invisible
  canvas.width = 800
  canvas.height = 500
  const ctx = canvas.getContext('2d')

  function draw() {
    ctx.fillStyle = '#f1f1f1' // fond gris très clair
    ctx.fillRect(0, 0, 800, 500)
    ctx.fillStyle = 'rgba(15, 30, 175, 0.45)' // pointillés bleus
    for (let x = 20; x < 800; x += 40) {
      for (let y = 20; y < 500; y += 40) ctx.fillRect(x, y, 3, 3)
    }
    ctx.strokeStyle = '#111111' // un fin cadre noir
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, 796, 496)
    ctx.fillStyle = '#111111' // le numéro du projet, en grand
    ctx.font = '800 220px "Inter Tight Variable", Arial, sans-serif'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(pad(index + 1), 36, 460)
    ctx.font = '500 22px "JetBrains Mono Variable", monospace' // la mention d'attente
    ctx.fillStyle = '#5b5b5b'
    ctx.fillText(placeholderText, 40, 60)
  }

  draw()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  // Les polices peuvent arriver après : on redessine quand elles sont prêtes
  document.fonts.ready.then(() => {
    draw()
    texture.needsUpdate = true
  })
  return texture
}

// ----------------------------------------------------------------------------
// La page détaillée d'un projet (un panneau plein écran)
// ----------------------------------------------------------------------------
function buildDetail(data) {
  const detail = el('div', 'detail')
  detail.hidden = true // cachée au départ
  detail.setAttribute('role', 'dialog') // annonce une « fenêtre » aux lecteurs d'écran
  detail.setAttribute('aria-modal', 'true') // …qui bloque le reste de la page
  detail.setAttribute('aria-labelledby', 'detail-title')

  const back = el('button', 'detail__back', `← ${data.back}`)
  back.type = 'button'
  const number = el('p', 'detail__number')
  const title = el('h2', 'detail__title')
  title.id = 'detail-title'
  const status = el('p', 'detail__status')
  const summary = el('p', 'detail__summary')
  const stack = el('ul', 'detail__stack')
  const visual = el('div', 'detail__visual')

  const inner = el('div', 'detail__inner')
  inner.append(number, title, status, summary, stack)
  detail.append(back, inner, visual)
  document.body.append(detail)

  // Remplit le panneau avec les données d'un projet
  function fill(item, index) {
    number.textContent = `${pad(index + 1)} / ${pad(data.items.length)}`
    title.textContent = item.title
    status.textContent = item.status
    status.hidden = !item.status // pas de statut : on masque la ligne
    summary.textContent = item.summary
    stack.replaceChildren(...item.stack.map((tech) => el('li', '', tech)))
    visual.replaceChildren() // on vide l'ancien visuel
    if (item.image) {
      const img = el('img')
      img.src = item.image
      img.alt = '' // décoratif : le titre décrit déjà le projet
      visual.append(img)
    } else {
      visual.append(el('span', '', data.placeholder))
    }
  }

  return { root: detail, back, fill }
}

export function initProjets(content, stage, lenis) {
  const section = document.getElementById('projets')
  const data = content.projets
  const items = data.items

  // --- Le contenu fixe de la section ---------------------------------------
  const label = el('h2', 'section-label', `${data.number} — ${data.title}`)
  label.id = 'projets-title'
  section.append(label)

  const detail = buildDetail(data)
  let opened = -1 // numéro du projet ouvert (-1 = aucun)
  let lastFocus = null // le bouton à qui rendre le focus à la fermeture

  // Affiche la page détaillée
  function showDetail(index) {
    detail.fill(items[index], index)
    detail.root.hidden = false
    gsap.fromTo(detail.root, { opacity: 0 }, { opacity: 1, duration: prefersReducedMotion ? 0 : 0.4 })
    detail.back.focus() // le clavier arrive directement sur « Retour »
  }

  // ==========================================================================
  // VERSION SANS MOUVEMENT : une simple liste de boutons
  // ==========================================================================
  if (prefersReducedMotion) {
    section.classList.add('projets--static')
    const list = el('ol', 'projets__list')
    items.forEach((item, i) => {
      const row = el('li')
      const button = el('button', 'projets__row')
      button.type = 'button'
      button.append(el('strong', '', item.title), el('small', '', item.summary))
      button.addEventListener('click', () => {
        opened = i
        lastFocus = button
        document.documentElement.style.overflow = 'hidden' // bloque le défilement derrière
        showDetail(i)
      })
      row.append(button)
      list.append(row)
    })
    section.append(list)

    const closeStatic = () => {
      if (opened < 0) return
      opened = -1
      detail.root.hidden = true
      document.documentElement.style.overflow = ''
      lastFocus?.focus()
    }
    detail.back.addEventListener('click', closeStatic)
    window.addEventListener('keydown', (e) => e.key === 'Escape' && closeStatic())

    const sensor = ScrollTrigger.create({ trigger: section, start: 'top 60%', end: 'bottom bottom' })
    return { progress: () => sensor.progress, presence: () => 0 }
  }

  // ==========================================================================
  // VERSION COULOIR 3D
  // ==========================================================================
  const hint = el('p', 'projets__hint', isMobile ? data.hintTouch : data.hint)
  hint.setAttribute('aria-hidden', 'true')
  section.append(hint)

  // --- Les titres : une couche HTML par-dessus le canvas -------------------
  const labels = el('nav', 'corridor-labels')
  labels.setAttribute('aria-label', data.title)
  document.body.append(labels)

  // --- Les cartes ----------------------------------------------------------
  const group = new THREE.Group() // le couloir entier : on le fait avancer d'un bloc
  stage.scene.add(group)
  // Une seule forme (un rectangle) partagée par toutes les cartes
  const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H)

  const cards = items.map((item, i) => {
    // MeshBasicMaterial : affiche l'image telle quelle, sans calcul de lumière
    const material = new THREE.MeshBasicMaterial({
      map: buildCardTexture(item, i, data.placeholder),
      transparent: true, // nécessaire pour faire varier l'opacité (la brume)
      opacity: 0,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.index = i // on note son numéro pour le retrouver au survol
    group.add(mesh)

    // Le titre : un vrai bouton, cliquable et accessible au clavier
    const button = el('button', 'corridor-label')
    button.type = 'button'
    const meta = item.status ? `${pad(i + 1)} · ${item.status}` : pad(i + 1)
    button.append(el('span', 'corridor-label__meta', meta), el('span', 'corridor-label__title', item.title))
    labels.append(button)

    const card = {
      mesh,
      material,
      button,
      side: i % 2 === 0 ? -1 : 1, // -1 = à gauche, +1 = à droite, en alternance
      hover: 0, // 0 → 1 : la carte est-elle survolée ? (valeur lissée)
      open: 0, // 0 → 1 : la carte est-elle en train de remplir l'écran ?
      focused: false, // le bouton a-t-il le focus ou la souris ?
    }

    // Survoler ou sélectionner le titre fait réagir la carte, et inversement
    button.addEventListener('pointerenter', () => (card.focused = true))
    button.addEventListener('pointerleave', () => (card.focused = false))
    button.addEventListener('focus', () => (card.focused = true))
    button.addEventListener('blur', () => (card.focused = false))
    button.addEventListener('click', () => open(i))
    return card
  })

  // --- L'avancement, donné par le scroll -----------------------------------
  let progress = 0 // 0 → 1 : avancée dans le couloir
  let entered = 0 // 0 → 1 : la section arrive à l'écran
  let left = 0 // 0 → 1 : la section suivante prend la place

  // On épingle la section : elle reste à l'écran pendant toute la traversée
  ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    // Durée : un peu moins d'une hauteur d'écran de scroll par projet
    end: () => `+=${window.innerHeight * items.length * 0.9}`,
    onUpdate: (self) => (progress = self.progress),
  })
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'top top',
    onUpdate: (self) => (entered = self.progress),
  })
  ScrollTrigger.create({
    trigger: '#contact',
    start: 'top bottom',
    end: 'top 40%',
    onUpdate: (self) => (left = self.progress),
  })

  // --- Dimensions qui dépendent de l'écran ---------------------------------
  let cardScale = 1 // taille des cartes (réduite sur écran étroit)
  let sideOffset = 1.4 // écart des cartes par rapport au centre du couloir
  let fillScale = 1 // agrandissement nécessaire pour remplir l'écran

  stage.onResize((view) => {
    // view.width : largeur visible au centre de la scène (7.3 sur un écran large)
    cardScale = Math.min(1, Math.max(0.45, view.width / 7.3))
    sideOffset = Math.min(1.4, view.width * 0.2 + 0.25)
    // Taille de la zone visible à OPEN_DISTANCE de la caméra (même calcul que dans stage.js)
    const fov = THREE.MathUtils.degToRad(stage.camera.fov)
    const visibleH = 2 * Math.tan(fov / 2) * OPEN_DISTANCE
    const visibleW = visibleH * stage.camera.aspect
    // La carte doit couvrir l'écran dans les deux sens : on prend le plus grand des deux rapports
    fillScale = Math.max(visibleW / CARD_W, visibleH / CARD_H) * 1.03
  })

  // --- La souris -----------------------------------------------------------
  const pointer = new THREE.Vector2(0, 0) // position de la souris, de -1 à +1
  let pointerActive = false
  const raycaster = new THREE.Raycaster()
  const corner = new THREE.Vector3() // vecteur de travail

  // Convertit une position en pixels en coordonnées -1 → +1
  const toNdc = (event, target) => {
    target.x = (event.clientX / window.innerWidth) * 2 - 1
    target.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  // Renvoie le numéro de la carte située sous un point de l'écran (-1 si aucune)
  function pick(ndc) {
    raycaster.setFromCamera(ndc, stage.camera)
    // On ne teste que les cartes assez visibles pour être cliquées
    const targets = cards.filter((c) => c.mesh.visible && c.material.opacity > 0.3).map((c) => c.mesh)
    const hit = raycaster.intersectObjects(targets)[0] // la plus proche de nous
    return hit ? hit.object.userData.index : -1
  }

  if (!isMobile) {
    window.addEventListener('pointermove', (event) => {
      toNdc(event, pointer)
      pointerActive = true
    })
  }

  // Le couloir est-il à l'écran et utilisable ?
  const isActive = () => entered > 0.95 && left < 0.2 && opened < 0

  // Un clic (ou un toucher) sur une carte l'ouvre
  window.addEventListener('click', (event) => {
    if (!isActive()) return
    // On laisse tranquilles les vrais liens et boutons de la page
    if (event.target.closest('a, button')) return
    const ndc = new THREE.Vector2()
    toNdc(event, ndc)
    const index = pick(ndc)
    if (index >= 0) open(index)
  })

  // --- Ouvrir / fermer un projet -------------------------------------------
  function open(index) {
    if (opened >= 0) return // un projet est déjà ouvert
    opened = index
    lastFocus = cards[index].button
    lenis?.stop() // on fige le défilement pendant que le projet est ouvert
    // « Entrée dans l'image » : la carte vient remplir l'écran…
    gsap.to(cards[index], {
      open: 1,
      duration: 0.9,
      ease: 'power3.inOut',
      onComplete: () => showDetail(index), // …puis la page détaillée apparaît
    })
  }

  function close() {
    if (opened < 0 || detail.root.hidden) return
    const card = cards[opened]
    // La page s'efface…
    gsap.to(detail.root, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => (detail.root.hidden = true),
    })
    // …et la carte retourne à sa place dans le couloir
    gsap.to(card, {
      open: 0,
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: () => {
        opened = -1
        lenis?.start()
        lastFocus?.focus({ preventScroll: true }) // le clavier reprend où il en était
      },
    })
  }

  detail.back.addEventListener('click', close)
  window.addEventListener('keydown', (event) => event.key === 'Escape' && close())

  // --- À chaque image ------------------------------------------------------
  let hovered = -1 // numéro de la carte sous la souris

  stage.onFrame((time, dt) => {
    // Présence du couloir : il apparaît avec la section et s'efface avec elle
    const presence = entered * (1 - left)
    // Rien à afficher : on masque tout et on s'épargne les calculs
    group.visible = presence > 0.001 || opened >= 0
    labels.style.visibility = group.visible ? 'visible' : 'hidden'
    if (!group.visible) {
      document.documentElement.style.cursor = '' // on rend son curseur normal à la souris
      return
    }

    const camZ = stage.camera.position.z
    // Le couloir avance vers nous. Au départ, la première carte est à 7 unités ;
    // à l'arrivée, la dernière est à 5.5 unités : bien visible, à côté de l'objet assemblé.
    const lastZ = (items.length - 1) * SPACING
    group.position.z = lerp(camZ - 7, camZ - 5.5 + lastZ, progress)

    // Quelle carte est sous la souris ?
    hovered = pointerActive && isActive() ? pick(pointer) : -1
    document.documentElement.style.cursor = hovered >= 0 ? 'pointer' : ''

    const ease = 1 - Math.exp(-8 * dt) // lissage indépendant de la fréquence d'images

    cards.forEach((card, i) => {
      // Survol : la valeur glisse doucement vers 1 (survolée) ou 0 (au repos)
      const hoverTarget = isActive() && (hovered === i || card.focused) ? 1 : 0
      card.hover += (hoverTarget - card.hover) * ease
      card.button.classList.toggle('is-hover', hoverTarget === 1)

      // -- Place « au repos » dans le couloir --
      const restX = card.side * sideOffset // à gauche ou à droite
      const restY = card.side * -0.1 // légèrement décalée en hauteur, pour le rythme
      const restZ = -i * SPACING + card.hover * 0.45 // au survol, elle s'approche un peu
      const restRot = -card.side * 0.32 // tournée vers le centre du couloir
      const restScale = cardScale * (1 + 0.04 * card.hover)

      // -- Place « ouverte » : au centre, face à nous, assez grande pour tout couvrir --
      const openZ = camZ - OPEN_DISTANCE - group.position.z

      // On glisse de l'une à l'autre selon card.open (0 = au repos, 1 = ouverte)
      const o = card.open
      card.mesh.position.set(lerp(restX, 0, o), lerp(restY, 0, o), lerp(restZ, openZ, o))
      card.mesh.rotation.y = lerp(restRot, 0, o)
      card.mesh.scale.setScalar(lerp(restScale, fillScale, o))

      // -- La brume : l'opacité dépend de la distance à la caméra --
      const distance = camZ - (group.position.z + card.mesh.position.z)
      const fog = smooth(FOG_FAR, FOG_NEAR, distance) // loin = transparent
      const tooClose = smooth(1.6, 3.0, distance) // elle s'efface aussi en nous frôlant
      const opacity = Math.max(o, presence * fog * tooClose)
      card.material.opacity = opacity
      card.mesh.visible = opacity > 0.01
      // Une carte ouverte passe devant tout le reste
      card.mesh.renderOrder = o > 0 ? 10 : 0

      // -- Le titre HTML suit le coin bas-gauche de la carte --
      const labelOpacity = opacity * (1 - o)
      if (labelOpacity < 0.02) {
        card.button.style.visibility = 'hidden' // invisible et hors du parcours clavier
        return
      }
      // Coin bas-gauche de la carte, dans son propre repère…
      corner.set(-CARD_W / 2, -CARD_H / 2, 0)
      card.mesh.updateWorldMatrix(true, false) // (on s'assure que sa position est à jour)
      // …converti en position dans la scène, puis « projeté » sur l'écran (-1 → +1)
      card.mesh.localToWorld(corner).project(stage.camera)
      const x = (corner.x * 0.5 + 0.5) * window.innerWidth
      const y = (-corner.y * 0.5 + 0.5) * window.innerHeight
      // Plus la carte est loin, plus le titre est petit
      const scale = Math.min(1.25, Math.max(0.45, 5 / distance))
      card.button.style.visibility = 'visible'
      card.button.style.opacity = labelOpacity
      card.button.style.transform = `translate(${x}px, ${y + 10}px) scale(${scale})`
    })
  })

  // L'objet 3D s'assemble au rythme du couloir : on lui donne son avancement
  return { progress: () => progress, presence: () => entered * (1 - left) }
}
