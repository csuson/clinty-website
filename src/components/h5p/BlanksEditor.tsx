import type { H5PBuilderForm } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  editorInputClass,
  SidebarImportButton,
  editorTextareaClass,
} from './editorUi'

export default function BlanksEditor({
  form,
  onChange,
  onImportFile,
  simpleMode = false,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  onImportFile?: (file: File) => Promise<void>
  simpleMode?: boolean
}) {
  return (
    <EditorShell contentTypeLabel="Fill in the Blanks">
      <CollapsibleSection title="Exercise">
        <EditorField label="Title" id="blanks-title">
          <input
            id="blanks-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        {onImportFile ? (
          <SidebarImportButton
            accept=".csv,.txt,text/csv,text/plain"
            label="Import CSV/TXT"
            onImport={onImportFile}
          />
        ) : null}

        <EditorField
          label="Cloze text"
          id="blanks-text"
          hint="Wrap correct answers in *asterisks*. Import a word list to auto-build sentences."
        >
          <textarea
            id="blanks-text"
            className={`${editorTextareaClass} min-h-[10rem] font-mono text-[13px]`}
            value={form.blanksText}
            onChange={(e) => onChange({ blanksText: e.target.value })}
            placeholder={'The word "bonjour" means *hello*.\n\n"Merci" means *thank you*.'}
          />
        </EditorField>
      </CollapsibleSection>

      {!simpleMode ? (
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
      ) : null}
    </EditorShell>
  )
}
