import * as XLSX from 'xlsx'
import {
  DEFAULT_GENERIC_IMPORT_CONFIG,
  HEADER_ALIASES,
  SHOPIFY_PRODUCT_CSV_COLUMNS,
  type ColumnMapping,
  type GenericImportConfig,
  type GenericImportDefaults,
  type ShopifyProductCsvColumn,
} from '../../constants/shopifyProductImport'

export type SpreadsheetPreview = {
  sheetNames: string[]
  headers: string[]
  rows: Record<string, string>[]
  suggestedMappings: ColumnMapping
  shopifyHeaderMatch: boolean
  detectedHeaderRow: number
}

export function detectBestHeaderRow(workbook: XLSX.WorkBook, sheetName: string): number {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return 1

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  let bestRow = 1
  let bestScore = 0

  for (let index = 0; index < Math.min(matrix.length, 40); index += 1) {
    const cells = matrix[index] ?? []
    const headers = cells.map((cell) => String(cell ?? '').trim())
    const score = scoreHeaderRow(headers)
    if (score > bestScore) {
      bestScore = score
      bestRow = index + 1
    }
  }

  return bestScore > 0 ? bestRow : 1
}

function scoreHeaderRow(headers: string[]): number {
  if (!headers.some((header) => header.trim())) return 0

  let score = 0
  for (const header of headers) {
    const normalized = normalizeHeader(header)
    if (!normalized) continue
    if (HEADER_ALIASES[normalized]) score += 3
    if (normalized === 'sku' || normalized.endsWith(' sku')) score += 4
    if (normalized.includes('sku')) score += 2
    if (normalized === 'srp' || normalized === 'msrp' || /^srp\b/.test(normalized)) score += 4
    if (normalized.includes('price')) score += 2
  }

  if (isShopifyHeaderRow(headers)) score += 12
  return score
}

export function buildGenericImportConfig(
  workbook: XLSX.WorkBook,
  sheetName?: string,
): GenericImportConfig {
  const resolvedSheet = sheetName ?? workbook.SheetNames[0] ?? ''
  const headerRow = detectBestHeaderRow(workbook, resolvedSheet)
  const preview = previewSpreadsheet(workbook, resolvedSheet, headerRow)

  return {
    ...DEFAULT_GENERIC_IMPORT_CONFIG,
    sheetName: resolvedSheet,
    headerRow,
    mappings: preview.suggestedMappings,
    groupByColumn:
      preview.suggestedMappings.Handle ??
      preview.suggestedMappings.Title ??
      preview.suggestedMappings['Body (HTML)'] ??
      '',
  }
}

export type ImportPreviewRow = {
  handle: string
  title: string
  sku: string
  price: string
  option1: string
  option2: string
}

export type ProductImportResult = {
  csv: string
  rowCount: number
  previewRows: ImportPreviewRow[]
  productCount: number
}

export async function readSpreadsheetFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer()
  return XLSX.read(buffer, { type: 'array' })
}

export function previewSpreadsheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRow = 1,
): SpreadsheetPreview {
  const table = readSheetTable(workbook, sheetName, headerRow)
  const shopifyHeaderMatch = isShopifyHeaderRow(table.headers)
  const suggestedMappings = shopifyHeaderMatch
    ? shopifyDirectMapping(table.headers)
    : suggestColumnMappings(table.headers)

  return {
    sheetNames: workbook.SheetNames,
    headers: table.headers,
    rows: table.rows,
    suggestedMappings,
    shopifyHeaderMatch,
    detectedHeaderRow: headerRow,
  }
}

