// ============================================================================
// ENVIRONNEMENT
// Deux questions posées une fois au démarrage, et réutilisées partout :
// « faut-il réduire les animations ? » et « est-on sur mobile ? »
// ============================================================================

// matchMedia interroge le navigateur avec une « media query », comme en CSS.
// Ici : la personne a-t-elle activé « réduire les animations » dans son système ?
export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Écran étroit OU pointeur « grossier » (un doigt) : on considère que c'est un mobile.
// On s'en sert pour afficher moins de particules et garder 60 images/seconde.
export const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

// Les couleurs de la direction artistique, en un seul endroit pour le JavaScript.
// (Le CSS a les siennes dans src/styles/main.css : gardez les deux identiques.)
export const COLORS = {
  blue: 0x0f1eaf, // structure : wireframe
  orange: 0xfd641f, // énergie : code
  ink: 0x111111, // noir : grains de sable
}
