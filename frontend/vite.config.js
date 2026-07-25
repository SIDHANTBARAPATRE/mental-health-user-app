import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // [!code ++]

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), // [!code ++]
  tailwindcss(), cloudflare()],
})