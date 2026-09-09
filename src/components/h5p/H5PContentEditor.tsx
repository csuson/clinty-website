import type { H5PBuilderForm } from '../../lib/h5p/types'
import AccordionEditor from './AccordionEditor'
import BlanksEditor from './BlanksEditor'
import CoursePresentationEditor from './CoursePresentationEditor'
import DragDropEditor from './DragDropEditor'
import InteractiveVideoEditor from './InteractiveVideoEditor'
import QuestionSetEditor from './QuestionSetEditor'
import TimelineEditor from './TimelineEditor'
import VocabCardsEditor from './VocabCardsEditor'
import MarkTheWordsEditor from './MarkTheWordsEditor'

export default function H5PContentEditor({
  form,
  onChange,
  simpleMode = false,
  onImportQuizCsv,
  onImportDragDropCsv,
  onImportBlanksFile,
  onImportAccordionFile,
  onImportVocabFile,
  onImportMarkTheWordsFile,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  simpleMode?: boolean
  onImportQuizCsv: (file: File) => Promise<void>
  onImportDragDropCsv: (file: File) => Promise<void>
  onImportBlanksFile: (file: File) => Promise<void>
  onImportAccordionFile: (file: File) => Promise<void>
  onImportVocabFile: (file: File) => Promise<void>
  onImportMarkTheWordsFile: (file: File) => Promise<void>
}) {
  switch (form.contentType) {
    case 'question-set':
    case 'single-choice-set':
      return (
        <QuestionSetEditor
          form={form}
          onChange={onChange}
          onImportCsv={onImportQuizCsv}
          simpleMode={simpleMode}
          variant={form.contentType === 'single-choice-set' ? 'single-choice-set' : 'question-set'}
        />
      )
    case 'interactive-video':
      return <InteractiveVideoEditor form={form} onChange={onChange} />
    case 'course-presentation':
      return <CoursePresentationEditor form={form} onChange={onChange} />
    case 'blanks':
      return (
        <BlanksEditor form={form} onChange={onChange} onImportFile={onImportBlanksFile} simpleMode={simpleMode} />
      )
    case 'drag-and-drop':
      return (
        <DragDropEditor form={form} onChange={onChange} onImportCsv={onImportDragDropCsv} simpleMode={simpleMode} />
      )
    case 'accordion':
      return (
        <AccordionEditor
          form={form}
          onChange={onChange}
          onImportFile={onImportAccordionFile}
          simpleMode={simpleMode}
        />
      )
    case 'timeline':
      return <TimelineEditor form={form} onChange={onChange} />
    case 'dialog-cards':
      return (
        <VocabCardsEditor
          form={form}
          onChange={onChange}
          onImportFile={onImportVocabFile}
          simpleMode={simpleMode}
          variant="dialog-cards"
        />
      )
    case 'flashcards':
      return (
        <VocabCardsEditor
          form={form}
          onChange={onChange}
          onImportFile={onImportVocabFile}
          simpleMode={simpleMode}
          variant="flashcards"
        />
      )
    case 'mark-the-words':
      return (
        <MarkTheWordsEditor
          form={form}
          onChange={onChange}
          onImportFile={onImportMarkTheWordsFile}
          simpleMode={simpleMode}
        />
      )
    default:
      return null
  }
}
