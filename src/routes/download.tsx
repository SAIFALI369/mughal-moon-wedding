import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  HardDriveDownload,
  Laptop,
  Smartphone,
  UploadCloud,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformShell } from "@/components/platform/platform-shell";
import { downloadOfflineStudioLauncher, useOfflineAppInstaller } from "@/lib/pwa-install";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Offline App — InvitingYou" },
      {
        name: "description",
        content:
          "Download the InvitingYou Offline Studio App for Windows, Mac, Android, or iOS. Create and preview wedding invitations offline; internet is needed only for publishing.",
      },
    ],
  }),
  component: DownloadAppPage,
});

export function DownloadAppPage() {
  const {
    canNativeInstall,
    isInstalled,
    cacheReady,
    installing,
    installNativeApp,
    warmOfflineCache,
  } = useOfflineAppInstaller();
  const [downloadedLauncher, setDownloadedLauncher] = useState(false);

  useEffect(() => {
    void warmOfflineCache();
  }, [warmOfflineCache]);

  async function handleDownloadApp() {
    void warmOfflineCache();
    if (canNativeInstall) {
      const outcome = await installNativeApp();
      if (outcome === "accepted") {
        toast.success("InvitingYou Offline App installed");
        return;
      }
    }
    downloadOfflineStudioLauncher();
    setDownloadedLauncher(true);
    toast.success("Offline Studio launcher downloaded");
  }

  return (
    <PlatformShell>
      <div className="studio-content">
        <section className="download-app-hero">
          <div className="download-app-card">
            <span className="studio-eyebrow">
              <span /> OFFLINE DESKTOP &amp; MOBILE APP
            </span>
            <h1>
              Design offline.
              <br />
              <em>Publish when online.</em>
            </h1>
            <p className="download-app-lead">
              Built for print-shop counters. Create, customise, and preview every wedding theme with
              zero internet—connect only when you’re ready to publish the live link.
            </p>

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
                      ? "Install Offline App"
                      : "Download Offline App"}
                </button>
              )}
              <Link to="/offline-studio" className="studio-outline-button">
                Launch Offline Studio <ArrowRight size={15} />
              </Link>
            </div>

            <div className="download-app-status" role="status">
              <Check size={14} />
              <span>
                {isInstalled
                  ? "Installed on this device · Ready for offline use"
                  : cacheReady
                    ? "All 23 themes & studio tools cached on this device for offline use"
                    : downloadedLauncher
                      ? "Launcher saved · Offline studio assets caching in background"
                      : "Works on Windows, macOS, Android & iOS · No App Store required"}
              </span>
            </div>

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
                <h2>100% offline editing &amp; preview</h2>
                <p>
                  Choose from all 23 themes, add couple photos, edit events, and test phone &amp;
                  desktop previews without Wi-Fi.
                </p>
              </div>
            </article>
            <article className="download-feature">
              <HardDriveDownload size={18} />
              <div>
                <h2>Saved locally on your counter device</h2>
                <p>
                  Drafts stay safe on your PC or phone even if shop internet or power drops
                  mid-consultation.
                </p>
              </div>
            </article>
            <article className="download-feature">
              <UploadCloud size={18} />
              <div>
                <h2>Internet needed only to publish</h2>
                <p>
                  Reconnect briefly when your customer approves the card to publish their live link
                  and printable QR sheet.
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
