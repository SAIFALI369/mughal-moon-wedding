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

function printDetails(card: PrintCard, details: ReturnType<typeof getInvitationDetails>) {
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
      toast.success("Invitation link copied");
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
    toast.success("SVG downloaded — best for a print shop");
  }

  function downloadPng() {
    if (!qr || !card) return;
    try {
      triggerDownload(qrPngDataUrl(qr, 1200), qrFileName(card.slug, "png"));
      toast.success("PNG downloaded at 1200 px");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the PNG");
    }
  }

  function printSingleInsert() {
    if (!card || !details || !svg) return;
    const html = buildInsertSheetHtml({
      inserts: [{ ...(guest.trim() ? { name: guest.trim() } : {}), qrSvg: svg }],
      details: printDetails(card, details),
      palette,
      title: card.title,
    });
    if (!openPrintWindow(html)) {
      toast.error("Allow pop-ups for this site to print the insert.");
    }
  }

  function printGuestSheet() {
    if (!card || !details || !origin) return;
    if (!guestList.entries.length) {
      setListError("Add at least one name before printing.");
      return;
    }
    const inserts = guestList.entries.map((entry) => {
      const link = invitationShareUrl(origin, card.slug, entry.name);
      return { name: entry.name, qrSvg: qrSvgMarkup(buildCardQr(link)) };
    });
    const html = buildInsertSheetHtml({
      inserts,
      details: printDetails(card, details),
      palette,
      title: card.title,
    });
    if (!openPrintWindow(html)) {
      setListError("Allow pop-ups for this site to print the sheet.");
      return;
    }
    setListError("");
  }

  function printArtwork() {
    if (!card || !details || !svg || !url) return;
    const html = buildInvitationArtworkHtml({
      title: card.title,
      details: printDetails(card, details),
      palette,
      qrSvg: svg,
      url,
    });
    if (!openPrintWindow(html)) {
      toast.error("Allow pop-ups for this site to print the card.");
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setListError("That file is larger than 1 MB. Paste the names instead.");
      return;
    }
    try {
      const text = await file.text();
      setListText(text);
      setListError("");
    } catch {
      setListError("That file could not be read. Paste the names instead.");
    }
  }

  const themeLabel =
    invitationThemes.find((theme) => theme.id === details?.theme)?.label ?? "Eid Light";

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-h-[92dvh] w-[94vw] max-w-2xl gap-0 overflow-y-auto p-0">
        {card && details && (
          <>
            <header className="border-b border-border/60 px-6 py-5 pr-12">
              <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
                <Printer
                  className="h-5 w-5 text-[var(--studio-accent,#a05d48)]"
                  aria-hidden="true"
                />
                Print &amp; QR
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Put a scannable code on the physical invitation, or print the whole card.
              </DialogDescription>
              <div
                className="mt-4 flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Print options"
              >
                {TABS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === entry.id}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      tab === entry.id
                        ? "bg-[var(--studio-ink,#263c3a)] text-white"
                        : "border border-border text-muted-foreground hover:border-[var(--studio-accent,#a05d48)]"
                    }`}
                    onClick={() => setTab(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="px-6 py-6">
              {isDraft && (
                <p
                  role="status"
                  className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  This card is still a draft. The QR works now, but it opens “invitation not
                  available” until you publish.
                </p>
              )}
              {isPreviewOrigin && (
                <p
                  role="status"
                  className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                  You are on a preview address, so codes point to{" "}
                  <span className="break-all font-medium">{origin}</span>. Print from your live site
                  ({liveUrl}) instead.
                </p>
              )}

              {tab === "qr" && (
                <div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                  <div className="mx-auto w-full max-w-[220px]">
                    <div
                      className="overflow-hidden rounded-xl border border-border bg-white p-3 shadow-sm [&_svg]:h-auto [&_svg]:w-full"
                      // Generated locally from the invitation URL; no remote content.
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                    <p className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {guest.trim() ? "Personalised code" : "Scan to open"}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-4">
                    <div>
                      <h3 className="truncate font-serif text-lg">{card.title}</h3>
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
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--studio-accent,#a05d48)]"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="studio-button" onClick={downloadPng}>
                        <FileImage size={15} /> PNG (1200 px)
                      </button>
                      <button type="button" className="studio-text-button" onClick={downloadSvg}>
                        <Download size={15} /> SVG for print
                      </button>
                      <button
                        type="button"
                        className="studio-text-button"
                        onClick={printSingleInsert}
                      >
                        <Printer size={15} /> Print insert
                      </button>
                      <button
                        type="button"
                        className="studio-text-button"
                        onClick={() => void copyLink()}
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? "Copied" : "Copy link"}
                      </button>
                    </div>

                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li>
                        • Print the QR at least 2 cm wide, black on white, with clear space around
                        it.
                      </li>
                      <li>
                        • Put it on the back of the card or the envelope flap — flat, never glossy.
                      </li>
                      <li>• Test one printed copy with a phone before the full print run.</li>
                    </ul>
                  </div>
                </div>
              )}

              {tab === "guests" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Paste a guest list to print one personalised insert per guest — each QR opens
                    the invitation greeting them by name.
                  </p>

                  <label className="block text-xs font-medium text-muted-foreground">
                    Guest names — one per line, or paste a CSV
                    <textarea
                      value={listText}
                      onChange={(event) => {
                        setListText(event.target.value);
                        setListError("");
                      }}
                      rows={7}
                      placeholder={"Uncle Ahmed & Family\nAyesha Khan\nRizwan, Naaz & kids"}
                      className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-[var(--studio-accent,#a05d48)]"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      className="sr-only"
                      onChange={(event) => void readFile(event.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="studio-text-button"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload size={15} /> Import CSV
                    </button>
                    <span className="text-xs text-muted-foreground" role="status">
                      {guestList.entries.length
                        ? `${guestList.entries.length} guest${guestList.entries.length === 1 ? "" : "s"} ready`
                        : "No names yet"}
                      {guestList.skipped ? ` · ${guestList.skipped} skipped` : ""}
                      {guestList.truncated ? ` · first ${MAX_GUEST_ENTRIES} only` : ""}
                      {guestList.entries.length
                        ? ` · ${Math.ceil(guestList.entries.length / 8)} A4 sheet${Math.ceil(guestList.entries.length / 8) === 1 ? "" : "s"}`
                        : ""}
                    </span>
                    {listText && (
                      <button
                        type="button"
                        className="studio-text-button"
                        onClick={() => {
                          setListText("");
                          setListError("");
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A CSV with a <span className="font-medium">Name</span> column works too — extra
                    columns are ignored, and duplicates are dropped. Eight inserts print per A4
                    sheet with cut guides.
                  </p>

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
                    <Printer size={15} /> Print {guestList.entries.length || ""} QR insert
                    {guestList.entries.length === 1 ? "" : "s"}
                  </button>
                </div>
              )}

              {tab === "artwork" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                    <p className="font-serif text-lg">A5 front &amp; back</p>
                    <p className="mt-1 text-muted-foreground">
                      {details.groomName} &amp; {details.brideName} · {themeLabel}
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <li>• Front: names, ceremony, date, venue and the QR.</li>
                      <li>
                        • Back: order of celebration, dress code, RSVP date, contact and notes.
                      </li>
                      <li>• Choose “Save as PDF” in the print dialog to send it to a shop.</li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="studio-button" onClick={printArtwork}>
                      <FileText size={15} /> Print A5 artwork
                    </button>
                    <button
                      type="button"
                      className="studio-text-button"
                      onClick={() => setTab("qr")}
                    >
                      <QrCode size={15} /> Just the QR
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
