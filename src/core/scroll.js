// ============================================================================
// DÉFILEMENT
// Lenis rend le défilement fluide (il « lisse » la molette).
// GSAP ScrollTrigger relie des animations à la position de défilement.
// Ce fichier branche les deux ensemble.
// ============================================================================

import gsap from 'gsap' // la bibliothèque d'animation
import { ScrollTrigger } from 'gsap/ScrollTrigger' // son module « animations liées au scroll »
import Lenis from 'lenis' // le défilement fluide
import 'lenis/dist/lenis.css' // les quelques règles CSS dont Lenis a besoin
import { prefersReducedMotion } from './env.js' // faut-il réduire les animations ?

export function initScroll() {
  // On déclare ScrollTrigger à GSAP (obligatoire avant de s'en servir)
  gsap.registerPlugin(ScrollTrigger)

  // Mouvement réduit demandé : on garde le défilement natif du navigateur.
  // ScrollTrigger fonctionne très bien sans Lenis.
  if (prefersReducedMotion) return null

  // On crée Lenis.
  const lenis = new Lenis({
    lerp: 0.1, // « inertie » : à chaque image on parcourt 10 % du chemin restant
    anchors: true, // les liens #about, #contact… défilent en douceur
  })

  // À chaque mouvement de Lenis, on prévient ScrollTrigger pour qu'il
  // mette à jour les animations liées au scroll.
  lenis.on('scroll', ScrollTrigger.update)

  // GSAP possède une « horloge » (ticker) qui bat à chaque image affichée.
  // On y accroche Lenis : une seule boucle d'animation pour tout le site.
  // GSAP donne le temps en secondes, Lenis l'attend en millisecondes (× 1000).
  gsap.ticker.add((time) => lenis.raf(time * 1000))

  // Par défaut GSAP « rattrape » les retards après un ralentissement,
  // ce qui provoque des sauts avec Lenis : on désactive ce rattrapage.
  gsap.ticker.lagSmoothing(0)

  // On renvoie Lenis au cas où une autre partie du site en aurait besoin
  return lenis
}
