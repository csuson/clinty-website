import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import FormField from '../../components/FormField'
import { ShopifyIcon } from '../../components/IntegrationIcons'
import {
  DEFAULT_GENERIC_IMPORT_CONFIG,
  SHOPIFY_IMPORT_MAPPING_COLUMNS,
  type ColumnMapping,
  type GenericImportConfig,
  type ShopifyProductCsvColumn,
} from '../../constants/shopifyProductImport'
import { inputClass } from '../../constants/forms'
import {
  buildGenericImportConfig,
  convertGenericSpreadsheetToShopifyCsv,
  ensureGenericImportConfig,
  previewSpreadsheet,
  readSpreadsheetFile,
  type ImportPreviewRow,
  type ProductImportResult,
  type SpreadsheetPreview,
} from '../../lib/shopify/productImport'

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ImportProductsSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [spreadsheetPreview, setSpreadsheetPreview] = useState<SpreadsheetPreview | null>(null)
  const [genericConfig, setGenericConfig] = useState<GenericImportConfig>(DEFAULT_GENERIC_IMPORT_CONFIG)
  const [result, setResult] = useState<ProductImportResult | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function convertWorkbook(file: File, config: GenericImportConfig): Promise<ProductImportResult> {
    const workbook = await readSpreadsheetFile(file)
    const nextConfig = ensureGenericImportConfig(workbook, config)
    const converted = convertGenericSpreadsheetToShopifyCsv(workbook, nextConfig)

    if (converted.rowCount === 0) {
      throw new Error(
        'No import rows were generated. Map Variant SKU and/or Variant Price, or adjust the sheet and header row.',
      )
    }

    return converted
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)
    setResult(null)
    setSpreadsheetPreview(null)

    if (!file) {
      setFileName(null)
      return
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Upload an Excel file (.xlsx or .xls).')
      setFileName(null)
      event.target.value = ''
      return
    }

    setFileName(file.name)
    setWorking(true)

    try {
      const workbook = await readSpreadsheetFile(file)
      const nextConfig = buildGenericImportConfig(workbook)
      const preview = previewSpreadsheet(workbook, nextConfig.sheetName, nextConfig.headerRow)
      setSpreadsheetPreview(preview)
      setGenericConfig(nextConfig)

      const converted = convertGenericSpreadsheetToShopifyCsv(workbook, nextConfig)
      if (converted.rowCount === 0) {
        setError(
          'No import rows were generated. Map Variant SKU and/or Variant Price, or adjust the sheet and header row.',
        )
      } else {
        setResult(converted)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the Excel file')
      setFileName(null)
      event.target.value = ''
    } finally {
      setWorking(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setWorking(true)
    setError(null)

    try {
      const workbook = await readSpreadsheetFile(file)
      const nextConfig = ensureGenericImportConfig(workbook, genericConfig)
      if (nextConfig !== genericConfig) {
        setGenericConfig(nextConfig)
      }

      const preview = previewSpreadsheet(workbook, nextConfig.sheetName, nextConfig.headerRow)
      setSpreadsheetPreview(preview)

      setResult(await convertWorkbook(file, nextConfig))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert the Excel file')
    } finally {
      setWorking(false)
    }
  }

  async function handleSheetChange(sheetName: string) {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setWorking(true)
    setError(null)

    try {
      const workbook = await readSpreadsheetFile(file)
      const nextConfig = buildGenericImportConfig(workbook, sheetName)
      const preview = previewSpreadsheet(workbook, sheetName, nextConfig.headerRow)
      setSpreadsheetPreview(preview)
      setGenericConfig(nextConfig)

      const converted = convertGenericSpreadsheetToShopifyCsv(workbook, nextConfig)
      if (converted.rowCount === 0) {
        setError('No import rows for this sheet. Try another sheet or adjust the header row.')
      } else {
        setResult(converted)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the selected sheet')
    } finally {
      setWorking(false)
    }
  }

  function updateMapping(column: ShopifyProductCsvColumn, header: string) {
    setGenericConfig((current) => {
      const mappings: ColumnMapping = { ...current.mappings }
      if (header) {
        mappings[column] = header
      } else {
        delete mappings[column]
      }
      return { ...current, mappings }
    })
  }

  function handleDownload() {
    if (!result) return
    const baseName = fileName?.replace(/\.(xlsx|xls)$/i, '') ?? 'products'
    const sheetPart = genericConfig.sheetName ? sanitizeFilenamePart(genericConfig.sheetName) : ''
    const downloadName = sheetPart
      ? `${baseName}-${sheetPart}-shopify-import.csv`
      : `${baseName}-shopify-import.csv`
    downloadTextFile(downloadName, result.csv, 'text/csv;charset=utf-8')
  }

  return (
    <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Import Products</h2>
        <p className="text-sm text-navy-600">
          Upload any Excel spreadsheet and convert it to Shopify&apos;s product import CSV. Map your
          columns to Shopify fields, then download the CSV for import.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Excel workbook" id="product-import-xlsx">
          <input
            ref={fileInputRef}
            id="product-import-xlsx"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            className="block w-full text-sm text-navy-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-navy-900 file:text-cream hover:file:bg-navy-800"
            disabled={working}
          />
        </FormField>

        {spreadsheetPreview && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Sheet" id="import-sheet">
                <select
                  id="import-sheet"
                  value={genericConfig.sheetName}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className={inputClass}
                  disabled={working}
                >
                  {spreadsheetPreview.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Header row" id="import-header-row">
                <input
                  id="import-header-row"
                  type="number"
                  min={1}
                  value={genericConfig.headerRow}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      headerRow: Number.parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Group variants by column" id="import-group-by">
                <select
                  id="import-group-by"
                  value={genericConfig.groupByColumn}
                  onChange={(e) =>
                    setGenericConfig((current) => ({ ...current, groupByColumn: e.target.value }))
                  }
                  className={inputClass}
                  disabled={working}
                >
                  <option value="">Auto (Handle, then Title, then SKU)</option>
                  {spreadsheetPreview.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {spreadsheetPreview.shopifyHeaderMatch && (
              <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-700 text-sm px-4 py-3">
                Shopify export columns detected — rows will pass through directly to CSV.
              </div>
            )}

            {!spreadsheetPreview.shopifyHeaderMatch && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-navy-900">Column mapping</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {SHOPIFY_IMPORT_MAPPING_COLUMNS.map((column) => (
                    <FormField key={column} label={column} id={`map-${column}`}>
                      <select
                        id={`map-${column}`}
                        value={genericConfig.mappings[column] ?? ''}
                        onChange={(e) => updateMapping(column, e.target.value)}
                        className={inputClass}
                        disabled={working}
                      >
                        <option value="">Not mapped</option>
                        {spreadsheetPreview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Default vendor" id="import-vendor">
                <input
                  id="import-vendor"
                  type="text"
                  value={genericConfig.defaults.vendor}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: { ...current.defaults, vendor: e.target.value },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Default product type" id="import-product-type">
                <input
                  id="import-product-type"
                  type="text"
                  value={genericConfig.defaults.productType}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: { ...current.defaults, productType: e.target.value },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Default Option1 name" id="import-option1-name">
                <input
                  id="import-option1-name"
                  type="text"
                  value={genericConfig.defaults.option1Name}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: { ...current.defaults, option1Name: e.target.value },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Default Option2 name" id="import-option2-name">
                <input
                  id="import-option2-name"
                  type="text"
                  value={genericConfig.defaults.option2Name}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: { ...current.defaults, option2Name: e.target.value },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Tags" id="import-tags">
                <input
                  id="import-tags"
                  type="text"
                  placeholder="NEW, 2026"
                  value={genericConfig.defaults.tags}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: { ...current.defaults, tags: e.target.value },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>

              <FormField label="Default inventory qty" id="import-inventory-qty">
                <input
                  id="import-inventory-qty"
                  type="number"
                  min={0}
                  value={genericConfig.defaults.inventoryQty}
                  onChange={(e) =>
                    setGenericConfig((current) => ({
                      ...current,
                      defaults: {
                        ...current.defaults,
                        inventoryQty: Number.parseInt(e.target.value, 10) || 0,
                      },
                    }))
                  }
                  className={inputClass}
                  disabled={working}
                />
              </FormField>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={working || !fileName}
            className="inline-flex items-center justify-center gap-2 bg-navy-900 text-cream font-medium px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors text-sm disabled:opacity-60"
          >
            {working ? 'Converting...' : 'Convert to Shopify CSV'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!result}
            className="inline-flex items-center justify-center gap-2 border border-navy-900/15 text-navy-900 font-medium px-5 py-2.5 rounded-xl hover:bg-navy-900/5 transition-colors text-sm disabled:opacity-60"
          >
            Download CSV
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl bg-cream px-4 py-3 text-sm text-navy-700">
            Generated <span className="font-semibold text-navy-900">{result.rowCount}</span> variant
            rows across <span className="font-semibold text-navy-900">{result.productCount}</span>{' '}
            products
            {fileName ? <> from <span className="font-medium">{fileName}</span></> : null}.
          </div>

          <GenericPreview rows={result.previewRows.slice(0, 12)} />
        </div>
      )}
    </section>
  )
}

function GenericPreview({ rows }: { rows: ImportPreviewRow[] }) {
  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-900/10">
      <table className="min-w-full text-sm">
        <thead className="bg-navy-900/5 text-navy-600">
          <tr>
            <th className="text-left font-medium px-4 py-3">Handle</th>
            <th className="text-left font-medium px-4 py-3">Title</th>
            <th className="text-left font-medium px-4 py-3">SKU</th>
            <th className="text-left font-medium px-4 py-3">Price</th>
            <th className="text-left font-medium px-4 py-3">Option 1</th>
            <th className="text-left font-medium px-4 py-3">Option 2</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.handle}-${row.sku}-${index}`} className="border-t border-navy-900/5">
              <td className="px-4 py-3 text-navy-600">{row.handle}</td>
              <td className="px-4 py-3 font-medium text-navy-900">{row.title}</td>
              <td className="px-4 py-3 text-navy-700">{row.sku}</td>
              <td className="px-4 py-3 text-navy-700">{row.price}</td>
              <td className="px-4 py-3 text-navy-700">{row.option1}</td>
              <td className="px-4 py-3 text-navy-700">{row.option2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ShopifyTools() {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-navy-900/5 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime-50 flex items-center justify-center shrink-0">
            <ShopifyIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Shopify Tools</h2>
            <p className="text-sm text-navy-600">
              Convert spreadsheets into Shopify product import files with flexible column mapping.
            </p>
          </div>
        </div>
      </section>

      <ImportProductsSection />
    </div>
  )
}
