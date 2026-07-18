"use client";

/** Minimal toast system for action feedback. */
import { create } from "zustand";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "./primitives";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  detail?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const toneIcon: Record<string, React.ReactNode> = {
  ok: <CheckCircle2 size={15} aria-hidden />,
  warn: <AlertTriangle size={15} aria-hidden />,
  bad: <ShieldAlert size={15} aria-hidden />,
  info: <Info size={15} aria-hidden />,
  neutral: <Info size={15} aria-hidden />,
  esc: <Info size={15} aria-hidden />,
  accent: <Info size={15} aria-hidden />,
};

const toneBorder: Record<string, string> = {
  ok: "border-ok/40 text-ok",
  warn: "border-warn/40 text-warn",
  bad: "border-bad/40 text-bad",
  info: "border-info/40 text-info",
  neutral: "border-line-strong text-ink-2",
  esc: "border-esc/40 text-esc",
  accent: "border-accent/40 text-accent",
};

export function ToastViewport() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed top-16 right-3 z-[60] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-[3px] border bg-panel px-3 py-2.5 text-left shadow-[0_14px_34px_rgba(21,32,41,0.15)]",
            toneBorder[t.tone],
          )}
        >
          <span className="mt-0.5 shrink-0">{toneIcon[t.tone]}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-ink">{t.title}</span>
            {t.detail && <span className="mt-0.5 block text-xs text-ink-2">{t.detail}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
