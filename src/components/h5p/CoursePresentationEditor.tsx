import type { H5PBuilderForm, H5PSlide } from '../../lib/h5p/types'
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

function createSlide(): H5PSlide {
  return { title: 'New slide', content: '' }
}

export default function CoursePresentationEditor({
  form,
  onChange,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
}) {
  const slides = form.slides
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(slides.length)
  const selected = slides[selectedIndex]

  function updateSlides(next: H5PSlide[]) {
    onChange({ slides: next })
  }

  function updateSlide(index: number, next: H5PSlide) {
    updateSlides(slides.map((item, i) => (i === index ? next : item)))
  }

  function addSlide() {
    updateSlides([...slides, createSlide()])
    setSelectedIndex(slides.length)
  }

  function removeSlide(index: number) {
    if (slides.length <= 1) {
      updateSlides([createSlide()])
      setSelectedIndex(0)
      return
    }
    updateSlides(slides.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, slides.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel="Course Presentation"
      countLabel={`${slides.length} slide${slides.length === 1 ? '' : 's'}`}
    >
      <CollapsibleSection title="Presentation settings">
        <EditorField label="Title" id="cp-title">
          <input
            id="cp-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField label="Introduction" id="cp-intro">
          <textarea
            id="cp-intro"
            className={editorTextareaClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Optional context for the presentation."
          />
        </EditorField>
      </CollapsibleSection>

      <ListSection
        title="Slides"
        description="Build your presentation slide by slide."
        sidebar={
          <>
            <SidebarAddButton label="Add slide" onClick={addSlide} />
            <ul className="space-y-1 pt-1">
              {slides.map((slide, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={`Slide ${index + 1}`}
                    label={truncateLabel(slide.title, `Slide ${index + 1}`)}
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
              typeLabel="Text slide"
              onMoveUp={() => {
                updateSlides(moveListItem(slides, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updateSlides(moveListItem(slides, selectedIndex, 1))
                setSelectedIndex(Math.min(slides.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removeSlide(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === slides.length - 1}
            />

            <EditorField label="Slide title" id={`cp-slide-title-${selectedIndex}`}>
              <input
                id={`cp-slide-title-${selectedIndex}`}
                className={editorInputClass}
                value={selected.title}
                onChange={(e) => updateSlide(selectedIndex, { ...selected, title: e.target.value })}
              />
            </EditorField>

            <EditorField label="Slide content" id={`cp-slide-content-${selectedIndex}`}>
              <textarea
                id={`cp-slide-content-${selectedIndex}`}
                className={editorTextareaClass}
                value={selected.content}
                onChange={(e) => updateSlide(selectedIndex, { ...selected, content: e.target.value })}
                placeholder="Main text for this slide."
              />
            </EditorField>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add a slide to get started.
          </div>
        )}
      </ListSection>
    </EditorShell>
  )
}
