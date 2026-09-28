"use client";

import { useEffect, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/**
 * Form pieces following DESIGN.md "Form fields" and "Buttons": label above,
 * help text under the label, an "Error:" message under the field, 44px
 * controls, 2px corners. Every form uses these so they all behave the same.
 */

const control = "mt-2 block min-h-11 w-full rounded-control bg-surface px-3 text-base text-foreground";
const border = (invalid: boolean) => (invalid ? "border-2 border-accent" : "border border-border-strong");

function describedBy(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-accent">
      Error: {message}
    </p>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({ id, label, hint, error, ...input }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, error ? errorId : undefined)}
        className={`${control} ${border(Boolean(error))}`}
        {...input}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  /** Shown first with an empty value, so nothing is chosen until the student picks. */
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
  /** For fields inside a fieldset that shows one shared hint and error. */
  describedById?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function SelectField({ id, label, placeholder, options, invalid = false, describedById, ...select }: SelectFieldProps) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="block">
        {label}
      </label>
      <select
        id={id}
        name={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        className={`${control} ${border(invalid)}`}
        {...select}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** One problem to list. Without `fieldId` it's about the whole form (shown as text, not a link). */
export type SummaryItem = { fieldId?: string; message: string };

/**
 * Lists every problem as a link to its field and takes focus when it appears,
 * so keyboard and screen reader users hear what went wrong first.
 * `items` must only change when a new submission comes back (use useMemo).
 */
export function ErrorSummary({ items }: { items: SummaryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length > 0) ref.current?.focus();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className="border-2 border-accent bg-surface p-4"
    >
      <h2 id="error-summary-title" className="text-lg font-bold">
        Please fix these and try again
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map(({ fieldId, message }) => (
          <li key={fieldId ?? message}>
            {fieldId ? (
              <a
                href={`#${fieldId}`}
                onClick={(event) => {
                  // Jumping to #id scrolls but doesn't always focus; focus the field itself.
                  event.preventDefault();
                  document.getElementById(fieldId)?.focus();
                }}
              >
                {message}
              </a>
            ) : (
              message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A panel that replaces a form once it's done (such as "Check your email").
 * It takes focus so keyboard and screen reader users land on the news
 * instead of on nothing (the button they pressed is gone).
 */
export function ResultPanel({
  title,
  tone = "info",
  children,
}: {
  title: string;
  /** "error" uses DESIGN.md's error state: a 2px accent border on all four sides. */
  tone?: "info" | "error";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-labelledby="result-title"
      className={`mt-8 bg-surface p-4 lg:p-6 ${tone === "error" ? "border-2 border-accent" : "border border-border-subtle"}`}
    >
      <h2 id="result-title" className="text-lg font-bold">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

/**
 * The form's main button. While the action runs it shows `pendingLabel`,
 * keeps its width (both labels share one grid cell) and ignores extra clicks.
 */
const buttonStyles = {
  primary: "bg-primary text-surface hover:bg-foreground",
  secondary: "border border-border-strong bg-surface text-foreground hover:border-foreground",
  delete: "bg-accent text-surface hover:bg-foreground",
} as const;

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  /** DESIGN.md "Buttons": primary for the one main action, secondary for others, delete for deleting data. */
  variant?: keyof typeof buttonStyles;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
      className={`inline-flex min-h-11 items-center rounded-control px-4 font-bold ${buttonStyles[variant]}`}
    >
      <span className="grid">
        <span className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}>{children}</span>
        <span className={`col-start-1 row-start-1 ${pending ? "" : "invisible"}`}>{pendingLabel}</span>
      </span>
    </button>
  );
}
