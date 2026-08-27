import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const targetDir = join(root, 'public')
const target = join(targetDir, 'pdf.worker.min.mjs')

if (!existsSync(source)) {
  console.warn('[copy-pdf-worker] worker pdfjs introuvable, copie ignorée')
  process.exit(0)
}

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, target)
console.log('[copy-pdf-worker] worker copié dans public/')
