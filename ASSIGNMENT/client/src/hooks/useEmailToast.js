import { useEffect, useState } from 'react';

export function useEmailToast() {
  const [toast, setToast] = useState({ show: false, message: '', tone: 'success', leaving: false });

  useEffect(() => {
    if (!toast.show || toast.leaving) return undefined;
    const hideTimer = setTimeout(() => setToast((t) => ({ ...t, leaving: true })), 2600);
    const removeTimer = setTimeout(() => setToast({ show: false, message: '', tone: 'success', leaving: false }), 3000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.show, toast.leaving]);

  function showToast(message, tone = 'success') {
    setToast({ show: true, message, tone, leaving: false });
  }

  return { toast, showToast };
}
