import type { H5PBuilderForm } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  editorInputClass,
  editorTextareaClass,
} from './editorUi'

export default function BlanksEditor({
  form,
  onChange,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
}) {
  return (
    <EditorShell contentTypeLabel="Fill in the Blanks">
      <CollapsibleSection title="Task">
        <EditorField label="Title" id="blanks-title">
          <input
            id="blanks-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField
          label="Cloze text"
          id="blanks-text"
          hint="Wrap correct answers in asterisks, e.g. We are located in *Foster City*."
        >
          <textarea
            id="blanks-text"
            className={`${editorTextareaClass} min-h-[10rem] font-mono text-[13px]`}
            value={form.blanksText}
            onChange={(e) => onChange({ blanksText: e.target.value })}
            placeholder="Complete the sentence: The capital of France is *Paris*."
          />
        </EditorField>
      </CollapsibleSection>

      <CollapsibleSection title="Behavioural settings" defaultOpen={false}>
        <EditorField label="Introduction" id="blanks-intro">
          <textarea
            id="blanks-intro"
            className={editorTextareaClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Optional instructions for learners."
          />
        </EditorField>
      </CollapsibleSection>
    </EditorShell>
  )
}
