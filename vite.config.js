import { defineConfig } from 'vite';
import { resolve } from 'path';

// Configuracion Vite multi-pagina:
//   /                   -> index.html               (catalogo publico)
//   /insert/            -> insert/index.html        (panel admin, requiere auth)
//   /insert/login.html  -> insert/login.html        (login Supabase Auth)
//
// Sirve tambien para preview local (`npm run dev`) y para build (`npm run build`)
// Genera dist/ con las 3 paginas como entradas independientes.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        insert:    resolve(__dirname, 'insert/index.html'),
        login:     resolve(__dirname, 'insert/login.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
