import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "bg-emerald-950 text-white hover:bg-emerald-900 shadow-sm",
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:border-emerald-800 hover:text-emerald-900",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    danger: "bg-red-700 text-white hover:bg-red-800",
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_35px_rgba(25,45,38,.055)] ${className}`}
    >
      {children}
    </section>
  );
}
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`block text-sm font-semibold text-slate-700 ${className}`}
    >
      <span>{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-950 placeholder:text-slate-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15 ${className}`}
      {...props}
    />
  );
}
export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-950 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`mt-2 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-950 placeholder:text-slate-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15 ${className}`}
      {...props}
    />
  );
}
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        <h2 className="font-display text-xl font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading content">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
    >
      {message}
    </div>
  );
}
export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-emerald-950">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
