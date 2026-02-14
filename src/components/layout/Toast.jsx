import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const bg = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'bg-info',
  }[toast.type] || 'bg-info';

  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto md:min-w-[300px] z-[100] px-5 py-3 rounded-xl ${bg} text-white text-[13px] font-semibold text-center shadow-lg`}>
      {toast.msg}
    </div>
  );
}
