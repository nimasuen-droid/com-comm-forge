import { useEffect, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { Check, AlertCircle, Save, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSavedAt } from "@/lib/useDirtyForm";

interface SaveBarProps {
  isDirty: boolean;
  lastSaved: Date | null;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  /** Module label shown in the unsaved-changes dialog. */
  moduleLabel?: string;
  /** Disable the bar entirely (e.g. read-only modules). */
  disabled?: boolean;
}

/**
 * Sticky module-level Save/Discard bar with:
 *  - status pill: "Unsaved changes" vs "All changes saved" + last-saved time
 *  - Save button (enabled only when dirty)
 *  - Discard button (enabled only when dirty)
 *  - TanStack Router navigation blocker with Save / Discard / Cancel dialog
 *  - window beforeunload guard for tab close / refresh
 */
export function SaveBar({
  isDirty,
  lastSaved,
  onSave,
  onDiscard,
  moduleLabel = "this module",
  disabled,
}: SaveBarProps) {
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);

  // Refresh "Saved Xs ago" once a second while not dirty.
  useEffect(() => {
    if (isDirty || !lastSaved) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isDirty, lastSaved]);

  // Tab close / refresh guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // In-app navigation blocker
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: false, // we handle our own
    withResolver: true,
  });

  const doSave = async () => {
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  if (disabled) return null;

  return (
    <>
      <div
        className={cn(
          "sticky bottom-3 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur transition-colors sm:gap-3 sm:px-4 sm:py-2.5",
          isDirty
            ? "border-warning/50 bg-warning/95 text-warning-foreground"
            : "border-border bg-card/95",
        )}
        role="region"
        aria-label="Form save status"
      >
        <StatusPill isDirty={isDirty} lastSaved={lastSaved} tick={tick} />
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onDiscard}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Discard</span>
          </button>
          <button
            onClick={doSave}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed sm:px-4"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {blocker.status === "blocked" && (
        <UnsavedDialog
          moduleLabel={moduleLabel}
          onSave={async () => {
            await doSave();
            blocker.proceed();
          }}
          onDiscard={() => {
            onDiscard();
            blocker.proceed();
          }}
          onCancel={() => blocker.reset()}
        />
      )}
    </>
  );
}

function StatusPill({
  isDirty,
  lastSaved,
  tick,
}: {
  isDirty: boolean;
  lastSaved: Date | null;
  tick: number;
}) {
  void tick;
  if (isDirty) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
        <AlertCircle className="h-3.5 w-3.5" />
        Unsaved changes
      </span>
    );
  }
  const savedTxt = formatSavedAt(lastSaved);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
      <Check className="h-3.5 w-3.5" />
      All changes saved
      {savedTxt && (
        <span className="hidden sm:inline text-muted-foreground font-normal">/ {savedTxt}</span>
      )}
    </span>
  );
}

function UnsavedDialog({
  moduleLabel,
  onSave,
  onDiscard,
  onCancel,
}: {
  moduleLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
    >
      <div className="panel w-full max-w-md p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-warning/15 p-2 text-warning">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 id="unsaved-title" className="text-lg font-bold">
              Unsaved changes
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You have unsaved changes in{" "}
              <span className="font-semibold text-foreground">{moduleLabel}</span>. What would you
              like to do before leaving?
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            Discard changes
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Save & continue
          </button>
        </div>
      </div>
    </div>
  );
}
