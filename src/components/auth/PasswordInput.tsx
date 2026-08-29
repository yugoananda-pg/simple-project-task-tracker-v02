"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type PasswordInputProps = {
  id?: string;
  name: string;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export default function PasswordInput({
  id: idProp,
  name,
  autoComplete,
  disabled = false,
  placeholder,
  className,
}: PasswordInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          "w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-3 pr-11 text-sm text-zinc-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-slate-400",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-zinc-500 transition hover:text-zinc-800 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
