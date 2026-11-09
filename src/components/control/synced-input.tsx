"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type Ref } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  ref?: Ref<HTMLInputElement>;
  value: string | number;
  onValue: (value: string) => void;
};

/**
 * An input that takes updates from other devices, except while someone is
 * typing in it. In live use, redrawing a field mid-typing closed the phone
 * keyboard after every letter; the rule is "never redraw a field the user
 * is typing in".
 */
export function SyncedInput({ value, onValue, onFocus, onBlur, ...props }: Props) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  return (
    <input
      {...props}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDraft(String(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
}
