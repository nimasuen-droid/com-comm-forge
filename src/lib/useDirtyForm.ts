import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic draft-state hook for explicit Save / Discard UX.
 *
 * - `draft`        : current edited value (mutate via setDraft).
 * - `baseline`     : last-saved value used for dirty comparison.
 * - `isDirty`      : true when draft !== baseline (deep, JSON-stringified).
 * - `lastSaved`    : Date of last successful Save (null until first save).
 * - `markSaved()`  : promote current draft to baseline + stamp lastSaved.
 * - `discard()`    : revert draft to baseline.
 * - `reset(next)`  : replace both draft & baseline (e.g. when source changes).
 *
 * The hook resyncs the baseline if `initial` identity changes AND the user
 * has no pending edits, so it stays in sync with upstream store updates.
 */
export function useDirtyForm<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialRef = useRef(initial);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  // If upstream `initial` reference changes and user has no pending edits,
  // adopt the new upstream value as both draft and baseline.
  useEffect(() => {
    if (initial === initialRef.current) return;
    initialRef.current = initial;
    if (!isDirty) {
      setDraft(initial);
      setBaseline(initial);
    }
    // Intentionally only react to `initial` reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const markSaved = useCallback(() => {
    setBaseline(draft);
    setLastSaved(new Date());
  }, [draft]);

  const discard = useCallback(() => {
    setDraft(baseline);
  }, [baseline]);

  const reset = useCallback((next: T) => {
    setDraft(next);
    setBaseline(next);
  }, []);

  /** Promote a (possibly externally-recomputed) value to the new baseline + draft and stamp lastSaved. */
  const commit = useCallback((next?: T) => {
    const v = (next ?? draft) as T;
    setDraft(v);
    setBaseline(v);
    setLastSaved(new Date());
  }, [draft]);

  return { draft, setDraft, baseline, isDirty, lastSaved, markSaved, discard, reset, commit };
}

/** Format a saved-at timestamp for the SaveBar status pill. */
export function formatSavedAt(d: Date | null): string {
  if (!d) return "Not saved yet";
  const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diffSec < 5) return "Saved just now";
  if (diffSec < 60) return `Saved ${Math.floor(diffSec)}s ago`;
  if (diffSec < 3600) return `Saved ${Math.floor(diffSec / 60)}m ago`;
  return `Saved at ${d.toLocaleTimeString()}`;
}
