// ============================================================================
// SECTION 5 — CONTACT
// La fin de l'histoire : l'objet est terminé. Il revient au centre, ses faces
// se couvrent de code (voir objectTimeline.js), devant un dernier titre géant.
// En dessous : le message d'invitation, le bouton orange et les liens.
// ============================================================================

import gsap from 'gsap'
import { el } from '../core/dom.js'
import { prefersReducedMotion } from '../core/env.js'

// Crée un lien. Si son adresse n'est pas encore renseignée dans le JSON,
// on affiche un simple texte grisé plutôt qu'un lien qui ne mène nulle part.
function buildLink(item, className = '') {
  if (!item.href) {
    const placeholder = el('span', `${className} is-missing`.trim(), item.label)
    placeholder.title = 'Adresse à renseigner dans content.json' // info-bulle au survol
    return placeholder
  }
  const link = el('a', className, item.label)
  link.href = item.href
  // Un lien vers un autre site s'ouvre dans un nouvel onglet.
  // rel="noopener" : par sécurité, la page ouverte n'a aucun accès à la nôtre.
  if (item.href.startsWith('http')) {
    link.target = '_blank'
    link.rel = 'noopener'
  }
  return link
}

export function initContact(content) {
  const section = document.getElementById('contact')
  const data = content.contact

  // --- Le vrai titre de la section, en petite étiquette --------------------
  const label = el('h2', 'section-label', `${data.number} — ${data.title}`)
  label.id = 'contact-title'

  // --- Le titre géant sur deux lignes --------------------------------------
  const headline = el('p', 'contact__headline')
  const lines = data.headline.map((text) => {
    const line = el('span', 'contact__headline-line', text)
    headline.append(line)
    return line
  })

  // --- Le message, le bouton et les liens ----------------------------------
  const foot = el('div', 'contact__foot')
  const main = el('div')
  main.append(el('p', 'contact__invite', data.invitation), buildLink(data.cta, 'cta'))
  const links = el('div', 'contact__links')
  data.links.forEach((item) => links.append(buildLink(item)))
  foot.append(main, links)

  // --- La dernière ligne : signature et retour en haut ---------------------
  const end = el('div', 'contact__end')
  const top = el('a', '', data.backToTop)
  top.href = '#intro'
  // L'année est calculée : elle sera toujours à jour
  end.append(el('span', '', `© ${new Date().getFullYear()} ${content.meta.name}`), top)

  section.append(label, headline, foot, end)

  // Mouvement réduit demandé : tout est affiché, rien ne bouge
  if (prefersReducedMotion) return

  // --- Les deux lignes glissent en sens opposés ----------------------------
  // Elles partent écartées et se rejoignent à mesure que la section arrive :
  // comme l'objet, le titre « se rassemble ».
  lines.forEach((line, i) => {
    const direction = i % 2 === 0 ? -1 : 1 // la première vient de la gauche, la seconde de la droite
    gsap.fromTo(
      line,
      { xPercent: 14 * direction }, // écartée de 14 % de sa largeur…
      {
        xPercent: 0, // …jusqu'à sa place
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom', // dès que la section entre par le bas
          end: 'bottom bottom', // jusqu'à ce qu'elle remplisse l'écran
          scrub: true,
        },
      },
    )
  })

  // Le message et les liens montent en fondu une fois la section presque en place
  gsap.from([foot, end], {
    opacity: 0,
    y: 24,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: { trigger: section, start: 'top 35%', once: true },
  })
}
