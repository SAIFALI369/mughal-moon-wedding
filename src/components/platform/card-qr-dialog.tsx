import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileImage, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { buildCardInsertHtml } from "@/lib/card-insert";
import {
  buildCardQr,
  invitationShareUrl,
  qrFileName,
  qrPngDataUrl,
  qrSvgMarkup,
} from "@/lib/card-qr";

type QrCard = {
  title: string;
  slug: string;
  status: "draft" | "published";
  content?: Record<string, unknown> | null;
};

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * The insert is printed from its own window, so the dashboard never appears on
 * paper and the shop can save it as a PDF from the print dialog.
 */
function printInsert(card: QrCard, svg: string) {
  const details = getInvitationDetails(card.content ?? {});
  const popup = window.open("", "_blank", "width=760,height=900");
  if (!popup) {
    toast.error("Allow pop-ups for this site to print the card insert.");
    return;
  }
  popup.document.open();
  popup.document.write(
    buildCardInsertHtml({
      title: card.title,
      names: `${details.groomName} & ${details.brideName}`,
      when: [details.date, details.time].filter(Boolean).join(" · "),
      where: [details.venue, details.address].filter(Boolean).join(", "),
      footer: details.hosts || details.hostName,
      qrSvg: svg,
    }),
  );
  popup.document.close();
}

export function CardQrDialog({
  card,
  onOpenChange,
}: {
  card: QrCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [guest, setGuest] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!card) setGuest("");
  }, [card]);

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
    setTimeout(() => URL.revokeObjectURL(href), 4000);
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

  const isDraft = card?.status !== "published";
  // Printing a code that points at a preview deployment would be silently broken
  // in the real world, so say so while the dialog is open.
  const liveUrl = (import.meta.env["VITE_SITE_URL"] || "").replace(/\/+$/, "");
  const isPreviewOrigin = !!liveUrl && !!origin && liveUrl !== origin;

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-h-[92dvh] w-[94vw] max-w-2xl gap-0 overflow-y-auto p-0">
        {card && (
          <>
            <header className="border-b border-border/60 px-6 py-5 pr-12">
              <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
                <QrCode
                  className="h-5 w-5 text-[var(--studio-accent,#a05d48)]"
                  aria-hidden="true"
                />
                QR code for this card
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Print this on the physical invitation so guests can scan straight to the digital
                card, map and RSVP.
              </DialogDescription>
            </header>

            <div className="grid gap-6 px-6 py-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[220px]">
                <div
                  className="overflow-hidden rounded-xl border border-border bg-white p-3 shadow-sm [&_svg]:h-auto [&_svg]:w-full"
                  // The QR is generated locally from the invitation URL (no remote content).
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

                {isDraft && (
                  <p
                    role="status"
                    className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    This card is still a draft. The QR works now, but it opens “invitation not
                    available” until you publish.
                  </p>
                )}

                {isPreviewOrigin && (
                  <p
                    role="status"
                    className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    You are on a preview address, so this code points to{" "}
                    <span className="break-all font-medium">{origin}</span>. Print it from your live
                    site ({liveUrl}) instead.
                  </p>
                )}

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
                    onClick={() => card && svg && printInsert(card, svg)}
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
                    • Print the QR at least 2 cm wide, black on white, with clear space around it.
                  </li>
                  <li>
                    • Put it on the back of the card or the envelope flap — flat, never glossy.
                  </li>
                  <li>• Test one printed copy with a phone before the full print run.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
