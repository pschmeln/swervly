"use client";

import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { focusRing } from "./focus-ring";

export { focusRing };

const controlClass = `min-h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-ink-3 hover:border-neutral-300 ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`;

const buttonVariants = {
  primary: "bg-ink text-white shadow-[0_8px_20px_rgba(11,18,32,0.18)] hover:bg-[#1f2937]",
  secondary: "border border-neutral-200 bg-white text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-neutral-50",
} as const;

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: keyof typeof buttonVariants;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition-colors ${focusRing} disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${buttonVariants[variant]} ${className}`;
  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-ink-2">{hint}</p> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
};

export function TextInput({ className = "", ...props }: TextInputProps) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

type SelectProps = {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export function Select({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  options,
  placeholder,
}: SelectProps) {
  return (
    <select
      id={id}
      name={name}
      className={controlClass}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      disabled={disabled}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
};

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea className={`${controlClass} min-h-28 py-3 ${className}`} {...props} />
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  id: string;
  label: string;
};

export function Checkbox({ id, label, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex min-h-12 items-center gap-3 text-base text-ink">
      <input
        id={id}
        type="checkbox"
        className={`size-5 shrink-0 rounded-md border-neutral-300 accent-[var(--accent)] ${focusRing}`}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

type LikertScaleProps = {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  labels: readonly string[];
};

const LIKERT_SCORES = [1, 2, 3, 4, 5] as const;

export function LikertScale({ name, value, onChange, labels }: LikertScaleProps) {
  return (
    <div role="radiogroup" className="flex items-start justify-between gap-1">
      {LIKERT_SCORES.map((score) => {
        const label = labels[score - 1] ?? String(score);
        const id = `${name}-${score}`;
        const end = score === 1 || score === 5;
        return (
          <div key={id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <input
              id={id}
              className="peer sr-only"
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
            />
            <label
              htmlFor={id}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-white text-base font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-neutral-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
            >
              <span className="sr-only">{label}</span>
              <span aria-hidden="true">{score}</span>
            </label>
            <span
              aria-hidden="true"
              className={
                end
                  ? "text-center text-xs leading-snug text-ink-2"
                  : "hidden text-center text-xs leading-snug text-ink-2 sm:block"
              }
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
