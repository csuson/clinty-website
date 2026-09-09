import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const source = join(root, 'node_modules', 'h5p-standalone', 'dist')
const target = join(root, 'public', 'h5p-player')

await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
console.log('Copied h5p-standalone dist to public/h5p-player')
