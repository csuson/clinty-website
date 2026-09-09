import type { H5PBuilderForm, H5PInteractiveVideoInteraction } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  ItemToolbar,
  ListSection,
  SidebarAddButton,
  SidebarItemButton,
  editorInputClass,
  editorTextareaClass,
  moveListItem,
  truncateLabel,
  useSelectedIndex,
} from './editorUi'

function createInteraction(): H5PInteractiveVideoInteraction {
  return { time: 0, label: 'Note', text: '' }
}

export default function InteractiveVideoEditor({
  form,
  onChange,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
}) {
  const interactions = form.interactions
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(interactions.length)
  const selected = interactions[selectedIndex]

  function updateInteractions(next: H5PInteractiveVideoInteraction[]) {
    onChange({ interactions: next })
  }

  function updateInteraction(index: number, next: H5PInteractiveVideoInteraction) {
    updateInteractions(interactions.map((item, i) => (i === index ? next : item)))
  }

  function addInteraction() {
    updateInteractions([...interactions, createInteraction()])
    setSelectedIndex(interactions.length)
  }

  function removeInteraction(index: number) {
    if (interactions.length <= 1) {
      updateInteractions([createInteraction()])
      setSelectedIndex(0)
      return
    }
    updateInteractions(interactions.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, interactions.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel="Interactive Video"
      countLabel={`${interactions.length} interaction${interactions.length === 1 ? '' : 's'}`}
    >
      <CollapsibleSection title="Video settings">
        <EditorField label="Title" id="iv-title">
          <input
            id="iv-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField
          label="Video URL"
          id="iv-video-url"
          hint="YouTube or direct MP4 URL. Optional — you can add the video later in H5P."
        >
          <input
            id="iv-video-url"
            className={editorInputClass}
            value={form.videoUrl}
            onChange={(e) => onChange({ videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </EditorField>

        <EditorField label="Description" id="iv-intro">
          <textarea
            id="iv-intro"
            className={editorTextareaClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Optional summary shown before or alongside the video."
          />
        </EditorField>
      </CollapsibleSection>

      <ListSection
        title="Interactions"
        description="Add popup notes or labels at specific timestamps in the video."
        sidebar={
          <>
            <SidebarAddButton label="Add interaction" onClick={addInteraction} />
            <ul className="space-y-1 pt-1">
              {interactions.map((item, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={`${item.time}s · Label`}
                    label={truncateLabel(item.label || item.text, `Interaction ${index + 1}`)}
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
              typeLabel="Text label"
              onMoveUp={() => {
                updateInteractions(moveListItem(interactions, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updateInteractions(moveListItem(interactions, selectedIndex, 1))
                setSelectedIndex(Math.min(interactions.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removeInteraction(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === interactions.length - 1}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <EditorField label="Time (seconds)" id={`iv-time-${selectedIndex}`}>
                <input
                  id={`iv-time-${selectedIndex}`}
                  type="number"
                  min={0}
                  className={editorInputClass}
                  value={selected.time}
                  onChange={(e) => updateInteraction(selectedIndex, { ...selected, time: Number(e.target.value) || 0 })}
                />
              </EditorField>

              <EditorField label="Button label" id={`iv-label-${selectedIndex}`}>
                <input
                  id={`iv-label-${selectedIndex}`}
                  className={editorInputClass}
                  value={selected.label}
                  onChange={(e) => updateInteraction(selectedIndex, { ...selected, label: e.target.value })}
                />
              </EditorField>
            </div>

            <EditorField label="Popup text" id={`iv-text-${selectedIndex}`}>
              <textarea
                id={`iv-text-${selectedIndex}`}
                className={editorTextareaClass}
                value={selected.text}
                onChange={(e) => updateInteraction(selectedIndex, { ...selected, text: e.target.value })}
              />
            </EditorField>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add an interaction to get started.
          </div>
        )}
      </ListSection>
    </EditorShell>
  )
}
