import { findColumnIndex, parseCsvRows, readCsvFile, resolveTwoColumnIndices } from './csvParse'
import type { H5PAccordionPanel, H5PDragPair, H5PQuizQuestion, H5PVocabCard } from './types'

export type VocabPair = {
  term: string
  translation: string
}

const TXT_SEPARATORS = [
  /\t/,
  /\s*[|–—-]\s+/,
  /\s*:\s+/,
  /\s*,\s*/,
]

function splitTxtLine(line: string): [string, string] | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  for (const pattern of TXT_SEPARATORS) {
    const parts = trimmed.split(pattern).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(' ')]
    }
  }

  return null
}

function looksLikeCsv(text: string): boolean {
  const firstLine = text.trim().split(/\r?\n/)[0] ?? ''
  return firstLine.includes(',') && !firstLine.includes('*')
}

export function parseVocabPairs(text: string): VocabPair[] {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('File is empty.')
  }

  if (looksLikeCsv(trimmed)) {
    const rows = parseCsvRows(trimmed)
    if (!rows.length) throw new Error('File is empty.')

    const headers = rows[0]
    let leftIndex = findColumnIndex(headers, [
      'word',
      'term',
      'lesson',
      'source',
      'question',
      'prompt',
      'foreign',
      'target',
    ])
    let rightIndex = findColumnIndex(headers, [
      'translation',
      'answer',
      'leçon',
      'lecon',
      'meaning',
      'english',
      'native',
    ])

    if (leftIndex < 0 || rightIndex < 0) {
      const columns = resolveTwoColumnIndices(headers)
      leftIndex = columns.left
      rightIndex = columns.right
    }

    const pairs: VocabPair[] = []
    for (const row of rows.slice(1)) {
      const term = (row[leftIndex] ?? '').trim()
      const translation = (row[rightIndex] ?? '').trim()
      if (term && translation) pairs.push({ term, translation })
    }

    if (!pairs.length) {
      throw new Error('No vocabulary rows found. Use two columns such as word,translation.')
    }
    return pairs
  }

  const pairs: VocabPair[] = []
  for (const line of trimmed.split(/\r?\n/)) {
    const split = splitTxtLine(line)
    if (split) pairs.push({ term: split[0], translation: split[1] })
  }

  if (!pairs.length) {
    throw new Error(
      'No vocabulary lines found. Use tab-separated pairs, word - translation, or a CSV with word,translation columns.',
    )
  }

  return pairs
}

export async function readVocabFile(file: File): Promise<VocabPair[]> {
  return parseVocabPairs(await readCsvFile(file))
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function pickDistractors(pool: string[], correct: string, count: number): string[] {
  const unique = [...new Set(pool.filter((item) => item.trim() && item !== correct))]
  return shuffle(unique).slice(0, count)
}

export function vocabPairsToQuizQuestions(pairs: VocabPair[]): H5PQuizQuestion[] {
  const translations = pairs.map((pair) => pair.translation)

  return pairs.map((pair) => {
    const distractors = pickDistractors(translations, pair.translation, 3)
    const answers = shuffle([pair.translation, ...distractors])
    return {
      question: pair.term,
      answers: answers.length >= 2 ? answers : [pair.translation, '—', '—', '—'],
      correctIndex: answers.indexOf(pair.translation),
    }
  })
}

export function vocabPairsToDragPairs(pairs: VocabPair[]): H5PDragPair[] {
  return pairs.map((pair) => ({
    draggable: pair.term,
    dropZone: pair.translation,
  }))
}

export function vocabPairsToAccordionPanels(pairs: VocabPair[]): H5PAccordionPanel[] {
  return pairs.map((pair) => ({
    title: pair.term,
    content: pair.translation,
  }))
}

export function vocabPairsToBlanksText(pairs: VocabPair[]): string {
  return pairs
    .map((pair) => `${pair.term} → *${pair.translation}*`)
    .join('\n')
}

export function vocabPairsToVocabCards(pairs: VocabPair[]): H5PVocabCard[] {
  return pairs.map((pair) => ({ term: pair.term, translation: pair.translation }))
}

export function vocabPairsToMarkTheWordsText(pairs: VocabPair[]): string {
  const marked = pairs.map((pair) => `*${pair.term}*`).join(', ')
  return `Click the ${pairs.length === 1 ? 'word' : 'words'}: ${marked}.`
}

export function parseBlanksText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('File is empty.')

  if (trimmed.includes('*')) {
    return trimmed
  }

  const pairs = parseVocabPairs(trimmed)
  return pairs.map((pair) => `The translation of "${pair.term}" is *${pair.translation}*.`).join('\n\n')
}

export async function readBlanksFile(file: File): Promise<string> {
  return parseBlanksText(await readCsvFile(file))
}

export function isCsvOrTxtFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.csv') || name.endsWith('.txt')
}
