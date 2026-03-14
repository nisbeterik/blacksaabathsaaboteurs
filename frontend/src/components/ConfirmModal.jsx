export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-raised border border-border rounded shadow-lg max-w-sm w-full mx-4 p-5">
        <p className="text-sm text-text-hi whitespace-pre-line">{message}</p>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs border border-border text-text-lo hover:text-text-hi rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs border border-col-red/50 text-col-red hover:bg-col-red/10 rounded transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
