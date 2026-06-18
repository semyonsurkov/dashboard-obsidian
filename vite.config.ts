import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, join } from 'path'
import { copyFileSync } from 'fs'

const DEFAULT_VAULT_PLUGIN = '/Users/semyonsurkov/Documents/obsidian/.obsidian/plugins/dashboard-obsidian'
const VAULT_PLUGIN = process.env['VAULT_PLUGIN_DIR'] ?? DEFAULT_VAULT_PLUGIN

const alias = { '@': resolve(__dirname, 'src') }

export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [
        react(),
        {
          name: 'copy-manifest',
          closeBundle() {
            copyFileSync(join(__dirname, 'manifest.json'), join(VAULT_PLUGIN, 'manifest.json'))
            copyFileSync(join(__dirname, 'versions.json'), join(VAULT_PLUGIN, 'versions.json'))
          },
        },
      ],
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

  return {
    plugins: [react()],
    resolve: { alias },
    server: { port: 3000 },
    root: '.',
  }
})
