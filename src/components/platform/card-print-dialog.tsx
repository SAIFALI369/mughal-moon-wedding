import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, FileImage, FileText, Printer, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { invitationThemes } from "@/components/wedding/invitation-options";
import { parseGuestList, MAX_GUEST_ENTRIES } from "@/lib/guest-list";
import {
  buildCardQr,
  invitationShareUrl,
  qrFileName,
  qrPngDataUrl,
  qrSvgMarkup,
} from "@/lib/card-qr";
import {
  buildInsertSheetHtml,
  buildInvitationArtworkHtml,
  openPrintWindow,
  paletteForTheme,
  type PrintDetails,
} from "@/lib/print-sheets";

type PrintCard = {
  title: string;
  slug: string;
  status: "draft" | "published";
  content?: Record<string, unknown> | null;
};

type Tab = "qr" | "guests" | "artwork";

const TABS: { id: Tab; label: string }[] = [
  { id: "qr", label: "QR code" },
  { id: "guests", label: "Guest list" },
  { id: "artwork", label: "Print card" },
];

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function printDetails(details: ReturnType<typeof getInvitationDetails>) {
  return {
    ...details,
    extraEvents: details.additionalEvents,
  } satisfies PrintDetails;
}

export function CardPrintDialog({
  card,
  onOpenChange,
}: {
  card: PrintCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("qr");
  const [guest, setGuest] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [listText, setListText] = useState("");
  const [listError, setListError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!card) {
      setGuest("");
      setListText("");
      setListError("");
      setTab("qr");
    }
  }, [card]);

  const details = useMemo(() => (card ? getInvitationDetails(card.content ?? {}) : null), [card]);
  const palette = useMemo(() => paletteForTheme(details?.theme ?? "eid"), [details]);

  const url = useMemo(() => {
    if (!card || !origin) return "";
    return invitationShareUrl(origin, card.slug, guest);
  }, [card, origin, guest]);

  const qr = useMemo(() => {
    if (!url) return null;
    try {
      return buildCardQr(url);
    } catch {
      return null;
    }
  }, [url]);

  const svg = useMemo(() => {
    if (!qr || !card) return "";
    return qrSvgMarkup(qr, { label: `QR code for ${card.title}` });
  }, [qr, card]);

  const guestList = useMemo(() => parseGuestList(listText), [listText]);

  const isDraft = card?.status !== "published";
  const liveUrl = (import.meta.env["VITE_SITE_URL"] || "").replace(/\/+$/, "");
  const isPreviewOrigin = !!liveUrl && !!origin && liveUrl !== origin;

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Copy this link: " + url);
    }
  }

  function downloadSvg() {
    if (!svg || !card) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    triggerDownload(href, qrFileName(card.slug, "svg"));
    setTimeout(() => URL.revokeObjectURL(href), 4_000);
    toast.success("SVG downloaded");
  }

  function downloadPng() {
    if (!qr || !card) return;
    try {
      triggerDownload(qrPngDataUrl(qr, 1200), qrFileName(card.slug, "png"));
      toast.success("PNG downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export PNG");
    }
  }

  function printSingleInsert() {
    if (!card || !details || !svg) return;
    const html = buildInsertSheetHtml({
      inserts: [{ ...(guest.trim() ? { name: guest.trim() } : {}), qrSvg: svg }],
      details: printDetails(details),
      palette,
      title: card.title,
    });
    if (!openPrintWindow(html)) {
      toast.error("Allow pop-ups to print.");
    }
  }

  function printGuestSheet() {
    if (!card || !details || !origin) return;
    if (!guestList.entries.length) {
      setListError("Add at least one name.");
      return;
    }
    const inserts = guestList.entries.map((entry) => {
      const link = invitationShareUrl(origin, card.slug, entry.name);
      return { name: entry.name, qrSvg: qrSvgMarkup(buildCardQr(link)) };
    });
    const html = buildInsertSheetHtml({
      inserts,
      details: printDetails(details),
      palette,
      title: card.title,
    });
    if (!openPrintWindow(html)) {
      setListError("Allow pop-ups to print.");
      return;
    }
    setListError("");
  }

  function printArtwork() {
    if (!card || !details || !svg || !url) return;
    const html = buildInvitationArtworkHtml({
      title: card.title,
      details: printDetails(details),
      palette,
      qrSvg: svg,
      url,
    });
    if (!openPrintWindow(html)) {
      toast.error("Allow pop-ups to print.");
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setListError("File larger than 1 MB.");
      return;
    }
    try {
      const text = await file.text();
      setListText(text);
      setListError("");
    } catch {
      setListError("Could not read file.");
    }
  }

  const themeLabel =
    invitationThemes.find((theme) => theme.id === details?.theme)?.label ?? "Eid Light";

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-h-[92dvh] w-[94vw] max-w-xl gap-0 overflow-y-auto p-0">
        {card && details && (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg font-semibold">Print &amp; QR</DialogTitle>
              <DialogDescription className="sr-only">
                Print options and QR codes for {card.title}
              </DialogDescription>
              <div
                className="flex gap-1 rounded-lg bg-muted p-1"
                role="tablist"
                aria-label="Print options"
              >
                {TABS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === entry.id}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      tab === entry.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setTab(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="space-y-4 px-6 py-5">
              {isDraft && (
                <p
                  role="status"
                  className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  This card is still a draft — publish before guests scan the QR.
                </p>
              )}
              {isPreviewOrigin && (
                <p
                  role="status"
                  className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  Preview domain (<span className="break-all font-medium">{origin}</span>). Print
                  from {liveUrl} for production.
                </p>
              )}

              {tab === "qr" && (
                <div className="grid items-start gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-xl border border-border bg-white p-3 [&_svg]:h-auto [&_svg]:w-full">
                    <div dangerouslySetInnerHTML={{ __html: svg }} />
                  </div>

                  <div className="min-w-0 space-y-3.5">
                    <div>
                      <h3 className="truncate text-base font-medium">{card.title}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {url || "Preparing link…"}
                      </p>
                    </div>

                    <label className="block text-xs font-medium text-muted-foreground">
                      Guest name on the QR (optional)
                      <input
                        value={guest}
                        onChange={(event) => setGuest(event.target.value.slice(0, 80))}
                        placeholder="e.g. Uncle Ahmed & Family"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/50"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="studio-button" onClick={downloadPng}>
                        <FileImage size={14} /> PNG
                      </button>
                      <button type="button" className="admin-outline-btn" onClick={downloadSvg}>
                        <Download size={14} /> SVG for print
                      </button>
                      <button
                        type="button"
                        className="admin-outline-btn"
                        onClick={printSingleInsert}
                      >
                        <Printer size={14} /> Print insert
                      </button>
                      <button
                        type="button"
                        className="admin-outline-btn"
                        onClick={() => void copyLink()}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "guests" && (
                <div className="space-y-3.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Guest names (one per line or CSV)
                    <textarea
                      value={listText}
                      onChange={(event) => {
                        setListText(event.target.value);
                        setListError("");
                      }}
                      rows={6}
                      placeholder={"Uncle Ahmed & Family\nAyesha Khan\nRizwan, Naaz & kids"}
                      className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-foreground/50"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      className="sr-only"
                      onChange={(event) => void readFile(event.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="admin-outline-btn"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={14} /> Import CSV
                    </button>
                    <span className="text-xs text-muted-foreground" role="status">
                      {guestList.entries.length
                        ? `${guestList.entries.length} guest${guestList.entries.length === 1 ? "" : "s"} ready`
                        : "No names yet"}
                      {guestList.skipped ? ` · ${guestList.skipped} skipped` : ""}
                      {guestList.truncated ? ` · first ${MAX_GUEST_ENTRIES} only` : ""}
                    </span>
                    {listText && (
                      <button
                        type="button"
                        className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                        onClick={() => {
                          setListText("");
                          setListError("");
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {listError && (
                    <p role="alert" className="text-xs text-destructive">
                      {listError}
                    </p>
                  )}

                  <button
                    type="button"
                    className="studio-button"
                    disabled={!guestList.entries.length}
                    onClick={printGuestSheet}
                  >
                    <Printer size={14} /> Print {guestList.entries.length || ""} QR insert
                    {guestList.entries.length === 1 ? "" : "s"}
                  </button>
                </div>
              )}

              {tab === "artwork" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <div>
                      <p className="font-medium">A5 front &amp; back</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {details.groomName} &amp; {details.brideName} · {themeLabel}
                      </p>
                    </div>
                    <QrCode className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="studio-button" onClick={printArtwork}>
                      <FileText size={14} /> Print A5 artwork
                    </button>
                    <button
                      type="button"
                      className="admin-outline-btn"
                      onClick={() => setTab("qr")}
                    >
                      <QrCode size={14} /> QR only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
