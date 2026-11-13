// ============================================================================
// LE SCÉNARIO DE L'OBJET : quel état, à quel endroit de la page ?
//
// On pose des « capteurs » (ScrollTrigger) sur les sections. Chacun fournit
// un avancement entre 0 et 1 : 0 quand on entre dans sa zone, 1 quand on en sort.
// À chaque image, on recopie ces avancements dans l'état de l'objet.
//
//   Intro     → la galaxie : du code épars, des caractères et des grains
//   À propos  → la galaxie se rassemble en lignes décomposées
//   Parcours  → les lignes décomposées se tendent en lignes droites
//   Projets   → au bout du couloir, les lignes droites s'assemblent : la forme finale
//   Contact   → le code vient couvrir les faces : le produit
// ============================================================================

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isMobile } from '../core/env.js'

// `parcours` et `projets` sont ce que renvoient initParcours et initProjets :
// ils donnent l'avancement de la frise et celui du couloir
export function initObjectTimeline(stage, signature, header, parcours, projets) {
  const { state } = signature

  // Crée un capteur sans animation : on lira simplement sa propriété .progress
  const sensor = (trigger, start, end) => ScrollTrigger.create({ trigger, start, end })

  // « top bottom » se lit : « quand le HAUT de la section atteint le BAS de l'écran »
  const gather = sensor('#about', 'top bottom', 'top 20%') // galaxie → lignes décomposées
  const afterAbout = sensor('#parcours', 'top bottom', 'top 30%') // l'objet change de place après « À propos »
  const corridor = sensor('#projets', 'top bottom', 'top top') // l'objet va se placer au bout du couloir
  const product = sensor('#contact', 'top 85%', 'bottom bottom') // forme finale → produit couvert de code
  // Un capteur sur toute la page, pour faire tourner l'objet avec le scroll
  const page = ScrollTrigger.create({ start: 0, end: 'max' })

  const canvas = stage.renderer.domElement

  // « lerp » (interpolation linéaire) : la valeur située à t (entre 0 et 1)
  // du chemin entre a et b. lerp(10, 20, 0.5) = 15.
  const lerp = (a, b, t) => a + (b - a) * t

  // onFrameEarly : ce calcul passe AVANT la mise à jour de l'objet 3D,
  // qui se sert de ces valeurs dans la même image
  stage.onFrameEarly(() => {
    // -- Les quatre curseurs de la construction --
    state.gather = gather.progress
    // Lignes décomposées → lignes droites : au rythme de la frise du parcours.
    // (÷ 0.85 : la transformation est terminée un peu avant la dernière étape)
    state.align = Math.min(1, parcours.progress() / 0.85)
    // Lignes droites → forme finale : au rythme du couloir des projets
    state.assemble = Math.min(1, projets.progress() / 0.85)
    state.code = product.progress

    // -- La place et la taille de l'objet --
    // « away » : l'objet est-il écarté de sa pose centrée ? Oui dès « À propos », plus au contact.
    // (1 - product.progress) vaut 1 avant le contact et tombe à 0 : il ramène l'objet au centre.
    const away = gather.progress * (1 - product.progress)
    // Dans le couloir, l'objet est au centre, au fond : petit au départ,
    // il grandit à mesure qu'on avance vers lui (de 40 % à 75 % de sa taille)
    const corridorScale = lerp(0.4, 0.75, projets.progress())

    if (isMobile) {
      // Sur mobile, pas la place de le décaler : il reste centré derrière le texte,
      // un peu plus petit et plus pâle pour ne pas gêner la lecture…
      state.x = 0
      state.scale = lerp(1, lerp(0.85, corridorScale, corridor.progress), away)
      // …sauf dans le couloir, où le canvas doit rester net pour montrer les cartes
      canvas.style.opacity = 1 - 0.6 * away * (1 - corridor.progress)
    } else {
      // Sur ordinateur, trois poses successives :
      //   « À propos » : à 10 % à droite du centre, à cheval sur le bord de la photo, taille 70 %
      //   « Parcours » : à 24 % à droite du centre, taille 80 %
      //   « Projets »  : au centre, au bout du couloir
      const x = lerp(lerp(0.1, 0.24, afterAbout.progress), 0, corridor.progress)
      const scale = lerp(lerp(0.7, 0.8, afterAbout.progress), corridorScale, corridor.progress)
      // « away » fait le lien avec la pose centrée (intro et contact)
      state.x = x * away
      state.scale = lerp(1, scale, away)
    }

    // Un tour et demi sur toute la longueur de la page (2π radians = un tour)
    state.spin = page.progress * Math.PI * 3

    // L'étiquette d'état dans l'en-tête : on affiche la dernière étape entamée pour de bon
    if (state.assemble > 0.6) header.setState(3) // 04 — Produit
    else if (state.align > 0.5) header.setState(2) // 03 — Construction
    else if (state.gather > 0.5) header.setState(1) // 02 — Esquisse
    else header.setState(0) // 01 — Érosion
  })
}