export function suggestColumnMappings(headers: string[]): ColumnMapping {
  const mappings: ColumnMapping = {}
  const used = new Set<string>()
  const usedHeaders = new Set<string>()

  for (const header of headers) {
    if (isSrpHeader(header)) {
      mappings['Variant Price'] = header
      used.add('Variant Price')
      usedHeaders.add(header)
      break
    }
  }

  for (const header of headers) {
    if (usedHeaders.has(header)) continue

    const normalized = normalizeHeader(header)
    const shopifyColumn = HEADER_ALIASES[normalized]
    if (!shopifyColumn || used.has(shopifyColumn)) continue
    mappings[shopifyColumn] = header
    used.add(shopifyColumn)
    usedHeaders.add(header)
  }

  for (const header of headers) {
    if (usedHeaders.has(header)) continue

    const normalized = normalizeHeader(header)
    if (!normalized) continue

    if (!used.has('Variant SKU') && /^sku\b/.test(normalized)) {
      mappings['Variant SKU'] = header
      used.add('Variant SKU')
      usedHeaders.add(header)
    }
    if (!used.has('Variant Price') && /\bprice\b/.test(normalized)) {
      mappings['Variant Price'] = header
      used.add('Variant Price')
      usedHeaders.add(header)
    }
    if (!used.has('Title') && (normalized.includes('product') || normalized.includes('description'))) {
      mappings.Title = header
      used.add('Title')
      usedHeaders.add(header)
    }
  }

  return mappings
}

export function convertGenericSpreadsheetToShopifyCsv(
  workbook: XLSX.WorkBook,
  config: GenericImportConfig,
): ProductImportResult {
  const resolvedConfig = ensureGenericImportConfig(workbook, config)
  const table = readSheetTable(workbook, resolvedConfig.sheetName, resolvedConfig.headerRow)
  if (table.rows.length === 0) {
    return { csv: `${SHOPIFY_PRODUCT_CSV_COLUMNS.join(',')}\n`, rowCount: 0, previewRows: [], productCount: 0 }
  }

  if (isShopifyHeaderRow(table.headers)) {
    return convertShopifyHeadersDirect(table.rows, table.headers)
  }

  return convertMappedSpreadsheet(table.rows, resolvedConfig)
}

export function ensureGenericImportConfig(
  workbook: XLSX.WorkBook,
  config: GenericImportConfig,
): GenericImportConfig {
  const sheetNames = workbook.SheetNames
  if (sheetNames.length === 0) {
    throw new Error('The workbook has no sheets.')
  }

  const sheetName =
    config.sheetName && sheetNames.includes(config.sheetName)
      ? config.sheetName
      : sheetNames[0]

  return sheetName === config.sheetName ? config : { ...config, sheetName }
}

function resolveSheetName(workbook: XLSX.WorkBook, sheetName: string): string {
  const sheetNames = workbook.SheetNames
  if (sheetNames.length === 0) {
    throw new Error('The workbook has no sheets.')
  }

  if (sheetName && sheetNames.includes(sheetName)) {
    return sheetName
  }

  return sheetNames[0]
}

export async function convertGenericExcelFileToShopifyCsv(
  file: File,
  config: GenericImportConfig,
): Promise<ProductImportResult> {
  const workbook = await readSpreadsheetFile(file)
  return convertGenericSpreadsheetToShopifyCsv(workbook, config)
}

