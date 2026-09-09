import type { H5PBuilderForm, H5PQuizQuestion, H5PQuizSettings } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  ItemToolbar,
  ListSection,
  SidebarAddButton,
  SidebarImportButton,
  SidebarItemButton,
  ToggleField,
  editorInputClass,
  editorTextareaClass,
  moveListItem,
  truncateLabel,
  useSelectedIndex,
} from './editorUi'

function createQuestion(): H5PQuizQuestion {
  return { question: '', answers: ['', '', '', ''], correctIndex: 0 }
}

export default function QuestionSetEditor({
  form,
  onChange,
  onImportCsv,
  simpleMode = false,
  variant = 'question-set',
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  onImportCsv: (file: File) => Promise<void>
  simpleMode?: boolean
  variant?: 'question-set' | 'single-choice-set'
}) {
  const questions = form.quizQuestions
  const settings = form.quizSettings
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(questions.length)
  const selectedQuestion = questions[selectedIndex]

  function updateSettings(patch: Partial<H5PQuizSettings>) {
    onChange({ quizSettings: { ...settings, ...patch } })
  }

  function updateQuestions(nextQuestions: H5PQuizQuestion[]) {
    onChange({ quizQuestions: nextQuestions })
  }

  function updateQuestion(index: number, next: H5PQuizQuestion) {
    updateQuestions(questions.map((question, questionIndex) => (questionIndex === index ? next : question)))
  }

  function addQuestion() {
    updateQuestions([...questions, createQuestion()])
    setSelectedIndex(questions.length)
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) {
      updateQuestions([createQuestion()])
      setSelectedIndex(0)
      return
    }
    updateQuestions(questions.filter((_, questionIndex) => questionIndex !== index))
    setSelectedIndex(Math.min(index, questions.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel={
        variant === 'single-choice-set'
          ? simpleMode
            ? 'Quick quiz'
            : 'Single Choice Set'
          : simpleMode
            ? 'Vocabulary quiz'
            : 'Question Set'
      }
      countLabel={`${questions.length} question${questions.length === 1 ? '' : 's'}`}
    >
      {!simpleMode ? (
      <CollapsibleSection title="Quiz introduction">
        <ToggleField
          label="Display introduction"
          description="Show a title and intro screen before the quiz starts."
          checked={settings.showIntroPage}
          onChange={(showIntroPage) => updateSettings({ showIntroPage })}
        />

        <EditorField label="Title" id="qs-title">
          <input
            id="qs-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>

        <EditorField label="Introduction text" id="qs-intro">
          <textarea
            id="qs-intro"
            className={editorTextareaClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Describe what learners should expect from this quiz."
          />
        </EditorField>

        <div className="grid sm:grid-cols-2 gap-4">
          <EditorField label="Start button text" id="qs-start-button">
            <input
              id="qs-start-button"
              className={editorInputClass}
              value={settings.startButtonText}
              onChange={(e) => updateSettings({ startButtonText: e.target.value })}
            />
          </EditorField>

          <EditorField label="Pass percentage" id="qs-pass-percentage" hint="Minimum score required to pass.">
            <input
              id="qs-pass-percentage"
              type="number"
              min={0}
              max={100}
              className={editorInputClass}
              value={settings.passPercentage}
              onChange={(e) => updateSettings({ passPercentage: Number(e.target.value) || 0 })}
            />
          </EditorField>
        </div>

        <EditorField label="Progress indicator" id="qs-progress-type">
          <select
            id="qs-progress-type"
            className={editorInputClass}
            value={settings.progressType}
            onChange={(e) => updateSettings({ progressType: e.target.value as H5PQuizSettings['progressType'] })}
          >
            <option value="dots">Dots</option>
            <option value="textual">Textual</option>
          </select>
        </EditorField>
      </CollapsibleSection>
      ) : (
        <EditorField label="Quiz title" id="qs-title-simple">
          <input
            id="qs-title-simple"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>
      )}

      <ListSection
        title="Questions"
        description={
          simpleMode
            ? 'Each row is a vocabulary item. Import word,translation or edit below.'
            : 'Add multiple choice questions. Import a CSV or edit each question below.'
        }
        sidebar={
          <>
            <SidebarAddButton label="Add question" onClick={addQuestion} />
            <SidebarImportButton
              label="Import CSV/TXT"
              accept=".csv,.txt,text/csv,text/plain"
              onImport={async (file) => {
                await onImportCsv(file)
                setSelectedIndex(0)
              }}
            />
            <p className="text-[11px] text-slate-500 leading-relaxed px-1">
              {simpleMode ? (
                <>
                  <code className="bg-slate-200/70 px-1 rounded">word,translation</code> or tab-separated lines.
                  Full MCQ format: <code className="bg-slate-200/70 px-1 rounded">question,answers</code> with{' '}
                  <code className="bg-slate-200/70 px-1 rounded">*</code> on the correct option.
                </>
              ) : (
                <>
                  CSV columns: <code className="bg-slate-200/70 px-1 rounded">question</code>,{' '}
                  <code className="bg-slate-200/70 px-1 rounded">answers</code>. Separate answers with{' '}
                  <code className="bg-slate-200/70 px-1 rounded">|</code> or{' '}
                  <code className="bg-slate-200/70 px-1 rounded">;</code>. Mark correct with{' '}
                  <code className="bg-slate-200/70 px-1 rounded">*</code>.
                </>
              )}
            </p>
            <ul className="space-y-1 pt-1">
              {questions.map((question, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={selectedIndex === index}
                    badge={`Q${index + 1} · Multichoice`}
                    label={truncateLabel(question.question, `Question ${index + 1}`)}
                    onClick={() => setSelectedIndex(index)}
                  />
                </li>
              ))}
            </ul>
          </>
        }
      >
        {selectedQuestion ? (
          <>
            <ItemToolbar
              typeLabel="Multichoice question"
              onMoveUp={() => {
                updateQuestions(moveListItem(questions, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updateQuestions(moveListItem(questions, selectedIndex, 1))
                setSelectedIndex(Math.min(questions.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removeQuestion(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === questions.length - 1}
            />

            <EditorField label="Question" id={`qs-question-${selectedIndex}`}>
              <textarea
                id={`qs-question-${selectedIndex}`}
                className={editorTextareaClass}
                value={selectedQuestion.question}
                onChange={(e) => updateQuestion(selectedIndex, { ...selectedQuestion, question: e.target.value })}
                placeholder="Enter your question"
              />
            </EditorField>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Answers</p>
              <p className="text-xs text-slate-500 -mt-2">Select the radio button for the correct answer.</p>
              {selectedQuestion.answers.map((answer, answerIndex) => (
                <label
                  key={answerIndex}
                  className={`flex items-start gap-3 p-3 rounded-md border ${
                    selectedQuestion.correctIndex === answerIndex
                      ? 'border-green-400 bg-green-50/60'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`qs-correct-${selectedIndex}`}
                    checked={selectedQuestion.correctIndex === answerIndex}
                    onChange={() => updateQuestion(selectedIndex, { ...selectedQuestion, correctIndex: answerIndex })}
                    className="mt-2"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-xs font-medium text-slate-500">Option {answerIndex + 1}</span>
                    <input
                      className={editorInputClass}
                      value={answer}
                      onChange={(e) => {
                        const answers = [...selectedQuestion.answers]
                        answers[answerIndex] = e.target.value
                        updateQuestion(selectedIndex, { ...selectedQuestion, answers })
                      }}
                      placeholder={`Answer ${answerIndex + 1}`}
                    />
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  updateQuestion(selectedIndex, {
                    ...selectedQuestion,
                    answers: [...selectedQuestion.answers, ''],
                  })
                }
                className="text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                + Add option
              </button>
              {selectedQuestion.answers.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(selectedIndex, {
                      ...selectedQuestion,
                      answers: selectedQuestion.answers.slice(0, -1),
                      correctIndex: Math.min(selectedQuestion.correctIndex, selectedQuestion.answers.length - 2),
                    })
                  }
                  className="text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Remove last option
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Add a question to get started.
          </div>
        )}
      </ListSection>

      {!simpleMode ? (
      <CollapsibleSection title="Quiz finished: Your result" defaultOpen={false}>
        <ToggleField
          label="Display results"
          checked={settings.showResultPage}
          onChange={(showResultPage) => updateSettings({ showResultPage })}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <ToggleField
            label="Display solution button"
            checked={settings.showSolutionButton}
            onChange={(showSolutionButton) => updateSettings({ showSolutionButton })}
          />
          <ToggleField
            label="Display retry button"
            checked={settings.showRetryButton}
            onChange={(showRetryButton) => updateSettings({ showRetryButton })}
          />
        </div>

        <EditorField label="Feedback heading" id="qs-result-heading">
          <input
            id="qs-result-heading"
            className={editorInputClass}
            value={settings.resultHeading}
            onChange={(e) => updateSettings({ resultHeading: e.target.value })}
          />
        </EditorField>

        <EditorField label="Score announcer" id="qs-score-label" hint="Use @finals and @totals as placeholders.">
          <input
            id="qs-score-label"
            className={editorInputClass}
            value={settings.scoreBarLabel}
            onChange={(e) => updateSettings({ scoreBarLabel: e.target.value })}
          />
        </EditorField>
      </CollapsibleSection>
      ) : null}
    </EditorShell>
  )
}
