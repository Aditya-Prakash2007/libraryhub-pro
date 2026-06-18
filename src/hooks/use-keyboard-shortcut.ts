import { useEffect } from "react";

type ModifierKey = "ctrl" | "meta" | "alt" | "shift";

export function useKeyboardShortcut(
  keys: { key: string; modifiers?: ModifierKey[] },
  callback: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const { key, modifiers = [] } = keys;

      const modifierCheck = modifiers.every((mod) => {
        if (mod === "ctrl") return e.ctrlKey;
        if (mod === "meta") return e.metaKey;
        if (mod === "alt") return e.altKey;
        if (mod === "shift") return e.shiftKey;
        return false;
      });

      if (modifierCheck && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keys, callback, enabled]);
}
