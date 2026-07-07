import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { reticle } from '@reticlehq/core/vite';
// https://vite.dev/config/
export default defineConfig({
  plugins: [reticle({ port: 5174 }), react(), tailwindcss()],
})
