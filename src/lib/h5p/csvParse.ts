export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim())) {
        rows.push(row)
      }
      row = []
    } else if (char !== '\r') {
      field += char
    }
  }

  row.push(field)
  if (row.some((cell) => cell.trim())) {
    rows.push(row)
  }

  return rows
}

export function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const alias of aliases) {
    const index = normalized.indexOf(alias)
    if (index >= 0) return index
  }
  return -1
}

export function resolveTwoColumnIndices(headers: string[]): { left: number; right: number } {
  const left = findColumnIndex(headers, [
    'question',
    'questions',
    'draggable',
    'item',
    'term',
    'lesson',
    'source',
    'word',
    'prompt',
  ])
  const right = findColumnIndex(headers, [
    'answers',
    'answer',
    'aswers',
    'options',
    'drop zone',
    'dropzone',
    'match',
    'category',
    'leçon',
    'lecon',
    'target',
    'translation',
  ])

  if (left >= 0 && right >= 0 && left !== right) {
    return { left, right }
  }

  const namedColumns = headers
    .map((header, index) => ({ header: header.trim(), index }))
    .filter((entry) => entry.header)

  if (namedColumns.length >= 2) {
    return { left: namedColumns[0].index, right: namedColumns[1].index }
  }

  throw new Error('CSV must include two columns, such as "question,answers" or "lesson,leçon".')
}

export async function readCsvFile(file: File): Promise<string> {
  return file.text()
}
