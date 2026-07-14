"use client";

/** Small accessible UI primitives shared across the product. */
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type Tone = "ok" | "warn" | "bad" | "esc" | "info" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  ok: "text-ok bg-ok-dim border-ok/30",
  warn: "text-warn bg-warn-dim border-warn/30",
  bad: "text-bad bg-bad-dim border-bad/30",
  esc: "text-esc bg-esc-dim border-esc/30",
  info: "text-info bg-info-dim border-info/30",
  neutral: "text-ink-2 bg-neutral-dim border-line-strong",
  accent: "text-accent bg-accent-dim/40 border-accent/30",
};

export function Badge({
  tone = "neutral",
  outlined = false,
  icon,
  children,
  className,
  title,
}: {
  tone?: Tone;
  /** Dashed-outline treatment marks agent proposals vs approved state. */
  outlined?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-px text-[11px] font-medium tracking-wide whitespace-nowrap",
        toneClasses[tone],
        outlined && "border-dashed bg-transparent",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-canvas font-semibold hover:bg-accent/85 disabled:bg-accent/30 disabled:text-canvas/60",
  secondary:
    "border border-line-strong bg-panel-2 text-ink hover:border-accent/50 hover:bg-panel-2/80 disabled:opacity-45",
  ghost: "text-ink-2 hover:bg-panel-2 hover:text-ink disabled:opacity-45",
  danger:
    "border border-bad/40 bg-bad-dim text-bad hover:border-bad/70 disabled:opacity-45",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sm transition-colors duration-150 disabled:cursor-not-allowed",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-md border border-line bg-panel", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h2 className="text-xs font-semibold tracking-widest text-ink-2 uppercase">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Key-value metadata row
// ---------------------------------------------------------------------------

export function Kv({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className={cn("text-right text-ink", mono && "font-mono text-xs tnum")}>{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal / Drawer (shared overlay behavior)
// ---------------------------------------------------------------------------

function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);
  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/70 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "w-full rounded-md border border-line-strong bg-panel shadow-2xl",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X size={14} aria-hidden />
          </Button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-canvas/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line-strong bg-panel shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            <X size={14} aria-hidden />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline alert
// ---------------------------------------------------------------------------

export function InlineAlert({
  tone,
  icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "bad" || tone === "warn" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-sm border px-3 py-2 text-[13px]", toneClasses[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="text-ink">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-sm border border-line-strong bg-inset px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent/60";
