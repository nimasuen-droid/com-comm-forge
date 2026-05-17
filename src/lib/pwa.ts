const isInIframe = (() => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = typeof window !== "undefined" ? window.location.hostname : "";
const protocol = typeof window !== "undefined" ? window.location.protocol : "";
const isPreviewHost =
  host.includes("id-preview--") || host.includes("lovable") || host.endsWith(".lovable.app");
const isFileProtocol = protocol === "file:";

export const PWA_DISABLED = isInIframe || isPreviewHost || isFileProtocol;
const PWA_ENABLED =
  import.meta.env.VITE_ENABLE_PWA === "true" ||
  (import.meta.env.PROD && import.meta.env.VITE_ENABLE_PWA !== "false");

export async function registerPWA(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (PWA_DISABLED || !PWA_ENABLED) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      /* Service worker cleanup is best-effort. */
    }
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    setInterval(
      () => {
        registration.update().catch(() => undefined);
      },
      60 * 60 * 1000,
    );
  } catch {
    /* Registration can fail on unsupported hosts or during local preview. */
  }
}
