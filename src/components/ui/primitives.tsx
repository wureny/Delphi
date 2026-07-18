"use client";

/** Small accessible UI primitives shared across the product. */
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type Tone = "ok" | "warn" | "bad" | "esc" | "info" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  ok: "text-ok bg-ok-dim border-ok/25",
  warn: "text-warn bg-warn-dim border-warn/25",
  bad: "text-bad bg-bad-dim border-bad/25",
  esc: "text-esc bg-esc-dim border-esc/25",
  info: "text-info bg-info-dim border-info/25",
  neutral: "text-ink-2 bg-neutral-dim border-line",
  accent: "text-accent bg-accent-dim border-accent/25",
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
        "inline-flex min-h-5 shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.035em] whitespace-nowrap",
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
    "border border-accent bg-accent text-white font-semibold shadow-[0_1px_0_rgba(255,255,255,0.16)_inset] hover:border-[#17478f] hover:bg-[#17478f] disabled:border-accent/30 disabled:bg-accent/30 disabled:text-white/80",
  secondary:
    "border border-line-strong bg-panel text-ink shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] hover:border-ink-3 hover:bg-inset disabled:opacity-45",
  ghost: "border border-transparent text-ink-2 hover:border-line hover:bg-panel-2 hover:text-ink disabled:opacity-45",
  danger:
    "border border-bad/35 bg-panel text-bad hover:border-bad/65 hover:bg-bad-dim disabled:opacity-45",
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
        "inline-flex items-center justify-center gap-1.5 rounded-[3px] whitespace-nowrap disabled:cursor-not-allowed",
        size === "sm" ? "min-h-7 px-2.5 py-1 text-[11px]" : "min-h-8 px-3 py-1.5 text-xs",
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
    <section className={cn("rounded-[3px] border border-line bg-panel", className)}>
      {(title || actions) && (
        <header className="flex min-h-10 items-center justify-between gap-2 border-b border-line bg-inset px-3 py-2">
          <h2 className="text-[11px] font-semibold tracking-[0.075em] text-ink-2 uppercase">{title}</h2>
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
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-xs">
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
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const overlayRoot = ref.current?.parentElement;
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRoot)
      .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    for (const { element } of background) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const animationFrame = requestAnimationFrame(() => {
      const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      (focusable[0] ?? ref.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert, ariaHidden } of background) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      previouslyFocused?.focus();
    };
  }, [open]);
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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "w-full rounded-[3px] border border-line-strong bg-panel shadow-[0_24px_64px_rgba(21,32,41,0.18)]",
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
    </div>,
    document.body,
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
  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/25" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line-strong bg-panel shadow-[-20px_0_56px_rgba(21,32,41,0.14)]"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            <X size={14} aria-hidden />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body,
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
      className={cn("flex items-start gap-2 rounded-[3px] border px-3 py-2.5 text-xs", toneClasses[tone], className)}
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
  "w-full rounded-[3px] border border-line-strong bg-panel px-2.5 py-2 text-xs text-ink placeholder:text-ink-3 focus:border-accent";
