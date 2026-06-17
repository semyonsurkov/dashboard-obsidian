import { context } from 'esbuild'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { createHash } from 'crypto'

const OUT = 'preview-dist'

function cssPlugin() {
  const chunks = []
  return {
    name: 'css-bundler',
    setup(build) {
      build.onLoad({ filter: /\.module\.css$/ }, async args => {
        const css  = await readFile(args.path, 'utf8')
        const hash = createHash('md5').update(args.path).digest('hex').slice(0, 6)
        const classNames = new Set()
        const re = /\.([\w-]+)/g
        let m
        while ((m = re.exec(css)) !== null) classNames.add(m[1])
        const exports = {}
        let processedCss = css
        for (const name of [...classNames].sort((a, b) => b.length - a.length)) {
          const scoped = `${name}_${hash}`
          exports[name] = scoped
          processedCss = processedCss.replace(
            new RegExp(`\\.${name.replace(/-/g, '\\-')}(?![\\w-])`, 'g'),
            `.${scoped}`,
          )
        }
        chunks.push(processedCss)
        return { contents: `export default ${JSON.stringify(exports)}`, loader: 'js' }
      })

      build.onLoad({ filter: /\.css$/ }, async args => {
        chunks.push(await readFile(args.path, 'utf8'))
        return { contents: '', loader: 'js' }
      })

      build.onEnd(async () => {
        await writeFile(`${OUT}/styles.css`, chunks.join('\n\n'))
      })
    },
  }
}

await mkdir(OUT, { recursive: true })

const ctx = await context({
  entryPoints: ['src/preview/index.tsx'],
  bundle:      true,
  external:    ['obsidian'],
  format:      'iife',
  target:      'es2020',
  sourcemap:   'inline',
  outfile:     `${OUT}/bundle.js`,
  plugins:     [cssPlugin()],
  define:      { 'process.env.NODE_ENV': '"development"' },
  logLevel:    'info',
})

await ctx.watch()
const { host, port } = await ctx.serve({ servedir: OUT, port: 3000, host: 'localhost' })
console.log(`\n  Dashboard preview → http://${host}:${port}\n`)
