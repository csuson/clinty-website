import { findColumnIndex, parseCsvRows, readCsvFile, resolveTwoColumnIndices } from './csvParse'
import type { H5PQuizQuestion } from './types'

function parseAnswersCell(value: string): Pick<H5PQuizQuestion, 'answers' | 'correctIndex'> {
  const parts = value
    .split(/[|;]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) {
    return { answers: [''], correctIndex: 0 }
  }

  let correctIndex = 0
  const answers = parts.map((part, index) => {
    const wrapped = part.match(/^\*(.+)\*$/)
    const prefix = part.match(/^\*(.+)$/)
    const suffix = part.match(/^(.+)\*$/)

    if (wrapped) {
      correctIndex = index
      return wrapped[1].trim()
    }
    if (prefix) {
      correctIndex = index
      return prefix[1].trim()
    }
    if (suffix) {
      correctIndex = index
      return suffix[1].trim()
    }

    return part
  })

  return { answers, correctIndex }
}

export function parseQuizCsv(text: string): H5PQuizQuestion[] {
  const rows = parseCsvRows(text.trim())
  if (!rows.length) {
    throw new Error('CSV file is empty.')
  }

  const headers = rows[0]
  let questionIndex = findColumnIndex(headers, ['question', 'questions', 'lesson', 'prompt'])
  let answersIndex = findColumnIndex(headers, ['answers', 'answer', 'aswers', 'options', 'leçon', 'lecon', 'translation'])

  if (questionIndex < 0 || answersIndex < 0) {
    try {
      const columns = resolveTwoColumnIndices(headers)
      questionIndex = columns.left
      answersIndex = columns.right
    } catch {
      throw new Error('CSV must include "question" and "answers" columns, or any two columns such as "lesson,leçon".')
    }
  }

  const questions: H5PQuizQuestion[] = []

  for (const row of rows.slice(1)) {
    const question = (row[questionIndex] ?? '').trim()
    const answersCell = (row[answersIndex] ?? '').trim()
    if (!question || !answersCell) continue

    const { answers, correctIndex } = parseAnswersCell(answersCell)
    questions.push({ question, answers, correctIndex })
  }

  if (!questions.length) {
    throw new Error('No quiz rows found. Add at least one question and answers row.')
  }

  return questions
}

export async function readQuizCsvFile(file: File): Promise<H5PQuizQuestion[]> {
  const text = await readCsvFile(file)
  return parseQuizCsv(text)
}
