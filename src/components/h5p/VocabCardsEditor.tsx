import type { H5PBuilderForm, H5PVocabCard } from '../../lib/h5p/types'
import {
  CollapsibleSection,
  EditorField,
  EditorShell,
  ItemToolbar,
  ListSection,
  SidebarAddButton,
  SidebarImportButton,
  SidebarItemButton,
  editorInputClass,
  moveListItem,
  truncateLabel,
  useSelectedIndex,
} from './editorUi'

function createCard(): H5PVocabCard {
  return { term: '', translation: '' }
}

export default function VocabCardsEditor({
  form,
  onChange,
  onImportFile,
  simpleMode = false,
  variant,
}: {
  form: H5PBuilderForm
  onChange: (patch: Partial<H5PBuilderForm>) => void
  onImportFile?: (file: File) => Promise<void>
  simpleMode?: boolean
  variant: 'dialog-cards' | 'flashcards' | 'crossword'
}) {
  const cards = form.vocabCards
  const { selectedIndex, setSelectedIndex } = useSelectedIndex(cards.length)
  const selected = cards[selectedIndex]

  const labels =
    variant === 'dialog-cards'
      ? {
          type: simpleMode ? 'Flip cards' : 'Dialog cards',
          list: simpleMode ? 'Vocabulary cards' : 'Cards',
          term: 'Front (word or phrase)',
          translation: 'Back (translation)',
          termPlaceholder: 'bonjour',
          translationPlaceholder: 'hello',
        }
      : variant === 'crossword'
        ? {
            type: simpleMode ? 'Crossword' : 'Crossword',
            list: simpleMode ? 'Clues and answers' : 'Words',
            term: 'Answer (word in grid)',
            translation: 'Clue (translation or definition)',
            termPlaceholder: 'bonjour',
            translationPlaceholder: 'hello',
          }
        : {
            type: simpleMode ? 'Type-answer cards' : 'Flashcards',
            list: simpleMode ? 'Vocabulary cards' : 'Cards',
            term: 'Prompt',
            translation: 'Correct answer',
            termPlaceholder: 'bonjour',
            translationPlaceholder: 'hello',
          }

  function updateCards(next: H5PVocabCard[]) {
    onChange({ vocabCards: next })
  }

  function updateCard(index: number, next: H5PVocabCard) {
    updateCards(cards.map((item, i) => (i === index ? next : item)))
  }

  function addCard() {
    updateCards([...cards, createCard()])
    setSelectedIndex(cards.length)
  }

  function removeCard(index: number) {
    if (cards.length <= 1) {
      updateCards([createCard()])
      setSelectedIndex(0)
      return
    }
    updateCards(cards.filter((_, i) => i !== index))
    setSelectedIndex(Math.min(index, cards.length - 2))
  }

  return (
    <EditorShell
      contentTypeLabel={labels.type}
      countLabel={`${cards.length} ${variant === 'crossword' ? 'word' : 'card'}${cards.length === 1 ? '' : 's'}`}
    >
      <CollapsibleSection title="Activity settings">
        <EditorField label="Title" id="vc-title">
          <input
            id="vc-title"
            className={editorInputClass}
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </EditorField>
        <EditorField label="Instructions" id="vc-intro">
          <input
            id="vc-intro"
            className={editorInputClass}
            value={form.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
            placeholder="Brief instructions for students"
          />
        </EditorField>
      </CollapsibleSection>

      <ListSection
        title={labels.list}
        description={
          variant === 'dialog-cards'
            ? 'Each card shows the term on the front; students flip to see the translation.'
            : variant === 'crossword'
              ? 'Each row is a clue and the word that fills the grid. Single words intersect best; phrases may not fit.'
              : 'Students type the translation before checking their answer.'
        }
        sidebar={
          <>
            <SidebarAddButton label="Add card" onClick={addCard} />
            {onImportFile ? (
              <SidebarImportButton
                accept=".csv,.txt,text/csv,text/plain"
                label="Import CSV/TXT"
                onImport={async (file) => {
                  await onImportFile(file)
                  setSelectedIndex(0)
                }}
              />
            ) : null}
            <ul className="space-y-1 pt-1">
              {cards.map((card, index) => (
                <li key={index}>
                  <SidebarItemButton
                    active={index === selectedIndex}
                    badge={`Card ${index + 1}`}
                    label={truncateLabel(card.term, `Card ${index + 1}`)}
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
              typeLabel="Vocabulary card"
              onMoveUp={() => {
                updateCards(moveListItem(cards, selectedIndex, -1))
                setSelectedIndex(Math.max(0, selectedIndex - 1))
              }}
              onMoveDown={() => {
                updateCards(moveListItem(cards, selectedIndex, 1))
                setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1))
              }}
              onRemove={() => removeCard(selectedIndex)}
              disableMoveUp={selectedIndex === 0}
              disableMoveDown={selectedIndex === cards.length - 1}
            />
            <EditorField label={labels.term} id="vc-term">
              <input
                id="vc-term"
                className={editorInputClass}
                value={selected.term}
                onChange={(e) => updateCard(selectedIndex, { ...selected, term: e.target.value })}
                placeholder={labels.termPlaceholder}
              />
            </EditorField>
            <EditorField label={labels.translation} id="vc-translation">
              <input
                id="vc-translation"
                className={editorInputClass}
                value={selected.translation}
                onChange={(e) => updateCard(selectedIndex, { ...selected, translation: e.target.value })}
                placeholder={labels.translationPlaceholder}
              />
            </EditorField>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">Add a card to get started.</div>
        )}
      </ListSection>
    </EditorShell>
  )
}
