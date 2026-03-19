import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src = join(root, 'node_modules/roboto-regular/fonts/Roboto-Regular.ttf')
const dest = join(root, 'public/Roboto-Regular.ttf')

try {
  if (existsSync(src)) {
    mkdirSync(join(root, 'public'), { recursive: true })
    copyFileSync(src, dest)
    console.log('Roboto font copied to public/')
  }
} catch (err) {
  console.warn('Could not copy font:', err.message)
}
