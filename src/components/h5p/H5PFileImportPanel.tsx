import { useRef } from 'react'
import type { H5PContentTypeId } from '../../lib/h5p/types'
import { H5P_TEACHER_EXERCISES } from '../../lib/h5p/types'

export default function H5PFileImportPanel({
  contentType,
  onImportFile,
  disabled,
}: {
  contentType: H5PContentTypeId
  onImportFile: (file: File) => Promise<void>
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const exercise = H5P_TEACHER_EXERCISES.find((entry) => entry.id === contentType)

  return (
    <section className="rounded-2xl border border-dashed border-teal-400/50 bg-teal-50/40 p-5 space-y-3">
      <div>
        <h3 className="font-medium text-navy-900">Import from file</h3>
        <p className="text-sm text-navy-600 mt-1 leading-relaxed">
          Upload a <strong className="font-medium">.csv</strong> or <strong className="font-medium">.txt</strong>{' '}
          word list to fill this exercise automatically.
        </p>
        {exercise ? (
          <p className="text-xs text-navy-500 mt-2 font-mono bg-white/70 rounded-lg px-3 py-2 border border-navy-900/5">
            {exercise.importHint}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void onImportFile(file)
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2.5 rounded-xl bg-white border border-navy-900/10 text-sm font-medium text-navy-900 hover:bg-navy-900/5 disabled:opacity-60"
      >
        Choose CSV or TXT file…
      </button>
    </section>
  )
}
