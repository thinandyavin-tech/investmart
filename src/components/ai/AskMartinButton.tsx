"use client";

interface AskMartinButtonProps {
  q:            string;
  className?:   string;
  style?:       React.CSSProperties;
  "aria-label"?: string;
  children:     React.ReactNode;
}

export function AskMartinButton({ q, className, style, "aria-label": ariaLabel, children }: AskMartinButtonProps) {
  function open() {
    window.dispatchEvent(new CustomEvent("martin:open", { detail: { q } }));
  }

  return (
    <button type="button" onClick={open} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
