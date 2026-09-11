#!/usr/bin/env node
/**
 * Import a vocabulary .txt/.csv file and package H5P dialog cards.
 *
 * Usage:
 *   node scripts/import-vocab-to-h5p.mjs <vocab-file> [output.h5p]
 */

import JSZip from 'jszip'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')

const TXT_SEPARATORS = [/\t/, /\s*[|–—-]\s+/, /\s*:\s+/, /\s*,\s*/]

function splitTxtLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  for (const pattern of TXT_SEPARATORS) {
    const parts = trimmed.split(pattern).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ')]
  }
  return null
}

function normalizeVocabLine(line) {
  return line.replace(/^\uFEFF/, '').trim()
}

function parseConsecutiveLineVocabPairs(text) {
  const normalized = text
    .split(/\r?\n/)
    .map(normalizeVocabLine)
    .filter(Boolean)

  if (normalized.length < 2 || normalized.length % 2 !== 0) return null

  const sameLineCount = normalized.filter((line) => splitTxtLine(line)).length
  if (sameLineCount >= Math.max(2, normalized.length / 3)) return null

  const pairs = []
  for (let index = 0; index < normalized.length; index += 2) {
    pairs.push({ term: normalized[index], translation: normalized[index + 1] })
  }

  return pairs.length ? pairs : null
}

function hasAlternatingVocabFormat(lines) {
  let pairs = 0
  for (let index = 0; index < lines.length - 1; index += 1) {
    const term = lines[index]
    const translation = lines[index + 1]
    if (!term.trim() || term.trim().startsWith('#') || /^\s/.test(term)) continue
    if (/^\s+\S/.test(translation)) {
      pairs += 1
      index += 1
    }
  }
  return pairs >= 2
}

function parseAlternatingVocabPairs(text) {
  const lines = text.split(/\r?\n/)
  const pairs = []

  for (let index = 0; index < lines.length; index += 1) {
    const termLine = lines[index]
    if (!termLine.trim() || termLine.trim().startsWith('#') || /^\s/.test(termLine)) continue

    const term = termLine.trim()
    let nextIndex = index + 1
    while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1
    if (nextIndex >= lines.length) break

    const translationLine = lines[nextIndex]
    if (/^\s/.test(translationLine)) {
      const translation = translationLine.trim()
      if (translation) pairs.push({ term, translation })
      index = nextIndex
      continue
    }

    const split = splitTxtLine(term)
    if (split) pairs.push({ term: split[0], translation: split[1] })
  }

  return pairs
}

function parseVocabPairs(text) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('File is empty.')

  const consecutivePairs = parseConsecutiveLineVocabPairs(trimmed)
  if (consecutivePairs?.length) return consecutivePairs

  const lines = trimmed.split(/\r?\n/)
  if (hasAlternatingVocabFormat(lines)) {
    const alternatingPairs = parseAlternatingVocabPairs(trimmed)
    if (alternatingPairs.length) return alternatingPairs
  }

  const pairs = []
  for (const line of lines) {
    const split = splitTxtLine(line)
    if (split) pairs.push({ term: split[0], translation: split[1] })
  }

  if (!pairs.length) {
    throw new Error('No vocabulary pairs found in file.')
  }

  return pairs
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildDialogCardsContent(cards, title, intro) {
  return {
    title: title ? `<p>${escapeHtml(title)}</p>` : '',
    mode: 'normal',
    description: intro ? `<p>${escapeHtml(intro)}</p>` : '',
    dialogs: cards.map(({ term, translation }) => ({
      text: `<p style="text-align: center;">${escapeHtml(term)}</p>`,
      answer: `<p style="text-align: center;">${escapeHtml(translation)}</p>`,
      tips: { front: '', back: '' },
    })),
    behaviour: {
      enableRetry: true,
      disableBackwardsNavigation: false,
      scaleTextNotCard: false,
      randomCards: false,
    },
  }
}

function sanitizeFilename(title) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'vocabulary'}-dialog-cards.h5p`
}

async function packageDialogCards({ cards, title, intro, templatePath }) {
  const templateBuffer = await readFile(templatePath)
  const zip = await JSZip.loadAsync(templateBuffer)

  const h5pFile = zip.file('h5p.json')
  if (!h5pFile) throw new Error('Invalid H5P template: missing h5p.json')

  const h5pJson = JSON.parse(await h5pFile.async('string'))
  h5pJson.title = title
  h5pJson.embedTypes = ['div', 'iframe']
  zip.file('h5p.json', JSON.stringify(h5pJson, null, 2))

  const content = buildDialogCardsContent(cards, title, intro)
  zip.file('content/content.json', JSON.stringify(content, null, 2))

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function main() {
  const inputPath = resolve(process.argv[2] ?? '')
  if (!inputPath) {
    console.error('Usage: node scripts/import-vocab-to-h5p.mjs <vocab-file> [output.h5p]')
    process.exit(1)
  }

  const text = await readFile(inputPath, 'utf8')
  const pairs = parseVocabPairs(text)
  const baseName = basename(inputPath).replace(/\.(txt|csv)$/i, '')
  const title = `${baseName} — French vocabulary`
  const intro = `Practice ${pairs.length} French phrases and their English translations.`
  const outputPath =
    process.argv[3] ??
    join(dirname(inputPath), sanitizeFilename(title))

  const templatePath = join(root, 'public', 'h5p-templates', 'dialog-cards.h5p')
  const packageBuffer = await packageDialogCards({
    cards: pairs,
    title,
    intro,
    templatePath,
  })

  await writeFile(outputPath, packageBuffer)

  console.log(`Imported ${pairs.length} vocabulary pair${pairs.length === 1 ? '' : 's'}:`)
  for (const pair of pairs) {
    console.log(`  • ${pair.term} → ${pair.translation}`)
  }
  console.log(`\nWrote ${outputPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
