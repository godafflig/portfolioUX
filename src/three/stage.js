// ============================================================================
// LA SCÈNE 3D
// Trois choses sont nécessaires pour afficher de la 3D avec Three.js :
//   - une scène   : le « plateau » qui contient les objets
//   - une caméra  : le point de vue
//   - un renderer : le « peintre » qui dessine la scène dans le <canvas>
// ============================================================================

import * as THREE from 'three' // la bibliothèque 3D
import gsap from 'gsap' // on réutilise l'horloge de GSAP pour la boucle d'animation
import { isMobile } from '../core/env.js' // mobile = réglages allégés

export function createStage(canvas) {
  // --- Le renderer ---------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas, // on dessine dans le <canvas id="stage"> de la page
    alpha: true, // fond transparent : on voit la page blanche et le texte derrière
    antialias: false, // inutile pour des particules, et ça économise le processeur graphique
    powerPreference: 'high-performance', // demande la carte graphique la plus rapide
  })

  // Le « pixel ratio » est la densité de l'écran (2 ou 3 sur un écran Retina).
  // Plus il est élevé, plus il y a de pixels à dessiner : on le plafonne
  // pour tenir les 60 images/seconde (1.5 sur mobile, 2 sur ordinateur).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))

  // --- La scène ------------------------------------------------------------
  const scene = new THREE.Scene()

  // --- La caméra -----------------------------------------------------------
  // PerspectiveCamera(angle de vue, proportions, distance min, distance max)
  // 35° = un angle assez serré, qui déforme peu (rendu « produit »).
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
  // On recule la caméra de 6.5 unités pour voir l'objet placé à l'origine (0, 0, 0)
  camera.position.z = 6.5

  // --- Les abonnés ---------------------------------------------------------
  // Les autres fichiers s'inscrivent ici pour être appelés
  // à chaque image (frame) ou à chaque redimensionnement (resize).
  const frameCallbacks = new Set()
  const resizeCallbacks = new Set()

  // Calcule la taille de la zone visible au niveau de l'objet (à z = 0),
  // en unités 3D. Utile pour placer l'objet « à 25 % de la largeur », etc.
  function getView() {
    // Angle de vue converti de degrés en radians
    const fov = THREE.MathUtils.degToRad(camera.fov)
    // Hauteur visible = 2 × distance × tan(angle / 2) (trigonométrie du triangle)
    const height = 2 * Math.tan(fov / 2) * camera.position.z
    // Largeur visible = hauteur × proportions de l'écran
    const width = height * camera.aspect
    return { width, height }
  }

  // --- Redimensionnement ---------------------------------------------------
  function resize() {
    const w = window.innerWidth // largeur de la fenêtre en pixels
    const h = window.innerHeight // hauteur de la fenêtre en pixels
    // Taille du dessin. false = ne touche pas au CSS (le canvas est déjà en 100 %)
    renderer.setSize(w, h, false)
    // La caméra doit connaître les nouvelles proportions…
    camera.aspect = w / h
    // …et recalculer sa projection, sinon l'image est étirée
    camera.updateProjectionMatrix()
    // On prévient tous les abonnés
    resizeCallbacks.forEach((fn) => fn(getView()))
  }

  // On écoute le redimensionnement de la fenêtre
  window.addEventListener('resize', resize)

  // --- Boucle d'animation --------------------------------------------------
  // L'horloge de GSAP appelle cette fonction à chaque image (~60 fois/seconde).
  // time = secondes écoulées depuis le début ; deltaTime = millisecondes depuis l'image précédente.
  gsap.ticker.add((time, deltaTime) => {
    // On convertit le delta en secondes, et on le borne : après un changement
    // d'onglet il peut être énorme et ferait « sauter » les animations.
    const dt = Math.min(deltaTime / 1000, 0.05)
    // Chaque abonné met à jour ses objets…
    frameCallbacks.forEach((fn) => fn(time, dt))
    // …puis on dessine l'image
    renderer.render(scene, camera)
  })

  // Ce que les autres fichiers peuvent utiliser
  return {
    renderer,
    scene,
    camera,
    getView,
    // s'abonner à chaque image
    onFrame: (fn) => frameCallbacks.add(fn),
    // s'abonner au redimensionnement (appelé une première fois tout de suite)
    onResize: (fn) => {
      resizeCallbacks.add(fn)
      fn(getView())
    },
    // premier calcul de taille, à appeler quand tout est prêt
    start: resize,
  }
}
