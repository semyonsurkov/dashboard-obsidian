import { build, context } from 'esbuild'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'

const prod = process.argv[2] === 'production'

// Output goes directly to the Obsidian plugin directory so Obsidian picks it up immediately.
const VAULT_PLUGIN = '/Users/semyonsurkov/Documents/obsidian/.obsidian/plugins/dashboard-obsidian'

// ─── CSS Modules plugin ────────────────────────────────────────────────────────
// Collects all CSS (global + modules) into styles.css.
// Module files get hashed class names; exports a JS object {localName: scopedName}.

function cssPlugin() {
  const chunks = []

  return {
    name: 'css-bundler',
    setup(build) {
      // CSS Modules (.module.css)
      build.onLoad({ filter: /\.module\.css$/ }, async args => {
        const css = await readFile(args.path, 'utf8')
        const hash = createHash('md5').update(args.path).digest('hex').slice(0, 6)

        // Collect all defined class names (top-level .className selectors)
        const classNames = new Set()
        const re = /\.([\w-]+)/g
        let m
        while ((m = re.exec(css)) !== null) classNames.add(m[1])

        // Build mapping and transform CSS (longest names first to avoid partial replacement)
        const exports = {}
        let processedCss = css
        const sorted = [...classNames].sort((a, b) => b.length - a.length)
        for (const name of sorted) {
          const scoped = `${name}_${hash}`
          exports[name] = scoped
          // Replace .name only when NOT followed by a word char or hyphen
          processedCss = processedCss.replace(
            new RegExp(`\\.${name.replace(/-/g, '\\-')}(?![\\w-])`, 'g'),
            `.${scoped}`,
          )
        }
        chunks.push(processedCss)

        return { contents: `export default ${JSON.stringify(exports)}`, loader: 'js' }
      })

      // Plain CSS (not .module.css) — collect but export nothing.
      // Filter /\.css$/ catches everything; .module.css files are already
      // handled by the handler above (esbuild stops at first matching handler).
      build.onLoad({ filter: /\.css$/ }, async args => {
        const css = await readFile(args.path, 'utf8')
        chunks.push(css)
        return { contents: '', loader: 'js' }
      })

      // Write styles.css after build
      build.onEnd(async () => {
        await writeFile(`${VAULT_PLUGIN}/styles.css`, chunks.join('\n\n'))
      })
    },
  }
}

// ─── Build config ──────────────────────────────────────────────────────────────

const config = {
  entryPoints: ['src/main.ts'],
  bundle:      true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/*',
    '@lezer/*',
    'node:*',
  ],
  format:      'cjs',
  target:      'es2018',
  logLevel:    'info',
  sourcemap:   prod ? false : 'inline',
  treeShaking: true,
  outfile:     `${VAULT_PLUGIN}/main.js`,
  plugins:     [cssPlugin()],
  define: {
    'process.env.NODE_ENV': prod ? '"production"' : '"development"',
  },
}

if (prod) {
  await build(config)
} else {
  const ctx = await context(config)
  await ctx.watch()
  console.log('Watching for changes…')
}
