import type { H5PBuilderForm, H5PTimelineEvent } from '../../lib/h5p/types'
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

function createEvent(): H5PTimelineEvent {
  return { headline: 'Event', text: '', startDate: String(new Date().getFullYear()) }
}

export default function TimelineEditor({
  form,
  onChange,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
}) {
  const events = form.timelineEvents
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(events.length)
  const selected = events[selectedIndex]

  function updateEvents(next: H5PTimelineEvent[]) {
    onChange({ timelineEvents: next })
  }

  function updateEvent(index: number, next: H5PTimelineEvent) {
    updateEvents(events.map((item, i) => (i === index ? next : item)))
  }

  function addEvent() {
    updateEvents([...events, createEvent()])
    setSelectedIndex(events.length)
  }

  function removeEvent(index: number) {
    if (events.length <= 1) {
      updateEvents([createEvent()])
      setSelectedIndex(0)
      return
    }
    updateEvents(events.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, events.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel="Timeline"
      countLabel={`${events.length} event${events.length === 1 ? '' : 's'}`}
    >
      <CollapsibleSection title="Timeline settings">
        <EditorField label="Headline" id="tl-title">
          <input
            id="tl-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField label="Text" id="tl-intro">
          <textarea
            id="tl-intro"
            className={editorTextareaClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Summary shown at the top of the timeline."
          />
        </EditorField>
      </CollapsibleSection>

      <ListSection
        title="Dates"
        description="Add chronological events to your timeline."
        sidebar={
          <>
            <SidebarAddButton label="Add event" onClick={addEvent} />
            <ul className="space-y-1 pt-1">
              {events.map((event, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={event.startDate || `Event ${index + 1}`}
                    label={truncateLabel(event.headline, `Event ${index + 1}`)}
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
              typeLabel="Timeline event"
              onMoveUp={() => {
                updateEvents(moveListItem(events, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updateEvents(moveListItem(events, selectedIndex, 1))
                setSelectedIndex(Math.min(events.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removeEvent(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === events.length - 1}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <EditorField label="Headline" id={`tl-headline-${selectedIndex}`}>
                <input
                  id={`tl-headline-${selectedIndex}`}
                  className={editorInputClass}
                  value={selected.headline}
                  onChange={(e) => updateEvent(selectedIndex, { ...selected, headline: e.target.value })}
                />
              </EditorField>

              <EditorField label="Start date" id={`tl-date-${selectedIndex}`} hint="YYYY or YYYY,MM,DD">
                <input
                  id={`tl-date-${selectedIndex}`}
                  className={editorInputClass}
                  value={selected.startDate}
                  onChange={(e) => updateEvent(selectedIndex, { ...selected, startDate: e.target.value })}
                />
              </EditorField>
            </div>

            <EditorField label="Description" id={`tl-text-${selectedIndex}`}>
              <textarea
                id={`tl-text-${selectedIndex}`}
                className={editorTextareaClass}
                value={selected.text}
                onChange={(e) => updateEvent(selectedIndex, { ...selected, text: e.target.value })}
              />
            </EditorField>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add an event to get started.
          </div>
        )}
      </ListSection>
    </EditorShell>
  )
}
