import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const controlStyles =
  "w-full rounded-xl border border-line bg-paper px-3.5 text-ink placeholder:text-muted/70 transition-colors hover:border-leaf-700/40 focus:border-leaf-700 focus:outline-2 focus:outline-offset-0 focus:outline-leaf-700/25 aria-invalid:border-chili-600 aria-invalid:focus:outline-chili-600/25";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/**
 * Label, control and error message wired together for assistive tech:
 * the error is announced when it appears and is tied to the control.
 */
function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-chili-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        className={cn(controlStyles, "h-11", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        className={cn(controlStyles, "min-h-24 resize-y py-2.5", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}
