import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ExpandToggleButton } from './adminTableUtils'

const EXPANDED_COLUMN_WIDTH = 300

export type AdminTableColumn<TColumnId extends string> = {
  id: TColumnId
  label: string
  defaultWidth: number
  minWidth: number
  expandable?: boolean
  resizable?: boolean
  nowrap?: boolean
}

type AdminResizableTableProps<TRow, TColumnId extends string> = {
  storageKey: string
  columns: AdminTableColumn<TColumnId>[]
  rows: TRow[]
  getRowId: (row: TRow) => string
  emptyMessage: string
  renderCell: (columnId: TColumnId, row: TRow, expanded: boolean) => ReactNode
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`
}

function loadStoredWidths<TColumnId extends string>(
  storageKey: string,
  defaultWidths: Record<TColumnId, number>,
): Record<TColumnId, number> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { ...defaultWidths }
    const parsed = JSON.parse(raw) as Partial<Record<TColumnId, number>>
    return { ...defaultWidths, ...parsed }
  } catch {
    return { ...defaultWidths }
  }
}

function cellClassName(expanded: boolean, nowrap?: boolean): string {
  const base = 'px-4 py-3 align-top'
  if (nowrap) return `${base} whitespace-nowrap`
  if (expanded) return `${base} break-words`
  return `${base} overflow-hidden break-words`
}

export default function AdminResizableTable<TRow, TColumnId extends string>({
  storageKey,
  columns,
  rows,
  getRowId,
  emptyMessage,
  renderCell,
}: AdminResizableTableProps<TRow, TColumnId>) {
  const defaultWidths = useMemo(
    () =>
      Object.fromEntries(columns.map((col) => [col.id, col.defaultWidth])) as Record<TColumnId, number>,
    [columns],
  )
  const minWidths = useMemo(
    () => Object.fromEntries(columns.map((col) => [col.id, col.minWidth])) as Record<TColumnId, number>,
    [columns],
  )
  const expandableColumns = useMemo(
    () => new Set(columns.filter((col) => col.expandable !== false).map((col) => col.id)),
    [columns],
  )

  const [widths, setWidths] = useState<Record<TColumnId, number>>(() =>
    loadStoredWidths(storageKey, defaultWidths),
  )
  const [expandedColumns, setExpandedColumns] = useState<Set<TColumnId>>(() => new Set())
  const [expandedCells, setExpandedCells] = useState<Set<string>>(() => new Set())
  const resizingRef = useRef<{ columnId: TColumnId; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widths))
  }, [storageKey, widths])

  const effectiveWidths = useMemo(() => {
    const next = { ...widths }
    for (const columnId of expandedColumns) {
      next[columnId] = Math.max(next[columnId], EXPANDED_COLUMN_WIDTH)
    }
    return next
  }, [widths, expandedColumns])

  const tableWidth = useMemo(
    () => columns.reduce((sum, col) => sum + effectiveWidths[col.id], 0),
    [columns, effectiveWidths],
  )

  const isCellExpanded = useCallback(
    (rowId: string, columnId: TColumnId) =>
      expandedColumns.has(columnId) || expandedCells.has(cellKey(rowId, columnId)),
    [expandedColumns, expandedCells],
  )

  const toggleCellExpanded = useCallback(
    (rowId: string, columnId: TColumnId) => {
      if (expandedColumns.has(columnId)) return
      const key = cellKey(rowId, columnId)
      setExpandedCells((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [expandedColumns],
  )

  const toggleColumnExpanded = useCallback((columnId: TColumnId) => {
    setExpandedColumns((current) => {
      const next = new Set(current)
      if (next.has(columnId)) next.delete(columnId)
      else next.add(columnId)
      return next
    })
    setExpandedCells((current) => {
      const next = new Set(current)
      for (const key of current) {
        if (key.endsWith(`:${columnId}`)) next.delete(key)
      }
      return next
    })
  }, [])

  const startResize = useCallback(
    (columnId: TColumnId, clientX: number) => {
      resizingRef.current = { columnId, startX: clientX, startWidth: effectiveWidths[columnId] }

      function onMouseMove(event: MouseEvent) {
        const current = resizingRef.current
        if (!current) return
        const delta = event.clientX - current.startX
        const nextWidth = Math.max(minWidths[current.columnId], current.startWidth + delta)
        setWidths((prev) => ({ ...prev, [current.columnId]: nextWidth }))
        setExpandedColumns((prev) => {
          if (!prev.has(current.columnId)) return prev
          const next = new Set(prev)
          next.delete(current.columnId)
          return next
        })
      }

      function onMouseUp() {
        resizingRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [effectiveWidths, minWidths],
  )

  function resetColumnWidths() {
    setWidths({ ...defaultWidths })
    setExpandedColumns(new Set())
    setExpandedCells(new Set())
  }

  function wrapExpandableCell(
    rowId: string,
    columnId: TColumnId,
    label: string,
    content: ReactNode,
  ) {
    if (!expandableColumns.has(columnId)) return content

    const expanded = isCellExpanded(rowId, columnId)
    const columnExpanded = expandedColumns.has(columnId)

    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{content}</div>
        {!columnExpanded && (
          <ExpandToggleButton
            expanded={expanded}
            onToggle={() => toggleCellExpanded(rowId, columnId)}
            label={label}
          />
        )}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <table className="min-w-full text-sm">
        <tbody>
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-navy-500">
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  return (
    <div>
      <div className="px-4 py-2 border-b border-navy-900/5 flex justify-end">
        <button
          type="button"
          onClick={resetColumnWidths}
          className="text-xs font-medium text-navy-500 hover:text-navy-800"
        >
          Reset column widths
        </button>
      </div>
      <table
        className="text-sm"
        style={{ tableLayout: 'fixed', width: tableWidth, minWidth: '100%' }}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.id} style={{ width: effectiveWidths[col.id] }} />
          ))}
        </colgroup>
        <thead className="bg-navy-900/[0.03] text-left text-navy-600">
          <tr>
            {columns.map((col) => {
              const columnExpanded = expandedColumns.has(col.id)
              const resizable = col.resizable !== false

              return (
                <th
                  key={col.id}
                  className="relative px-4 py-3 font-medium select-none"
                  style={{ width: effectiveWidths[col.id] }}
                >
                  <div className="flex items-center gap-1 pr-2 min-w-0">
                    <span className="truncate flex-1">{col.label}</span>
                    {expandableColumns.has(col.id) && (
                      <ExpandToggleButton
                        expanded={columnExpanded}
                        onToggle={() => toggleColumnExpanded(col.id)}
                        label={`${col.label} column`}
                      />
                    )}
                  </div>
                  {resizable && (
                    <button
                      type="button"
                      aria-label={`Resize ${col.label} column`}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 hover:bg-teal-400/20"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        startResize(col.id, event.clientX)
                      }}
                    />
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-900/5 text-navy-800">
          {rows.map((row) => {
            const rowId = getRowId(row)
            return (
              <tr key={rowId}>
                {columns.map((col) => {
                  const expanded = isCellExpanded(rowId, col.id)
                  const content = renderCell(col.id, row, expanded)
                  return (
                    <td key={col.id} className={cellClassName(expanded, col.nowrap && !expanded)}>
                      {expandableColumns.has(col.id)
                        ? wrapExpandableCell(rowId, col.id, col.label, content)
                        : content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
