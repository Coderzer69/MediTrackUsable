import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'
import { darkThemePlugin } from './scripts/dark-theme.mjs'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    darkThemePlugin({
      srcDir: path.resolve(import.meta.dirname, 'src'),
      themeCssPath: path.resolve(import.meta.dirname, 'node_modules/tailwindcss/theme.css'),
      outFile: path.resolve(import.meta.dirname, 'src/theme-dark.generated.css'),
    }),
  ],
  // OneDrive folders don't always deliver file-change events; poll so edits reload.
  server: {
    watch: { usePolling: true, interval: 300 },
  },
})
