import type { H5PBuilderForm, H5PAccordionPanel } from '../../lib/h5p/types'
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

function createPanel(): H5PAccordionPanel {
  return { title: 'Section', content: '' }
}

export default function AccordionEditor({
  form,
  onChange,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
}) {
  const panels = form.accordionPanels
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(panels.length)
  const selected = panels[selectedIndex]

  function updatePanels(next: H5PAccordionPanel[]) {
    onChange({ accordionPanels: next })
  }

  function updatePanel(index: number, next: H5PAccordionPanel) {
    updatePanels(panels.map((item, i) => (i === index ? next : item)))
  }

  function addPanel() {
    updatePanels([...panels, createPanel()])
    setSelectedIndex(panels.length)
  }

  function removePanel(index: number) {
    if (panels.length <= 1) {
      updatePanels([createPanel()])
      setSelectedIndex(0)
      return
    }
    updatePanels(panels.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, panels.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel="Accordion"
      countLabel={`${panels.length} panel${panels.length === 1 ? '' : 's'}`}
    >
      <CollapsibleSection title="Accordion settings">
        <EditorField label="Title" id="acc-title">
          <input
            id="acc-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>
      </CollapsibleSection>

      <ListSection
        title="Panels"
        description="Each panel becomes an expandable section."
        sidebar={
          <>
            <SidebarAddButton label="Add panel" onClick={addPanel} />
            <ul className="space-y-1 pt-1">
              {panels.map((panel, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={`Panel ${index + 1}`}
                    label={truncateLabel(panel.title, `Panel ${index + 1}`)}
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
              typeLabel="Accordion panel"
              onMoveUp={() => {
                updatePanels(moveListItem(panels, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updatePanels(moveListItem(panels, selectedIndex, 1))
                setSelectedIndex(Math.min(panels.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removePanel(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === panels.length - 1}
            />

            <EditorField label="Panel title" id={`acc-panel-title-${selectedIndex}`}>
              <input
                id={`acc-panel-title-${selectedIndex}`}
                className={editorInputClass}
                value={selected.title}
                onChange={(e) => updatePanel(selectedIndex, { ...selected, title: e.target.value })}
              />
            </EditorField>

            <EditorField label="Panel content" id={`acc-panel-content-${selectedIndex}`}>
              <textarea
                id={`acc-panel-content-${selectedIndex}`}
                className={editorTextareaClass}
                value={selected.content}
                onChange={(e) => updatePanel(selectedIndex, { ...selected, content: e.target.value })}
                placeholder="Content shown when the panel is expanded."
              />
            </EditorField>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add a panel to get started.
          </div>
        )}
      </ListSection>
    </EditorShell>
  )
}
