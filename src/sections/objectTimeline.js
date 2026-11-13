// ============================================================================
// LE SCÉNARIO DE L'OBJET : quel état, à quel endroit de la page ?
//
// On pose des « capteurs » (ScrollTrigger) sur les sections. Chacun fournit
// un avancement entre 0 et 1 : 0 quand on entre dans sa zone, 1 quand on en sort.
// À chaque image, on combine ces avancements pour régler l'icosaèdre.
//
//   Intro     → wireframe bleu
//   À propos  → l'objet se décale à droite pour laisser la place au texte
//   Parcours  → le wireframe se couvre de code
//   Projets   → l'objet se désagrège en sable
//   Contact   → les grains se rassemblent et reforment l'objet
// ============================================================================

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isMobile } from '../core/env.js'

export function initObjectTimeline(stage, signature, header) {
  const { state } = signature

  // Crée un capteur sans animation : on lira simplement sa propriété .progress
  const sensor = (trigger, start, end) => ScrollTrigger.create({ trigger, start, end })

  // « top bottom » se lit : « quand le HAUT de la section atteint le BAS de l'écran »
  const about = sensor('#about', 'top bottom', 'top 20%') // l'objet se décale
  const code = sensor('#parcours', 'top 70%', 'bottom 70%') // wireframe → code
  const erode = sensor('#projets', 'top 60%', 'bottom bottom') // code → sable
  const reform = sensor('#contact', 'top 85%', 'bottom bottom') // sable → objet
  // Un capteur sur toute la page, pour faire tourner l'objet avec le scroll
  const page = ScrollTrigger.create({ start: 0, end: 'max' })

  const canvas = stage.renderer.domElement

  stage.onFrame(() => {
    // Wireframe → code : directement l'avancement dans le parcours
    state.code = code.progress

    // Sable : monte pendant les projets, redescend pendant le contact.
    // (1 - reform.progress) vaut 1 avant le contact et tombe à 0 : il « annule » le sable.
    state.sand = erode.progress * (1 - reform.progress)

    // « away » : l'objet est-il écarté du centre ? Oui dès « À propos », plus au contact.
    const away = about.progress * (1 - reform.progress)

    if (isMobile) {
      // Sur mobile, pas la place de le décaler : il reste centré derrière le texte,
      // un peu plus petit et plus pâle pour ne pas gêner la lecture
      state.x = 0
      state.scale = 1 - 0.15 * away
      canvas.style.opacity = 1 - 0.6 * away
    } else {
      // Sur ordinateur : décalé de 24 % de la largeur vers la droite, légèrement réduit
      state.x = 0.24 * away
      state.scale = 1 - 0.2 * away
    }

    // Un tour et demi sur toute la longueur de la page (2π radians = un tour)
    state.spin = page.progress * Math.PI * 3

    // L'étiquette d'état dans l'en-tête
    if (reform.progress > 0.6) header.setState(3) // 04 — Produit
    else if (state.sand > 0.4) header.setState(2) // 03 — Érosion
    else if (state.code > 0.5) header.setState(1) // 02 — Code
    else header.setState(0) // 01 — Maquette
  })
}
