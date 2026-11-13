// ============================================================================
// SECTION 3 — PARCOURS
// Une frise chronologique qui défile HORIZONTALEMENT alors qu'on scrolle
// verticalement. Le principe :
//   1. on « épingle » la section : elle reste fixée à l'écran pendant un moment
//   2. pendant ce temps, on fait glisser vers la gauche une longue bande
//      (la « piste ») qui contient un écran par étape
// S'y ajoutent une ligne bleue qui se trace, des pastilles qui s'allument,
// et des années géantes en arrière-plan qui défilent à une autre vitesse.
// ============================================================================

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { el } from '../core/dom.js'
import { prefersReducedMotion } from '../core/env.js'

export function initParcours(content) {
  const section = document.getElementById('parcours')
  const data = content.parcours
  const steps = data.steps

  // --- Le titre de la section (reste fixe pendant que la frise défile) -----
  const label = el('h2', 'section-label', `${data.number} — ${data.title}`)
  label.id = 'parcours-title' // la <section> y fait référence avec aria-labelledby

  // --- La piste : la longue bande qui glissera vers la gauche --------------
  const track = el('div', 'parcours__track')
  // La ligne bleue, purement décorative
  const line = el('div', 'parcours__line')
  line.setAttribute('aria-hidden', 'true')
  // La liste ordonnée des étapes (ordonnée : l'ordre a un sens)
  const list = el('ol', 'parcours__list')

  const panels = steps.map((step) => {
    // Un « panneau » = un écran entier pour une étape
    const panel = el('li', `parcours__panel parcours__panel--${step.type}`)

    // L'année géante en arrière-plan (ou un mot, quand l'année n'est pas renseignée)
    const year = el('span', 'parcours__year', String(step.year ?? step.mark ?? ''))
    year.setAttribute('aria-hidden', 'true') // décor : la période est déjà écrite plus bas

    // La pastille posée sur la ligne
    const node = el('span', 'parcours__node')
    node.setAttribute('aria-hidden', 'true')

    // Le contenu : type d'étape, titre, sous-titre, période
    const body = el('div', 'parcours__content')
    const type = el('p', 'parcours__type')
    type.append(el('span', `badge badge--${step.type}`), el('span', '', data.types[step.type]))
    body.append(type, el('h3', 'parcours__title', step.title), el('p', 'parcours__subtitle', step.subtitle))
    if (step.period) body.append(el('p', 'parcours__period', step.period))

    panel.append(year, node, body)
    list.append(panel)
    return { panel, year }
  })
  track.append(line, list)

  // --- Le compteur « 01 / 09 » ---------------------------------------------
  const counter = el('p', 'parcours__counter')
  counter.setAttribute('aria-hidden', 'true')

  section.append(label, track, counter)

  // Écrit toujours deux chiffres : 3 → « 03 »
  const pad = (n) => String(n).padStart(2, '0')

  // --- Mouvement réduit : pas de défilement horizontal ---------------------
  // Les étapes sont simplement empilées les unes sous les autres (voir le CSS),
  // toutes « allumées ». On renvoie quand même un avancement pour l'objet 3D.
  if (prefersReducedMotion) {
    section.classList.add('parcours--static')
    panels.forEach(({ panel }) => panel.classList.add('is-active'))
    const sensor = ScrollTrigger.create({ trigger: section, start: 'top 70%', end: 'bottom 70%' })
    return { progress: () => sensor.progress }
  }

  const last = steps.length - 1 // numéro de la dernière étape (8 pour 9 étapes)

  // La distance à parcourir : la largeur de la piste moins un écran
  // (le premier panneau est déjà visible au départ)
  const distance = () => track.scrollWidth - window.innerWidth

  // Avancement de l'ARRIVÉE de la section (rempli plus bas par un capteur) :
  // 0 quand elle pointe en bas de l'écran, 1 quand elle le remplit
  let entered = 0
  // Avancement de la frise elle-même, de 0 (première étape) à 1 (dernière)
  let progress = 0

  // L'animation principale : la piste glisse vers la gauche
  const slide = gsap.to(track, {
    x: () => -distance(), // une fonction : recalculée si la fenêtre change de taille
    ease: 'none', // suit exactement le scroll
    scrollTrigger: {
      trigger: section,
      pin: true, // épingle la section : elle reste à l'écran pendant l'animation
      start: 'top top', // dès que la section remplit l'écran
      // Durée de l'épinglage, en pixels de scroll : 70 % de la distance horizontale
      // (un peu moins de scroll que de déplacement : la frise avance d'un bon pas)
      end: () => `+=${distance() * 0.7}`,
      scrub: true, // avance et recule avec le scroll
      invalidateOnRefresh: true, // recalcule les distances au redimensionnement
      // À chaque mouvement, on note l'avancement puis on rafraîchit l'affichage
      onUpdate: (self) => {
        progress = self.progress
        update()
      },
    },
  })

  // Le capteur d'arrivée : il sert à tracer le début de la ligne
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'top top',
    onUpdate: (self) => {
      entered = self.progress
      update()
    },
  })

  // Met à jour la ligne, les pastilles et le compteur
  function update() {
    const position = progress * last // l'avancement converti en « numéro d'étape » : de 0 à 8

    // La ligne : elle s'étire depuis la gauche. Pendant l'arrivée de la section,
    // elle se trace jusqu'à 60 % de l'écran ; ensuite elle garde cette avance.
    line.style.transform = `scaleX(${(entered * 0.6 + position) / steps.length})`

    // Une étape s'allume quand la ligne l'a atteinte
    panels.forEach(({ panel }, i) => {
      panel.classList.toggle('is-active', entered > 0.5 && i <= position + 0.5)
    })

    // Le compteur affiche l'étape la plus proche
    counter.textContent = `${pad(Math.round(position) + 1)} / ${pad(steps.length)}`
  }

  // --- Parallaxe des années géantes ----------------------------------------
  // Chaque année glisse à contresens dans son panneau : elle semble donc
  // défiler plus lentement que le texte, comme un décor lointain.
  panels.forEach(({ panel, year }) => {
    gsap.fromTo(
      year,
      { xPercent: 25 }, // décalée à droite quand le panneau entre…
      {
        xPercent: -25, // …à gauche quand il sort
        ease: 'none',
        scrollTrigger: {
          trigger: panel,
          // containerAnimation : on mesure la position du panneau dans la piste
          // qui glisse (horizontalement), et non dans la page (verticalement)
          containerAnimation: slide,
          start: 'left right', // le bord gauche du panneau entre par la droite de l'écran
          end: 'right left', // son bord droit sort par la gauche
          scrub: true,
        },
      },
    )
  })

  update() // premier affichage du compteur

  // L'objet 3D se construit au rythme de la frise : on lui donne son avancement
  return { progress: () => progress }
}
