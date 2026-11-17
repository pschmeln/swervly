"use client";

import { useState } from "react";
import { TextInput } from "@/components/ui";

type PasswordInputProps = {
  id: string;
  name?: string;
  value: string;
  disabled?: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
};

export function PasswordInput({
  id,
  name,
  value,
  disabled,
  autoComplete = "new-password",
  onChange,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextInput
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="pr-24"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-2 my-auto inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-60"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
