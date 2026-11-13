// ============================================================================
// SECTION 2 — À PROPOS
// - un titre géant sur deux lignes qui glissent en sens opposés
// - un texte qui apparaît ligne par ligne
// - une photo en parallaxe (plusieurs couches qui défilent à des vitesses différentes)
// L'icosaèdre, lui, passe DEVANT le titre et la photo, et DERRIÈRE le texte
// (voir les z-index dans src/styles/main.css).
// ============================================================================

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText' // module GSAP qui découpe un texte en lignes
import { el } from '../core/dom.js'
import { prefersReducedMotion } from '../core/env.js'

// ----------------------------------------------------------------------------
// Apparition d'un texte ligne par ligne
// ----------------------------------------------------------------------------
// Le navigateur décide seul où couper les lignes selon la largeur de l'écran :
// on ne peut pas le savoir à l'avance. SplitText mesure le texte affiché et
// emballe chaque ligne réelle dans sa propre balise, qu'on peut alors animer.
function revealLines(element) {
  let lines = [] // les balises de lignes créées par SplitText
  let revealed = false // le texte a-t-il déjà été révélé ?

  SplitText.create(element, {
    type: 'lines', // on découpe en lignes (pas en mots ni en lettres)
    mask: 'lines', // chaque ligne reçoit un « masque » : ce qui en sort est invisible
    aria: 'none', // on ne touche pas à l'accessibilité : le texte reste lu normalement
    autoSplit: true, // redécoupe tout seul si la largeur change ou quand la police arrive
    // onSplit est appelé à chaque découpage (le premier, puis chaque redécoupage)
    onSplit(self) {
      lines = self.lines
      // Tant que le texte n'a pas été révélé, on cache chaque ligne
      // en la descendant de 110 % de sa hauteur, donc sous son masque
      if (!revealed) gsap.set(lines, { yPercent: 110 })
    },
  })

  // Un capteur de scroll : se déclenche quand le haut du texte
  // arrive à 85 % de la hauteur de l'écran (donc un peu avant le bas)
  ScrollTrigger.create({
    trigger: element,
    start: 'top 85%',
    once: true, // une seule fois : le texte ne se recache pas quand on remonte
    onEnter() {
      revealed = true
      // Les lignes remontent à leur place, l'une après l'autre
      gsap.to(lines, {
        yPercent: 0, // position normale
        duration: 1, // une seconde par ligne
        ease: 'expo.out', // départ vif, arrivée très douce
        stagger: 0.09, // 0.09 s d'écart entre deux lignes
      })
    },
  })
}

