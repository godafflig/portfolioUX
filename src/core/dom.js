// ============================================================================
// PETIT OUTIL POUR CRÉER DES ÉLÉMENTS HTML
// Plutôt que d'écrire du HTML dans des chaînes de caractères (fragile),
// on crée les éléments un par un. Le texte passe par textContent :
// il est toujours affiché tel quel, jamais interprété comme du HTML.
// ============================================================================

// el('p', 'intro__role', 'Bonjour') → <p class="intro__role">Bonjour</p>
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag) // crée la balise
  if (className) node.className = className // lui donne sa ou ses classes CSS
  if (text) node.textContent = text // y met le texte
  return node
}
