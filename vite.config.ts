import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const VAULT_PLUGIN = '/Users/semyonsurkov/Documents/obsidian/.obsidian/plugins/dashboard-obsidian'

const alias = { '@': resolve(__dirname, 'src') }

export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [react()],
      resolve: { alias },
      build: {
        outDir: VAULT_PLUGIN,
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/main.ts'),
          formats: ['cjs'],
          fileName: () => 'main.js',
        },
        rollupOptions: {
          external: ['obsidian', 'electron', 'codemirror'],
          output: {
            assetFileNames: (info) =>
              info.name?.endsWith('.css') ? 'styles.css' : (info.name ?? '[name][extname]'),
            entryFileNames: 'main.js',
          },
        },
        minify: false,
        cssCodeSplit: false,
      },
    }
  }

  // Dev server — browser preview with HMR
  return {
    plugins: [react()],
    resolve: { alias },
    server: { port: 3000 },
    root: '.',
  }
})
