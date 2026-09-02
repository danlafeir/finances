"use client";

import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatCurrency(raw: string): string {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return raw;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stripFormatting(value: string): string {
  return value.replace(/[$,\s]/g, "");
}

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  defaultValue?: string | number;
  value?: string;
  onChange?: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ defaultValue, value: controlledValue, onChange, onBlur, onFocus, className, ...props }, ref) => {
    const initial = controlledValue ?? (defaultValue != null ? String(defaultValue) : "");
    const [display, setDisplay] = useState(() => {
      const stripped = stripFormatting(initial);
      const num = parseFloat(stripped);
      if (!isNaN(num) && stripped !== "") return formatCurrency(stripped);
      return initial;
    });
    const [focused, setFocused] = useState(false);

    // Sync external controlled value changes (e.g. reset after save)
    useEffect(() => {
      if (controlledValue !== undefined && !focused) {
        const stripped = stripFormatting(controlledValue);
        const num = parseFloat(stripped);
        setDisplay(!isNaN(num) && stripped !== "" ? formatCurrency(stripped) : controlledValue);
      }
    }, [controlledValue, focused]);

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true);
      setDisplay(stripFormatting(display));
      onFocus?.(e);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false);
      const formatted = formatCurrency(display);
      setDisplay(formatted);
      onBlur?.(e);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      setDisplay(raw);
      onChange?.(stripFormatting(raw));
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn("tabular-nums", className)}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
