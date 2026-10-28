import { useEffect } from "react";
import { Check, Download, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOfflineAppInstaller, useOnlineStatus } from "@/lib/pwa-install";

/**
 * One honest line about what this device can do right now.
 *
 * Offline used to be silent: the shop counter lost Wi-Fi and the studio looked
 * broken. This strip says which mode the app is in, whether the app is actually
 * stored on the device (with a button to store it), and when a newer version is
 * waiting to be applied.
 */
export function OfflineReadiness({ compact = false }: { compact?: boolean }) {
  const online = useOnlineStatus();
  const {
    version,
    cacheReady,
    cacheStatus,
    updateAvailable,
    applyUpdate,
    warmOfflineCache,
    refreshStatus,
  } = useOfflineAppInstaller();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const stored = cacheReady || cacheStatus.count > 0;
  const stale = stored && !cacheStatus.upToDate && Boolean(cacheStatus.workerVersion);

  if (updateAvailable) {
    return (
      <div className="offline-readiness is-update" role="status">
        <RefreshCw size={13} aria-hidden="true" />
        <span>Version {version} is downloaded. Reload to switch this device over.</span>
        <button
          type="button"
          onClick={() => {
            void applyUpdate().then((applied) => {
              if (!applied) toast.info("Reload the page to finish updating.");
            });
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="offline-readiness is-offline" role="status">
        <WifiOff size={13} aria-hidden="true" />
        <span>
          Offline · Drafts saved on device · v{version} — cards, photos, print sheets and previews
          keep working. Only publishing needs the internet.
        </span>
        {!stored && (
          <button type="button" onClick={() => void warmOfflineCache()}>
            <Download size={12} aria-hidden="true" /> Store for offline
          </button>
        )}
      </div>
    );
  }

  if (stale) {
    return (
      <div className="offline-readiness is-update" role="status">
        <RefreshCw size={13} aria-hidden="true" />
        <span>
          This device holds an older offline copy
          {cacheStatus.workerVersion ? ` (v${cacheStatus.workerVersion})` : ""} — it still opens,
          but it is not the newest app.
        </span>
        <button type="button" onClick={() => void warmOfflineCache().then(() => refreshStatus())}>
          <Download size={12} aria-hidden="true" /> Update to v{version}
        </button>
      </div>
    );
  }

  if (!stored) {
    return (
      <div className="offline-readiness is-warn" role="status">
        <Wifi size={13} aria-hidden="true" />
        <span>
          {compact
            ? `Make v${version} work offline`
            : `This device hasn't stored the app yet — one tap and it opens with the internet off.`}
        </span>
        <button type="button" onClick={() => void warmOfflineCache()}>
          <Download size={12} aria-hidden="true" /> Store v{version}
        </button>
      </div>
    );
  }

  return (
    <div className="offline-readiness is-ready" role="status">
      <Check size={13} aria-hidden="true" />
      <span>
        Online · Ready to publish · offline-ready v{version}
        {cacheStatus.count > 0 ? ` · ${cacheStatus.count} files stored on this device` : ""}
      </span>
    </div>
  );
}
