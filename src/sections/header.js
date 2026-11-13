// ============================================================================
// EN-TÊTE : nom, étiquette d'état de l'objet 3D, navigation
// ============================================================================

import { el } from '../core/dom.js'

export function initHeader(content) {
  const header = document.getElementById('header')

  // --- À gauche : le nom, qui ramène en haut de page ------------------------
  const brand = el('a', 'header__brand', content.meta.name)
  brand.href = '#intro'

  // --- Au centre : l'état courant de l'icosaèdre ---------------------------
  // aria-hidden : c'est un détail décoratif, inutile pour un lecteur d'écran
  const hud = el('div', 'hud')
  hud.setAttribute('aria-hidden', 'true')
  const dot = el('span', 'hud__dot') // la pastille colorée
  const index = el('span', 'hud__index') // « 01 »
  const label = el('span', 'hud__label') // « Maquette »
  const detail = el('span', 'hud__detail') // « — l'idée »
  hud.append(dot, index, label, detail)

  // --- À droite : la navigation --------------------------------------------
  const nav = el('nav', 'nav')
  nav.setAttribute('aria-label', 'Navigation principale')
  content.nav.forEach((item) => {
    const link = el('a', '', item.label)
    link.href = item.href
    nav.append(link)
  })

  header.append(brand, hud, nav)

  // Fonction appelée par le scroll pour afficher un nouvel état (0, 1, 2 ou 3)
  let current = -1 // -1 = rien d'affiché pour l'instant
  function setState(i) {
    if (i === current) return // déjà affiché : on ne touche pas à la page pour rien
    current = i
    const data = content.hud[i]
    hud.dataset.state = i // le CSS change la couleur de la pastille selon cette valeur
    index.textContent = data.index
    label.textContent = data.label
    detail.textContent = `— ${data.detail}`
  }

  setState(0) // au chargement : état 01, la maquette

  return { setState }
}
