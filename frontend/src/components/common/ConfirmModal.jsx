'use client';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }) {
  if (!isOpen) return null;

  const variantStyles = {
    default: {
      confirm: 'bg-primary text-white hover:bg-primary/90',
      title: 'text-gray-900',
    },
    danger: {
      confirm: 'bg-red-600 text-white hover:bg-red-700',
      title: 'text-red-900',
    },
    warning: {
      confirm: 'bg-yellow-600 text-white hover:bg-yellow-700',
      title: 'text-yellow-900',
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <h3 className={`text-xl font-bold mb-3 ${styles.title}`}>
          {title}
        </h3>
        <p className="text-gray-700 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${styles.confirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

