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
//   Contact   → le code vient couvrir les faces : le produit, rangé dans un coin libre
//               de l'écran pour ne pas passer devant le texte
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

  // --- La pose finale, dans la section Contact -----------------------------
  // Le produit terminé ne doit pas passer devant le texte. On cherche donc, en pixels,
  // la plus grande zone libre de l'écran une fois la page défilée jusqu'en bas :
  //   A. à droite de la première ligne du titre (« Une idée ? » est plus courte que l'écran)
  //   B. au-dessus du titre, sous l'étiquette « 04 — Contact »
  // et on y loge l'objet, le plus grand possible. Sur ordinateur c'est en général A,
  // sur téléphone B.
  const contact = document.getElementById('contact')
  const contactHeadline = contact.querySelector('.contact__headline')
  const contactLines = contact.querySelectorAll('.contact__headline-line')
  const contactLabel = contact.querySelector('.section-label')
  const headerEl = document.getElementById('header')
  const MARGIN = 16 // espace laissé entre l'objet et le texte, en pixels
  let contactPose = null // { x, y, scale } ; recalculée quand l'écran ou la mise en page change

  function measureContactPose() {
    const width = canvas.clientWidth // taille de l'écran (le canvas le couvre en entier)
    const height = canvas.clientHeight
    const em = parseFloat(getComputedStyle(contactHeadline).fontSize) // taille du titre géant
    const gutter = parseFloat(getComputedStyle(contactLines[0]).paddingLeft) // marge latérale
    // Tout en bas de la page, le bas de la section touche le bas de l'écran :
    // on décale les mesures d'autant pour obtenir les positions « à l'arrivée »
    const shift = height - contact.getBoundingClientRect().bottom
    const [line1, line2] = [...contactLines].map((line) => line.getBoundingClientRect())
    // Largeur du texte de la première ligne (la ligne, elle, fait toute la largeur de l'écran)
    const range = document.createRange()
    range.selectNodeContents(contactLines[0])
    const textRight = gutter + range.getBoundingClientRect().width

    const top = Math.max(headerEl.getBoundingClientRect().bottom, 0)
    // Les lettres ne remplissent pas toute leur ligne : les capitales commencent
    // 0.07em sous le haut de la ligne, et l'accent du É dépasse de 0.15em au-dessus.
    const zoneA = {
      left: textRight + MARGIN,
      right: width - gutter,
      top,
      bottom: line2.top + shift + 0.07 * em - MARGIN,
    }
    const zoneB = {
      left: gutter,
      right: width - gutter,
      top: Math.max(top, contactLabel.getBoundingClientRect().bottom + shift + MARGIN),
      bottom: line1.top + shift - 0.15 * em - MARGIN,
    }
    // Le diamètre qui tient dans une zone = son plus petit côté
    const room = (zone) => Math.min(zone.right - zone.left, zone.bottom - zone.top)
    const zone = room(zoneA) >= room(zoneB) ? zoneA : zoneB

    // Rayon de l'objet à l'écran, en pixels, quand son échelle vaut 1
    const view = stage.getView()
    const radiusAtScale1 = (signature.baseRadius() / view.height) * height
    // 0.44 et non 0.5 : les caractères de code débordent un peu des arêtes.
    // On ne dépasse jamais la taille normale de l'objet, et on garde un minimum visible.
    const scale = Math.min(1, Math.max(0.12, (room(zone) * 0.44) / radiusAtScale1))
    return {
      // centre de la zone, converti en proportion de l'écran (0 = le centre)
      x: (zone.left + zone.right) / 2 / width - 0.5,
      y: 0.5 - (zone.top + zone.bottom) / 2 / height,
      scale,
    }
  }
  // La mise en page a pu changer : on remesurera à la prochaine image
  ScrollTrigger.addEventListener('refresh', () => (contactPose = null))
  window.addEventListener('resize', () => (contactPose = null))

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
    // « away » : l'objet est-il dans une des poses du milieu de page ? Oui dès « À propos »,
    // plus au contact : (1 - product.progress) vaut 1 avant le contact et tombe à 0.
    const away = gather.progress * (1 - product.progress)
    // Dans le couloir, l'objet est au centre, au fond : petit au départ,
    // il grandit à mesure qu'on avance vers lui (de 40 % à 75 % de sa taille)
    const corridorScale = lerp(0.4, 0.75, projets.progress())

    if (isMobile) {
      // Sur mobile, pas la place de le décaler : il reste centré derrière le texte,
      // un peu plus petit et plus pâle pour ne pas gêner la lecture…
      state.x = 0
      state.scale = lerp(1, lerp(0.85, corridorScale, corridor.progress), gather.progress)
      // …sauf dans le couloir, où le canvas doit rester net pour montrer les cartes
      canvas.style.opacity = 1 - 0.6 * away * (1 - corridor.progress)
    } else {
      // Sur ordinateur, trois poses successives :
      //   « À propos » : à 10 % à droite du centre, à cheval sur le bord de la photo, taille 70 %
      //   « Parcours » : à 24 % à droite du centre, taille 80 %
      //   « Projets »  : au centre, au bout du couloir
      const x = lerp(lerp(0.1, 0.24, afterAbout.progress), 0, corridor.progress)
      const scale = lerp(lerp(0.7, 0.8, afterAbout.progress), corridorScale, corridor.progress)
      // « away » fait le lien avec la pose centrée de l'intro et avec la pose finale
      state.x = x * away
      state.scale = lerp(1, scale, gather.progress)
    }

    // -- La pose finale : l'objet rejoint sa zone libre à mesure que le contact arrive --
    state.y = 0
    if (product.progress > 0) {
      if (!contactPose) contactPose = measureContactPose()
      state.x += contactPose.x * product.progress
      state.y = contactPose.y * product.progress
      state.scale = lerp(state.scale, contactPose.scale, product.progress)
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
