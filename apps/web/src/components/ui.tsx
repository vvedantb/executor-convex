import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-accent text-accent-ink hover:brightness-110 disabled:opacity-50",
    ghost:
      "bg-transparent text-fg border border-line hover:bg-card disabled:opacity-50",
    danger: "bg-danger/15 text-danger hover:bg-danger/25 disabled:opacity-50",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent",
        props.className,
      )}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-card p-5", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "danger";
}) {
  const color = {
    muted: "bg-line text-muted",
    ok: "bg-accent/15 text-accent",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
  }[tone];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", color)}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
