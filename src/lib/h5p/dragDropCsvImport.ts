import { parseCsvRows, readCsvFile, resolveTwoColumnIndices } from './csvParse'
import type { H5PDragPair } from './types'

function stripMarker(value: string): string {
  const wrapped = value.match(/^\*(.+)\*$/)
  const prefix = value.match(/^\*(.+)$/)
  const suffix = value.match(/^(.+)\*$/)
  return (wrapped?.[1] ?? prefix?.[1] ?? suffix?.[1] ?? value).trim()
}

function parseDropZoneCell(value: string): string {
  const parts = value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return ''

  const marked = parts.find((part) => /^\*.*\*?$/.test(part) || /\*$/.test(part) || /^\*/.test(part))
  return stripMarker(marked ?? parts[0])
}

export function parseDragDropCsv(text: string): H5PDragPair[] {
  const rows = parseCsvRows(text.trim())
  if (!rows.length) {
    throw new Error('CSV file is empty.')
  }

  const headers = rows[0]
  const { left: draggableIndex, right: dropZoneIndex } = resolveTwoColumnIndices(headers)

  const pairs: H5PDragPair[] = []

  for (const row of rows.slice(1)) {
    const draggable = (row[draggableIndex] ?? '').trim()
    const dropZoneCell = (row[dropZoneIndex] ?? '').trim()
    if (!draggable || !dropZoneCell) continue

    pairs.push({
      draggable,
      dropZone: parseDropZoneCell(dropZoneCell),
    })
  }

  if (!pairs.length) {
    throw new Error('No drag and drop rows found. Add at least one row after the header.')
  }

  return pairs
}

export async function readDragDropCsvFile(file: File): Promise<H5PDragPair[]> {
  const text = await readCsvFile(file)
  return parseDragDropCsv(text)
}
