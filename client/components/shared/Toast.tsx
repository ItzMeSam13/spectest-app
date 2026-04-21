"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const config = {
    success: { icon: CheckCircle, color: "#00E396", bg: "rgba(0,227,150,0.12)", border: "rgba(0,227,150,0.25)" },
    error: { icon: XCircle, color: "#FF4560", bg: "rgba(255,69,96,0.12)", border: "rgba(255,69,96,0.25)" },
    info: { icon: Info, color: "#00D4FF", bg: "rgba(0,212,255,0.12)", border: "rgba(0,212,255,0.25)" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, color, bg, border } = config[t.type];
          return (
            <div
              key={t.id}
              className="toast-slide-in flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl max-w-sm"
              style={{
                background: `linear-gradient(180deg, ${bg}, #141D35)`,
                border: `1px solid ${border}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${border}`,
              }}
            >
              <Icon size={18} style={{ color, flexShrink: 0 }} />
              <p className="text-sm flex-1" style={{ color: "#E8EEFF" }}>
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                style={{ color: "#4A5A78" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#7B8DB0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#4A5A78")}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