function readSheetTable(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRow: number,
): { headers: string[]; rows: Record<string, string>[] } {
  const resolvedSheet = resolveSheetName(workbook, sheetName)
  const sheet = workbook.Sheets[resolvedSheet]
  if (!sheet) {
    throw new Error(`Sheet "${resolvedSheet}" was not found in the workbook.`)
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  const headerIndex = Math.max(0, headerRow - 1)
  const headerCells = matrix[headerIndex] ?? []
  const headers = headerCells.map((cell, index) => {
    const label = String(cell ?? '').trim()
    return label || `Column ${index + 1}`
  })

  const rows: Record<string, string>[] = []
  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] ?? []
    if (!cells.some((cell) => String(cell ?? '').trim())) continue

    const row: Record<string, string> = {}
    headers.forEach((header, columnIndex) => {
      row[header] = String(cells[columnIndex] ?? '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

function convertMappedSpreadsheet(
  rows: Record<string, string>[],
  config: GenericImportConfig,
): ProductImportResult {
  const lines = [SHOPIFY_PRODUCT_CSV_COLUMNS.join(',')]
  const previewRows: ImportPreviewRow[] = []
  const seenHandles = new Set<string>()
  let productCount = 0

  for (const sourceRow of rows) {
    const handle = resolveHandle(sourceRow, config)
    const sku = mappedValue(sourceRow, config, 'Variant SKU')
    const price = mappedValue(sourceRow, config, 'Variant Price')
    if (!handle && !sku && !price) continue

    const outputRow = emptyCsvRow()
    const resolvedHandle = handle || slugify(sku || `row-${previewRows.length + 1}`)
    outputRow.Handle = resolvedHandle

    const isFirstVariant = !seenHandles.has(resolvedHandle)
    if (isFirstVariant) {
      seenHandles.add(resolvedHandle)
      productCount += 1
    }

    for (const column of SHOPIFY_PRODUCT_CSV_COLUMNS) {
      const mappedHeader = config.mappings[column]
      if (mappedHeader && sourceRow[mappedHeader] !== undefined) {
        outputRow[column] = sourceRow[mappedHeader]
      }
    }

    applyDefaults(outputRow, config.defaults, isFirstVariant)

    if (isFirstVariant) {
      if (!outputRow.Title) {
        outputRow.Title = mappedValue(sourceRow, config, 'Title') || titleFromHandle(resolvedHandle)
      }
    } else {
      for (const column of PRODUCT_LEVEL_COLUMNS) {
        if (column !== 'Handle') outputRow[column] = ''
      }
    }

    fillOptionNames(outputRow, config.defaults, isFirstVariant)

    if (!outputRow['Variant SKU'] && !outputRow['Variant Price']) continue

    previewRows.push({
      handle: resolvedHandle,
      title: outputRow.Title,
      sku: outputRow['Variant SKU'],
      price: outputRow['Variant Price'],
      option1: outputRow['Option1 Value'],
      option2: outputRow['Option2 Value'],
    })

    lines.push(
      SHOPIFY_PRODUCT_CSV_COLUMNS.map((column) => escapeCsvField(outputRow[column] ?? '')).join(','),
    )
  }

  return {
    csv: `${lines.join('\n')}\n`,
    rowCount: lines.length - 1,
    previewRows,
    productCount,
  }
}

function convertShopifyHeadersDirect(
  rows: Record<string, string>[],
  headers: string[],
): ProductImportResult {
  const lines = [SHOPIFY_PRODUCT_CSV_COLUMNS.join(',')]
  const previewRows: ImportPreviewRow[] = []
  const handles = new Set<string>()

  for (const sourceRow of rows) {
    const outputRow = emptyCsvRow()
    for (const header of headers) {
      if ((SHOPIFY_PRODUCT_CSV_COLUMNS as readonly string[]).includes(header)) {
        outputRow[header as ShopifyProductCsvColumn] = sourceRow[header] ?? ''
      }
    }
    if (!outputRow.Handle && !outputRow['Variant SKU']) continue

    if (outputRow.Handle) handles.add(outputRow.Handle)
    previewRows.push({
      handle: outputRow.Handle,
      title: outputRow.Title,
      sku: outputRow['Variant SKU'],
      price: outputRow['Variant Price'],
      option1: outputRow['Option1 Value'],
      option2: outputRow['Option2 Value'],
    })

    lines.push(
      SHOPIFY_PRODUCT_CSV_COLUMNS.map((column) => escapeCsvField(outputRow[column] ?? '')).join(','),
    )
  }

  return {
    csv: `${lines.join('\n')}\n`,
    rowCount: lines.length - 1,
    previewRows,
    productCount: handles.size,
  }
}

function resolveHandle(sourceRow: Record<string, string>, config: GenericImportConfig): string {
  const mappedHandle = mappedValue(sourceRow, config, 'Handle')
  if (mappedHandle) return slugify(mappedHandle)

  const groupHeader = config.groupByColumn || config.mappings.Title || ''
  const groupValue = groupHeader ? sourceRow[groupHeader]?.trim() : ''
  if (groupValue) return slugify(groupValue)

  const sku = mappedValue(sourceRow, config, 'Variant SKU')
  if (sku) return slugify(sku)

  return ''
}

function mappedValue(
  sourceRow: Record<string, string>,
  config: GenericImportConfig,
  column: ShopifyProductCsvColumn,
): string {
  const header = config.mappings[column]
  if (!header) return ''
  return sourceRow[header]?.trim() ?? ''
}

function applyDefaults(
  row: Record<string, string>,
  defaults: GenericImportDefaults,
  isFirstVariant: boolean,
) {
  if (isFirstVariant) {
    if (!row.Vendor && defaults.vendor) row.Vendor = defaults.vendor
    if (!row.Type && defaults.productType) row.Type = defaults.productType
    if (!row.Tags && defaults.tags) row.Tags = defaults.tags
    if (!row.Published) row.Published = defaults.published ? 'true' : 'false'
  }

  if (!row['Variant Inventory Tracker']) row['Variant Inventory Tracker'] = 'shopify'
  if (!row['Variant Inventory Qty']) row['Variant Inventory Qty'] = String(defaults.inventoryQty)
  if (!row['Variant Inventory Policy']) row['Variant Inventory Policy'] = 'deny'
  if (!row['Variant Fulfillment Service']) row['Variant Fulfillment Service'] = 'manual'
  if (!row['Variant Requires Shipping']) row['Variant Requires Shipping'] = 'true'
  if (!row['Variant Taxable']) row['Variant Taxable'] = 'true'
  if (!row['Gift Card']) row['Gift Card'] = 'false'
  if (!row['Variant Weight Unit']) row['Variant Weight Unit'] = 'lb'
  if (!row.Status) row.Status = defaults.status
  if (row['Variant Price']) row['Variant Price'] = formatMoney(row['Variant Price'])
  if (row['Variant Compare At Price']) {
    row['Variant Compare At Price'] = formatMoney(row['Variant Compare At Price'])
  }
}

function fillOptionNames(
  row: Record<string, string>,
  defaults: GenericImportDefaults,
  isFirstVariant: boolean,
) {
  if (row['Option1 Value'] && !row['Option1 Name']) {
    row['Option1 Name'] = isFirstVariant ? defaults.option1Name : ''
  }
  if (row['Option2 Value'] && !row['Option2 Name']) {
    row['Option2 Name'] = isFirstVariant ? defaults.option2Name : ''
  }
}

const PRODUCT_LEVEL_COLUMNS: ShopifyProductCsvColumn[] = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option2 Name',
  'Option3 Name',
]

function isShopifyHeaderRow(headers: string[]): boolean {
  const normalized = new Set(headers.map(normalizeHeader))
  return normalized.has('handle') && normalized.has('variant sku')
}

function shopifyDirectMapping(headers: string[]): ColumnMapping {
  const mappings: ColumnMapping = {}
  for (const header of headers) {
    if ((SHOPIFY_PRODUCT_CSV_COLUMNS as readonly string[]).includes(header)) {
      mappings[header as ShopifyProductCsvColumn] = header
    }
  }
  return mappings
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[$€£]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSrpHeader(header: string): boolean {
  const normalized = normalizeHeader(header)
  return (
    normalized === 'srp'
    || normalized === 'msrp'
    || normalized.startsWith('srp ')
    || /^srp\b/.test(normalized)
    || normalized.includes('suggested retail')
  )
}

function emptyCsvRow(): Record<string, string> {
  return Object.fromEntries(SHOPIFY_PRODUCT_CSV_COLUMNS.map((column) => [column, '']))
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bk\s+2\b/gi, 'k2')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromHandle(handle: string): string {
  return handle
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMoney(value: string): string {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ''))
  if (!Number.isFinite(parsed)) return value
  return (Math.round(parsed * 100) / 100).toFixed(2)
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
