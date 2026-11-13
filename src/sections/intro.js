// ============================================================================
// SECTION 1 — INTRO
// Le nom en typographie géante, découpé sur deux lignes qui glissent
// en sens opposés quand on défile. L'icosaèdre passe devant.
// ============================================================================

import gsap from 'gsap'
import { el } from '../core/dom.js'
import { prefersReducedMotion } from '../core/env.js'

export function initIntro(content) {
  const section = document.getElementById('intro')
  const data = content.intro

  // --- Le nom : un <h1> (titre principal de la page) -----------------------
  const title = el('h1', 'intro__name')
  // Pour les lecteurs d'écran, on donne le nom d'un seul tenant…
  title.setAttribute('aria-label', content.meta.name)

  const lines = data.nameLines.map((text) => {
    // …et on leur cache le découpage lettre par lettre, purement visuel
    const line = el('span', 'intro__line')
    line.setAttribute('aria-hidden', 'true')
    // Une <span> par lettre : chacune pourra être animée séparément
    Array.from(text).forEach((char) => line.append(el('span', 'intro__char', char)))
    title.append(line)
    return line
  })

  // --- Le pied : métier + accroche à gauche, « défiler » à droite ----------
  const foot = el('div', 'intro__foot')
  const role = el('p', 'intro__role')
  role.append(el('strong', '', `${data.role} · ${data.location}`), el('span', '', data.tagline))
  const hint = el('span', 'intro__scroll', data.scrollHint)
  hint.setAttribute('aria-hidden', 'true')
  foot.append(role, hint)

  section.append(title, foot)

  // Mouvement réduit demandé : tout est affiché, rien ne bouge. On s'arrête là.
  if (prefersReducedMotion) return

  // --- Animation d'entrée : les lettres montent depuis sous leur ligne -----
  // gsap.from = « pars de ces valeurs et rejoins l'état normal »
  gsap.from('.intro__char', {
    yPercent: 110, // départ : décalées de 110 % de leur hauteur vers le bas (donc masquées)
    duration: 1.2, // durée en secondes
    ease: 'expo.out', // départ rapide, arrivée très douce
    stagger: 0.05, // 0.05 s de décalage entre chaque lettre
    delay: 0.15, // petite pause avant de commencer
  })

  // Le pied apparaît en fondu, un peu après
  gsap.from(foot, { opacity: 0, y: 16, duration: 1, ease: 'power2.out', delay: 0.9 })

  // --- Animation liée au scroll : les deux lignes glissent en sens opposés --
  lines.forEach((line, i) => {
    gsap.to(line, {
      // Ligne 1 vers la gauche (-18 % de sa largeur), ligne 2 vers la droite (+18 %)
      xPercent: i % 2 === 0 ? -18 : 18,
      ease: 'none', // pas d'accélération : le mouvement suit exactement le scroll
      scrollTrigger: {
        trigger: section, // l'élément surveillé
        start: 'top top', // début : le haut de la section touche le haut de l'écran
        end: 'bottom top', // fin : le bas de la section atteint le haut de l'écran
        scrub: true, // l'animation avance et recule avec le scroll
      },
    })
  })
}
