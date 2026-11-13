// Configuration de Vite, l'outil qui sert le site en développement
// et qui le compile pour la mise en ligne.
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Port fixe : le site est toujours sur http://localhost:5173
    port: 5173,
    // Si le port est déjà pris, on préfère une erreur claire plutôt qu'un autre port
    strictPort: true,
  },
})
