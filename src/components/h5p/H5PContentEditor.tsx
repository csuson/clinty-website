import type { H5PBuilderForm } from '../../lib/h5p/types'
import AccordionEditor from './AccordionEditor'
import BlanksEditor from './BlanksEditor'
import CoursePresentationEditor from './CoursePresentationEditor'
import DragDropEditor from './DragDropEditor'
import InteractiveVideoEditor from './InteractiveVideoEditor'
import QuestionSetEditor from './QuestionSetEditor'
import TimelineEditor from './TimelineEditor'

export default function H5PContentEditor({
  form,
  onChange,
  onImportQuizCsv,
  onImportDragDropCsv,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  onImportQuizCsv: (file: File) => Promise<void>
  onImportDragDropCsv: (file: File) => Promise<void>
}) {
  switch (form.contentType) {
    case 'question-set':
      return <QuestionSetEditor form={form} onChange={onChange} onImportCsv={onImportQuizCsv} />
    case 'interactive-video':
      return <InteractiveVideoEditor form={form} onChange={onChange} />
    case 'course-presentation':
      return <CoursePresentationEditor form={form} onChange={onChange} />
    case 'blanks':
      return <BlanksEditor form={form} onChange={onChange} />
    case 'drag-and-drop':
      return <DragDropEditor form={form} onChange={onChange} onImportCsv={onImportDragDropCsv} />
    case 'accordion':
      return <AccordionEditor form={form} onChange={onChange} />
    case 'timeline':
      return <TimelineEditor form={form} onChange={onChange} />
    default:
      return null
  }
}
