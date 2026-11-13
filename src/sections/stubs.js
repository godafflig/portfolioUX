// ============================================================================
// SECTIONS PROVISOIRES — À propos, Parcours, Projets, Contact
//
// Ces sections affichent déjà le contenu du fichier JSON, sous une forme
// volontairement simple. Elles donnent à la page sa longueur réelle, ce qui
// permet de régler les transformations de l'icosaèdre dès maintenant.
// Chacune sera remplacée par sa vraie version aux prochaines étapes.
// ============================================================================

import { el } from '../core/dom.js'

// Construit l'ossature commune : numéro, titre, mention « à construire »
function buildShell(id, data, todo) {
  const section = document.getElementById(id)
  const inner = el('div', 'stub__inner')
  inner.append(
    el('p', 'stub__number', data.number),
    el('h2', 'stub__title', data.title),
    el('p', 'stub__todo', todo),
  )
  section.append(inner)
  return inner
}

// Construit une ligne de liste : pastille + titre + sous-titre
function buildItem(badgeClass, title, subtitle) {
  const item = el('li')
  const text = el('div')
  text.append(el('strong', '', title), el('small', '', subtitle))
  item.append(el('span', `badge ${badgeClass}`), text)
  return item
}

export function initStubs(content) {
  // --- À propos ------------------------------------------------------------
  const about = buildShell('about', content.about, 'Version provisoire · étape 2')
  const text = el('div', 'stub__text')
  // Une ligne du JSON = un paragraphe (plus tard : apparition ligne par ligne)
  content.about.lines.forEach((line) => text.append(el('p', '', line)))
  about.append(text)

  // --- Parcours ------------------------------------------------------------
  const parcours = buildShell('parcours', content.parcours, 'Version provisoire · étape 3')
  const steps = el('ol', 'stub__list')
  content.parcours.steps.forEach((step) => {
    // Classe de la pastille selon le type : orange (pro), bleu (formation), noir (déclic)
    const badge = step.type === 'pro' ? 'badge--pro' : step.type === 'formation' ? 'badge--formation' : ''
    // filter(Boolean) retire les morceaux vides avant de les relier par un point médian
    const subtitle = [step.subtitle, step.period].filter(Boolean).join(' · ')
    steps.append(buildItem(badge, step.title, subtitle))
  })
  parcours.append(steps)

  // --- Projets -------------------------------------------------------------
  const projets = buildShell('projets', content.projets, 'Version provisoire · étape 4')
  const items = el('ol', 'stub__list')
  content.projets.items.forEach((project) => {
    // Le statut (« En cours », « Freelance ») est ajouté au titre s'il existe
    const title = project.status ? `${project.title} — ${project.status}` : project.title
    items.append(buildItem('', title, project.summary))
  })
  projets.append(items)

  // --- Contact -------------------------------------------------------------
  const contact = buildShell('contact', content.contact, 'Version provisoire · étape 5')
  const actions = el('div', 'stub__actions')
  // Le bouton d'appel à l'action (orange)
  const cta = el('a', 'cta', content.contact.cta.label)
  // Tant que l'adresse n'est pas renseignée dans le JSON, le lien ne mène nulle part
  cta.href = content.contact.cta.href || '#contact'
  actions.append(cta)
  // Les liens GitHub / LinkedIn
  content.contact.links.forEach((item) => {
    const link = el('a', '', item.label)
    link.href = item.href || '#contact'
    actions.append(link)
  })
  contact.append(el('p', 'stub__invite', content.contact.invitation), actions)
}
