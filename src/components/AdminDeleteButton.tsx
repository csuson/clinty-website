type AdminDeleteButtonProps = {
  label: string
  disabled?: boolean
  onDelete: () => Promise<void>
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

export default function AdminDeleteButton({ label, disabled = false, onDelete }: AdminDeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={disabled}
      aria-label={`Delete ${label}`}
      title={`Delete ${label}`}
      className="inline-flex items-center justify-center text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      <TrashIcon />
    </button>
  )
}