export function initAbout(content) {
  const section = document.getElementById('about')
  const data = content.about

  // --- L'en-tête : étiquette + titre géant ---------------------------------
  const head = el('header', 'about__head')
  // Le vrai titre de la section, pour la structure de la page et les lecteurs d'écran
  const label = el('h2', 'section-label', `${data.number} — ${data.title}`)
  label.id = 'about-title' // la <section> y fait référence avec aria-labelledby
  // Le titre géant, une <span> par ligne
  const headline = el('p', 'about__headline')
  const headlineLines = data.headline.map((text) => {
    const line = el('span', 'about__headline-line', text)
    headline.append(line)
    return line
  })
  head.append(label, headline)

  // --- Le texte ------------------------------------------------------------
  const text = el('div', 'about__text')
  const lead = el('p', 'about__lead', data.lead) // la phrase d'accroche
  const paragraphs = data.paragraphs.map((p) => el('p', 'about__paragraph', p))

  // Le double profil : une ligne par métier, avec sa pastille de couleur
  // (bleu = UX/UI, la maquette ; orange = développement, le code)
  const profile = el('ul', 'about__profile')
  data.profile.forEach((item) => {
    const row = el('li')
    const body = el('div')
    body.append(el('strong', '', item.label), el('small', '', item.detail))
    row.append(el('span', `badge badge--${item.type}`), body)
    profile.append(row)
  })
  text.append(lead, ...paragraphs, profile)

  // --- La photo ------------------------------------------------------------
  // Quatre boîtes emboîtées, chacune avec un rôle :
  //   figure : ne bouge pas, sert de repère au scroll
  //   mover  : se déplace verticalement (couche de premier plan)
  //   frame  : la « fenêtre » qui coupe ce qui dépasse
  //   inner  : l'image, plus grande que la fenêtre, qui glisse à l'intérieur
  const figure = el('figure', 'about__photo')
  const mover = el('div', 'about__photo-move')
  const frame = el('div', 'about__photo-frame')
  let inner
  if (data.photo.src) {
    // Une photo est renseignée dans le JSON : on l'affiche deux fois, l'une sur l'autre.
    //   dessous : la photo en deux tons (bleu et blanc), raccord avec la direction artistique
    //   dessus  : la photo en vraies couleurs, invisible, qui apparaît au survol (voir le CSS)
    inner = el('div', 'about__photo-inner')
    const makeImage = (className) => {
      const img = el('img', className)
      img.src = data.photo.src
      img.loading = 'lazy' // chargée seulement quand on s'en approche
      return img
    }
    const duotone = makeImage('about__photo-img about__photo-img--duotone')
    duotone.alt = data.photo.alt // texte de remplacement pour les lecteurs d'écran
    const color = makeImage('about__photo-img about__photo-img--color')
    color.alt = '' // doublon décoratif : ignoré par les lecteurs d'écran
    inner.append(duotone, color)

    // Le filtre « deux tons », décrit en SVG et appliqué par le CSS (filter: url(#duotone)).
    //   1. feColorMatrix : remplace chaque couleur par sa luminosité (un gris)
    //   2. feComponentTransfer : étire ce gris entre le bleu de la DA (pour le noir) et le blanc
    //      (0.059, 0.118, 0.686 = les parts de rouge, vert, bleu de #0F1EAF)
    document.body.insertAdjacentHTML(
      'beforeend',
      `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
        <filter id="duotone" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.059 1"/>
            <feFuncG type="table" tableValues="0.118 1"/>
            <feFuncB type="table" tableValues="0.686 1"/>
          </feComponentTransfer>
        </filter>
      </svg>`,
    )
  } else {
    // Pas encore de photo : un fond pointillé avec une mention
    inner = el('div', 'about__photo-inner about__photo-placeholder')
    inner.append(el('span', '', data.photo.placeholder))
  }
  frame.append(inner)
  mover.append(frame, el('figcaption', '', data.photo.caption))
  figure.append(mover)

  // --- Assemblage ----------------------------------------------------------
  const grid = el('div', 'about__grid')
  grid.append(text, figure)
  section.append(head, grid)

  // Mouvement réduit demandé : tout est affiché, rien ne bouge. On s'arrête là.
  if (prefersReducedMotion) return

  // On déclare SplitText à GSAP (obligatoire avant de s'en servir)
  gsap.registerPlugin(ScrollTrigger, SplitText)

  // --- 1. Le titre géant glisse en sens opposés ----------------------------
  headlineLines.forEach((line, i) => {
    // +1 pour la première ligne, -1 pour la seconde : elles vont à l'inverse l'une de l'autre
    const direction = i % 2 === 0 ? 1 : -1
    // fromTo = « pars de la première valeur, arrive à la seconde »
    gsap.fromTo(
      line,
      { xPercent: 6 * direction }, // décalée de 6 % de sa largeur d'un côté…
      {
        xPercent: -6 * direction, // …jusqu'à 6 % de l'autre côté
        ease: 'none', // suit exactement le scroll
        scrollTrigger: {
          trigger: head,
          start: 'top bottom', // dès que l'en-tête entre par le bas de l'écran
          end: 'bottom top', // jusqu'à ce qu'il soit sorti par le haut
          scrub: true, // avance et recule avec le scroll
        },
      },
    )
  })

  // --- 2. Le texte apparaît ligne par ligne --------------------------------
  revealLines(lead)
  paragraphs.forEach(revealLines)

  // Les deux lignes du double profil arrivent en fondu, l'une après l'autre
  gsap.from(profile.children, {
    opacity: 0, // départ : invisibles
    y: 24, // et 24 px plus bas
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: { trigger: profile, start: 'top 88%', once: true },
  })

  // --- 3. La photo se dévoile ----------------------------------------------
  // clip-path découpe la zone visible d'un élément. inset(haut droite bas gauche) :
  // « 100 % en haut » rogne tout ; en revenant à 0 %, la photo se dévoile de bas en haut.
  gsap.fromTo(
    figure,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: figure, start: 'top 85%', once: true },
      // Une fois fini, on retire le clip-path : il ne sert plus à rien
      onComplete: () => gsap.set(figure, { clearProps: 'clipPath' }),
    },
  )

  // --- 4. La parallaxe -----------------------------------------------------
  // Principe : ce qui est proche de nous semble bouger vite, ce qui est loin
  // semble bouger lentement (comme le paysage vu d'un train). On donne donc
  // des vitesses différentes à chaque couche pour créer de la profondeur.
  // Les deux animations suivent le passage de la photo dans l'écran :
  const whilePhotoVisible = () => ({
    trigger: figure,
    start: 'top bottom', // la photo entre par le bas
    end: 'bottom top', // la photo est sortie par le haut
    scrub: true,
    invalidateOnRefresh: true, // recalcule les distances si la fenêtre change de taille
  })

  // Couche lointaine : l'image glisse à contresens dans son cadre,
  // elle paraît donc défiler plus lentement que la page
  gsap.fromTo(
    inner,
    { yPercent: -9 },
    { yPercent: 9, ease: 'none', scrollTrigger: whilePhotoVisible() },
  )

  // Couche proche : le cadre entier remonte un peu plus vite que la page
  // (8 % de la hauteur d'écran d'avance au total, dans chaque sens)
  gsap.fromTo(
    mover,
    { y: () => window.innerHeight * 0.08 },
    { y: () => window.innerHeight * -0.08, ease: 'none', scrollTrigger: whilePhotoVisible() },
  )
}
