import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS = {
  quiet: "border border-line bg-sheet text-ink hover:bg-accent-soft",
  solid: "bg-accent text-on-accent",
  ghost: "text-ink hover:bg-accent-soft",
} as const;

export function Button({
  variant = "quiet",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink placeholder:text-muted";
