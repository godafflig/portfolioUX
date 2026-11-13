// ============================================================================
// POINT D'ENTRÉE DU SITE
// Ce fichier ne fait qu'une chose : démarrer chaque partie, dans le bon ordre.
// ============================================================================

// --- Polices (installées avec npm : aucun appel à un serveur extérieur) ----
import '@fontsource-variable/inter-tight' // titres et texte
import '@fontsource-variable/jetbrains-mono' // étiquettes et caractères de code

// --- Styles ----------------------------------------------------------------
import './styles/main.css'

// --- Contenu : tous les textes du site viennent de ce fichier JSON ----------
import content from './data/content.json'

// --- Les briques du site -----------------------------------------------------
import { initScroll } from './core/scroll.js' // défilement fluide
import { createStage } from './three/stage.js' // scène 3D
import { createSignature } from './three/signature.js' // l'icosaèdre de particules
import { initHeader } from './sections/header.js' // en-tête
import { initIntro } from './sections/intro.js' // section 1
import { initAbout } from './sections/about.js' // section 2
import { initParcours } from './sections/parcours.js' // section 3
import { initProjets } from './sections/projets.js' // section 4
import { initStubs } from './sections/stubs.js' // section 5 (provisoire)
import { ScrollTrigger } from 'gsap/ScrollTrigger' // pour recalculer les positions de scroll
import { initObjectTimeline } from './sections/objectTimeline.js' // scénario de l'objet

// 1. Titre de l'onglet et description, tirés du JSON
document.title = content.meta.title
document.querySelector('meta[name="description"]').setAttribute('content', content.meta.description)

// 2. Le défilement fluide (Lenis) et les animations liées au scroll (ScrollTrigger)
const lenis = initScroll()
// En développement seulement (jamais sur le site en ligne), on rend Lenis accessible
// depuis la console du navigateur : pratique pour tester, ex. lenis.scrollTo(1200)
if (import.meta.env.DEV) window.lenis = lenis

// 3. Le contenu HTML des sections (à faire AVANT de poser les capteurs de scroll,
//    qui ont besoin de connaître la hauteur réelle de la page)
const header = initHeader(content)
initIntro(content)
initAbout(content)
const parcours = initParcours(content)
initStubs(content)

// 4. La scène 3D et l'objet signature
const stage = createStage(document.getElementById('stage'))
const signature = createSignature(stage)
// En développement seulement : l'objet est accessible depuis la console pour faire des essais,
// ex. signature.uniforms.uGlyphShare.value = 1 (que des caractères dans la galaxie)
if (import.meta.env.DEV) window.signature = signature

// 5. Le lien entre le scroll et l'objet
//    (le couloir des projets a besoin de la scène 3D : il est créé ici, après elle)
const projets = initProjets(content, stage, lenis)
initObjectTimeline(stage, signature, header, parcours, projets)

// 6. Premier calcul de taille : tout est prêt, on peut dessiner
stage.start()

// 7. Quand les polices sont chargées, les textes changent légèrement de taille,
//    donc la hauteur de la page aussi : on demande aux capteurs de scroll
//    de remesurer leurs positions.
document.fonts.ready.then(() => ScrollTrigger.refresh())
