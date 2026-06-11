"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function isoToDisplay(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function displayToIso(display: string) {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

function isValidIsoDate(iso: string) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function DateInput({
  id,
  name,
  defaultValue,
  required,
  onValueChange,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  onValueChange?: (isoValue: string) => void;
}) {
  const [display, setDisplay] = useState(() => isoToDisplay(defaultValue ?? ""));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDate(e.target.value);
    setDisplay(masked);

    if (masked.length === 0) {
      e.target.setCustomValidity("");
    } else if (masked.length < 10 || !isValidIsoDate(displayToIso(masked))) {
      e.target.setCustomValidity("Data inválida");
    } else {
      e.target.setCustomValidity("");
    }

    onValueChange?.(displayToIso(masked));
  }

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={display}
        onChange={handleChange}
        maxLength={10}
        required={required}
      />
      {name && <input type="hidden" name={name} value={displayToIso(display)} />}
    </>
  );
}
