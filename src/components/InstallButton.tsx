import { Check, Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallButton() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  if (installed) {
    return (
      <span className="hidden items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success md:inline-flex">
        <Check className="h-3.5 w-3.5" /> Offline installed
      </span>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      onClick={() => void promptInstall()}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/15"
      title="Install CC Pro as an offline desktop app"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Install offline</span>
    </button>
  );
}
