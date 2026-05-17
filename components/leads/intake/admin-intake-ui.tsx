"use client";

import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import type { ReactNode } from "react";

export function IntakeSection({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={adminIntakeTheme.panel}>
      <header className={adminIntakeTheme.sectionHeader}>
        <h3 className={adminIntakeTheme.sectionTitle}>{title}</h3>
        {description ? (
          <p className={`mt-0.5 ${adminIntakeTheme.sectionSubtitle}`}>{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function IntakeTwoCol({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`${adminIntakeTheme.fieldGrid} ${className}`}>{children}</div>;
}

export function IntakeField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  required = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly placeholder?: string;
  readonly className?: string;
  readonly required?: boolean;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={adminIntakeTheme.label}>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={adminIntakeTheme.input}
      />
    </label>
  );
}

export function IntakeSelect({
  label,
  value,
  onChange,
  children,
  className = "",
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={adminIntakeTheme.label}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={adminIntakeTheme.select}
      >
        {children}
      </select>
    </label>
  );
}

export function IntakeTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={adminIntakeTheme.label}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={adminIntakeTheme.textarea}
      />
    </label>
  );
}

export function IntakeToggle({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F2FE] active:scale-[0.99] ${
        checked
          ? "border-[#00F2FE]/40 bg-[rgba(0,242,254,0.08)] hover:border-[#00F2FE]/55"
          : "border-[#1E2A44] bg-[#0B1020] hover:border-[#00F2FE]/30 hover:bg-[#111827]"
      }`}
    >
      <span className="text-[11px] font-medium text-[#F8FAFC] sm:text-xs">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#00F2FE]" : "bg-[#1E2A44]"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[#080C1A] shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function IntakeChip({
  label,
  active,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${adminIntakeTheme.chipBase} ${
        active ? adminIntakeTheme.chipActive : adminIntakeTheme.chipIdle
      }`}
    >
      {label}
    </button>
  );
}
