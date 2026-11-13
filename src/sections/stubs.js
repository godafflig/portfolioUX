// ============================================================================
// SECTION PROVISOIRE — Contact
//
// Cette section affiche déjà le contenu du fichier JSON, sous une forme
// volontairement simple. Elle sera remplacée par sa vraie version à l'étape 5.
// ============================================================================

import { el } from '../core/dom.js'

export function initStubs(content) {
  const data = content.contact
  const section = document.getElementById('contact')

  // L'ossature : numéro, titre, mention « à construire »
  const inner = el('div', 'stub__inner')
  inner.append(
    el('p', 'stub__number', data.number),
    el('h2', 'stub__title', data.title),
    el('p', 'stub__todo', 'Version provisoire · étape 5'),
  )
  section.append(inner)

  const actions = el('div', 'stub__actions')
  // Le bouton d'appel à l'action (orange)
  const cta = el('a', 'cta', data.cta.label)
  // Tant que l'adresse n'est pas renseignée dans le JSON, le lien ne mène nulle part
  cta.href = data.cta.href || '#contact'
  actions.append(cta)
  // Les liens GitHub / LinkedIn
  data.links.forEach((item) => {
    const link = el('a', '', item.label)
    link.href = item.href || '#contact'
    actions.append(link)
  })
  inner.append(el('p', 'stub__invite', data.invitation), actions)
}
