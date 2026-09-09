import type { H5PBuilderForm, H5PDragPair } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  ItemToolbar,
  ListSection,
  SidebarAddButton,
  SidebarImportButton,
  SidebarItemButton,
  editorInputClass,
  moveListItem,
  truncateLabel,
  useSelectedIndex,
} from './editorUi'

function createPair(): H5PDragPair {
  return { draggable: '', dropZone: '' }
}

export default function DragDropEditor({
  form,
  onChange,
  onImportCsv,
  simpleMode = false,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  onImportCsv: (file: File) => Promise<void>
  simpleMode?: boolean
}) {
  const pairs = form.dragPairs
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(pairs.length)
  const selected = pairs[selectedIndex]

  function updatePairs(next: H5PDragPair[]) {
    onChange({ dragPairs: next })
  }

  function updatePair(index: number, next: H5PDragPair) {
    updatePairs(pairs.map((item, i) => (i === index ? next : item)))
  }

  function addPair() {
    updatePairs([...pairs, createPair()])
    setSelectedIndex(pairs.length)
  }

  function removePair(index: number) {
    if (pairs.length <= 1) {
      updatePairs([createPair()])
      setSelectedIndex(0)
      return
    }
    updatePairs(pairs.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, pairs.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel={simpleMode ? 'Matching' : 'Drag and Drop'}
      countLabel={`${pairs.length} pair${pairs.length === 1 ? '' : 's'}`}
    >
      {!simpleMode ? (
      <CollapsibleSection title="Task settings">
        <EditorField label="Title" id="dd-title">
          <input
            id="dd-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField label="Task description" id="dd-intro">
          <input
            id="dd-intro"
            className={editorInputClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Instructions shown above the drag task."
          />
        </EditorField>
      </CollapsibleSection>
      ) : null}

      <ListSection
        title={simpleMode ? 'Word pairs' : 'Elements'}
        description={
          simpleMode
            ? 'Students drag each word to its translation.'
            : 'Each row is one draggable item matched to a drop zone label.'
        }
        sidebar={
          <>
            <SidebarAddButton label="Add pair" onClick={addPair} />
            <SidebarImportButton
              label="Import CSV/TXT"
              onImport={async (file) => {
                await onImportCsv(file)
                setSelectedIndex(0)
              }}
            />
            <p className="text-[11px] text-slate-500 leading-relaxed px-1">
              <code className="bg-slate-200/70 px-1 rounded">word,translation</code> or tab-separated lines.
            </p>
            <ul className="space-y-1 pt-1">
              {pairs.map((pair, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={`Pair ${index + 1}`}
                    label={truncateLabel(pair.draggable, `Pair ${index + 1}`)}
                    onClick={() => setSelectedIndex(index)}
                  />
                </li>
              ))}
            </ul>
          </>
        }
      >
        {selected ? (
          <>
            <ItemToolbar
              typeLabel="Draggable → Drop zone"
              onMoveUp={() => {
                updatePairs(moveListItem(pairs, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updatePairs(moveListItem(pairs, selectedIndex, 1))
                setSelectedIndex(Math.min(pairs.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removePair(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === pairs.length - 1}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <EditorField label="Draggable item" id={`dd-draggable-${selectedIndex}`}>
                <input
                  id={`dd-draggable-${selectedIndex}`}
                  className={editorInputClass}
                  value={selected.draggable}
                  onChange={(e) => updatePair(selectedIndex, { ...selected, draggable: e.target.value })}
                />
              </EditorField>

              <EditorField label="Drop zone label" id={`dd-dropzone-${selectedIndex}`}>
                <input
                  id={`dd-dropzone-${selectedIndex}`}
                  className={editorInputClass}
                  value={selected.dropZone}
                  onChange={(e) => updatePair(selectedIndex, { ...selected, dropZone: e.target.value })}
                />
              </EditorField>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add a pair to get started.
          </div>
        )}
      </ListSection>
    </EditorShell>
  )
}
