import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const ToastContext = createContext(null);

const typeClassMap = {
  success: "toast-s",
  warning: "toast-w",
  error: "toast-e",
  info: "toast-i",
};

const typeIconMap = {
  success: "✅",
  warning: "⚠️",
  error: "⛔",
  info: "ℹ️",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "success", message = "", duration = 3200 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((prev) => [
        ...prev,
        {
          id,
          type,
          message,
          visible: true,
        },
      ]);

      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === id ? { ...toast, visible: false } : toast
          )
        );
      }, duration);

      window.setTimeout(() => {
        removeToast(id);
      }, duration + 350);
    },
    [removeToast]
  );

  const api = useMemo(
    () => ({
      showToast,
      success: (message, duration) =>
        showToast({ type: "success", message, duration }),
      warning: (message, duration) =>
        showToast({ type: "warning", message, duration }),
      error: (message, duration) =>
        showToast({ type: "error", message, duration }),
      info: (message, duration) =>
        showToast({ type: "info", message, duration }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div id="toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${typeClassMap[toast.type] || "toast-s"} ${
              toast.visible ? "show" : "hide"
            }`}
            role="status"
          >
            <span className="toast-ico">
              {typeIconMap[toast.type] || "✅"}
            </span>
            <div>{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}