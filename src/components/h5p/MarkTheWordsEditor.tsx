import type { H5PBuilderForm } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  SidebarImportButton,
  editorInputClass,
  editorTextareaClass,
} from './editorUi'

export default function MarkTheWordsEditor({
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
    <EditorShell contentTypeLabel={simpleMode ? 'Mark the words' : 'Mark the Words'}>
      <CollapsibleSection title="Activity settings">
        <EditorField label="Title" id="mtw-title">
          <input
            id="mtw-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>
        <EditorField label="Task description" id="mtw-task">
          <input
            id="mtw-task"
            className={editorInputClass}
            value={form.markTheWordsTaskDescription}
            onChange={(e) => onChange({ markTheWordsTaskDescription: e.target.value })}
            placeholder="Click on all the French greetings in the sentence."
          />
        </EditorField>
      </CollapsibleSection>

      <CollapsibleSection title="Text with correct words">
        {onImportFile ? (
          <div className="mb-4">
            <SidebarImportButton
              accept=".csv,.txt,text/csv,text/plain"
              label="Import CSV/TXT"
              onImport={onImportFile}
            />
          </div>
        ) : null}
        <p className="text-xs text-slate-500 mb-3">Wrap each correct word in asterisks: *bonjour*</p>
        <EditorField label="Passage" id="mtw-text">
          <textarea
            id="mtw-text"
            className={editorTextareaClass}
            rows={8}
            value={form.markTheWordsText}
            onChange={(e) => onChange({ markTheWordsText: e.target.value })}
            placeholder="Common greetings include *bonjour* and *merci*."
          />
        </EditorField>
      </CollapsibleSection>
    </EditorShell>
  )
}
