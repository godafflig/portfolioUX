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
import { initStubs } from './sections/stubs.js' // sections 2 à 5 (provisoires)
import { initObjectTimeline } from './sections/objectTimeline.js' // scénario de l'objet

// 1. Titre de l'onglet et description, tirés du JSON
document.title = content.meta.title
document.querySelector('meta[name="description"]').setAttribute('content', content.meta.description)

// 2. Le défilement fluide (Lenis) et les animations liées au scroll (ScrollTrigger)
initScroll()

// 3. Le contenu HTML des sections (à faire AVANT de poser les capteurs de scroll,
//    qui ont besoin de connaître la hauteur réelle de la page)
const header = initHeader(content)
initIntro(content)
initStubs(content)

// 4. La scène 3D et l'objet signature
const stage = createStage(document.getElementById('stage'))
const signature = createSignature(stage)

// 5. Le lien entre le scroll et l'objet
initObjectTimeline(stage, signature, header)

// 6. Premier calcul de taille : tout est prêt, on peut dessiner
stage.start()
