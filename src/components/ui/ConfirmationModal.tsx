'use client';

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  align?: 'center' | 'end';
  closeOnConfirm?: boolean;
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  align = 'end',
  closeOnConfirm = true,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl text-center">
        <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 text-center">{message}</p>
        <div className={`mt-6 flex gap-3 ${align === 'center' ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              if (closeOnConfirm) {
                onClose();
              }
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
