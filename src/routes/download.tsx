import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  HardDriveDownload,
  Laptop,
  RefreshCw,
  Smartphone,
  UploadCloud,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ReleaseCard } from "@/components/platform/release-card";
import { OfflineReadiness } from "@/components/platform/offline-readiness";
import {
  downloadOfflineStudioLauncher,
  useOfflineAppInstaller,
  useOnlineStatus,
} from "@/lib/pwa-install";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Offline App — InvitingYou" },
      {
        name: "description",
        content:
          "Download the latest InvitingYou Offline Studio App for Windows, Mac, Android, or iOS. Create, upload photos, and scroll full phone & desktop previews offline; internet is needed only for publishing.",
      },
    ],
  }),
  component: DownloadAppPage,
});

export function DownloadAppPage() {
  const online = useOnlineStatus();
  const {
    version,
    releasedOn,
    canNativeInstall,
    isInstalled,
    cacheReady,
    cacheStatus,
    updateAvailable,
    applyUpdate,
    installing,
    updatingCache,
    installNativeApp,
    warmOfflineCache,
    refreshOfflineCache,
  } = useOfflineAppInstaller();
  const [downloadedLauncher, setDownloadedLauncher] = useState(false);

  useEffect(() => {
    void warmOfflineCache();
  }, [warmOfflineCache]);

  async function handleDownloadApp() {
    void refreshOfflineCache();
    if (canNativeInstall) {
      const outcome = await installNativeApp();
      if (outcome === "accepted") {
        toast.success(`InvitingYou Offline App v${version} installed`);
        return;
      }
    }
    downloadOfflineStudioLauncher();
    setDownloadedLauncher(true);
    toast.success(`Offline Studio v${version} launcher downloaded`);
  }

  async function handleRefreshUpdate() {
    if (!online) {
      toast.error("Connect to the internet briefly to download the latest app update.");
      return;
    }
    const ok = await refreshOfflineCache();
    // Give the worker a moment to answer with its real inventory.
    setTimeout(() => {
      if (updateAvailable) {
        toast.success(`v${version} downloaded — reload to switch this device over.`);
        return;
      }
      toast.success(
        ok
          ? `Offline App v${version} is stored on this device — it now opens with the internet off.`
          : "Latest version is already active in this browser.",
      );
    }, 600);
  }

  async function handleApplyUpdate() {
    const applied = await applyUpdate();
    if (!applied) toast.info("Close and reopen the app to finish updating.");
  }

  return (
    <PlatformShell>
      <div className="studio-content">
        <section className="download-app-hero">
          <div className="download-app-card">
            <span className="studio-eyebrow">
              <span /> OFFLINE DESKTOP &amp; MOBILE APP · v{version} · {releasedOn.toUpperCase()}
            </span>
            <h1>
              Design offline.
              <br />
              <em>Publish when online.</em>
            </h1>
            <p className="download-app-lead">
              Built for print-shop counters. Create invitations, add couple &amp; gallery photos,
              and scroll full phone &amp; desktop previews with zero internet—connect only when
              you’re ready to publish the live link.
            </p>

            <OfflineReadiness />

            <div className="download-app-actions">
              {isInstalled ? (
                <Link to="/offline-studio" className="studio-button">
                  Open Offline Studio <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDownloadApp()}
                  disabled={installing}
                  className="studio-button"
                >
                  <Download size={16} />
                  {installing
                    ? "Installing…"
                    : canNativeInstall
                      ? `Install Offline App (v${version})`
                      : `Download Offline App (v${version})`}
                </button>
              )}
              <Link to="/offline-studio" className="studio-outline-button">
                Launch Offline Studio <ArrowRight size={15} />
              </Link>
              {online && (
                <button
                  type="button"
                  onClick={() => void handleRefreshUpdate()}
                  disabled={updatingCache}
                  className="studio-outline-button"
                >
                  <RefreshCw size={14} className={updatingCache ? "animate-spin" : ""} />
                  {updatingCache ? "Updating…" : "Update offline cache"}
                </button>
              )}
            </div>

            <div className="download-app-status" role="status">
              <Check size={14} />
              <span>
                {isInstalled
                  ? `Installed on this device (v${version}) · Opens with the internet off`
                  : cacheReady || cacheStatus.count > 0
                    ? `All 22 themes, previews & studio tools (v${version}) stored on this device${
                        cacheStatus.count > 0 ? ` · ${cacheStatus.count} files` : ""
                      }`
                    : downloadedLauncher
                      ? `Latest v${version} launcher saved · App files downloading in the background`
                      : `Latest v${version} · Works on Windows, macOS, Android & iOS`}
              </span>
            </div>

            {updateAvailable && (
              <p className="download-app-hint" role="status">
                <strong>v{version} is ready.</strong> Reload to switch this device to the new
                version — your drafts and photos stay exactly where they are.
                <button
                  type="button"
                  className="studio-text-button"
                  onClick={() => void handleApplyUpdate()}
                >
                  <RefreshCw size={13} /> Reload to update
                </button>
              </p>
            )}

            <p className="download-app-hint">
              <strong>First time offline?</strong> Install or press{" "}
              <strong>Update offline cache</strong> once with the internet on. That single visit is
              what lets the app open later with no network at all — including a cold start from your
              home screen.
            </p>

            <ReleaseCard audience="partner" />

            {!isInstalled && !canNativeInstall && (
              <p className="download-app-hint">
                <strong>Tip:</strong> In Chrome or Edge, click the install icon in the address bar
                to pin InvitingYou to your Desktop or Taskbar. On iPhone/iPad Safari, tap{" "}
                <strong>Share → Add to Home Screen</strong>.
              </p>
            )}
          </div>

          <div className="download-app-features">
            <article className="download-feature">
              <WifiOff size={18} />
              <div>
                <h2>100% offline editing, photos &amp; scrollable previews</h2>
                <p>
                  Choose from all 22 themes, upload couple &amp; gallery photos, and smoothly scroll
                  full phone &amp; desktop previews without Wi-Fi.
                </p>
              </div>
            </article>
            <article className="download-feature">
              <HardDriveDownload size={18} />
              <div>
                <h2>Saved locally on your counter device</h2>
                <p>
                  Drafts and printable A5 / QR proof sheets stay safe on your PC or phone even if
                  shop internet or power drops mid-consultation.
                </p>
              </div>
            </article>
            <article className="download-feature">
              <UploadCloud size={18} />
              <div>
                <h2>Internet needed only to publish</h2>
                <p>
                  Reconnect briefly when your customer approves the card to publish their live link,
                  sync gallery photos, and share on WhatsApp.
                </p>
              </div>
            </article>
            <div className="download-platforms">
              <span>
                <Laptop size={14} /> Windows &amp; macOS
              </span>
              <span>
                <Smartphone size={14} /> Android &amp; iOS
              </span>
            </div>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
