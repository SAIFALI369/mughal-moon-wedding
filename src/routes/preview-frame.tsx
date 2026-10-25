import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

export type PreviewFramePayload = {
  title: string;
  content: unknown;
  cardId?: string;
};

function readInitialPayload(): { frameId: string; payload: PreviewFramePayload | null } {
  if (typeof window === "undefined") {
    return { frameId: "", payload: null };
  }
  const frameId = new URLSearchParams(window.location.search).get("key") ?? "";
  if (!frameId) return { frameId: "", payload: null };
  try {
    const raw = window.sessionStorage.getItem(frameId);
    if (!raw) return { frameId, payload: null };
    const parsed = JSON.parse(raw) as PreviewFramePayload;
    if (parsed && typeof parsed === "object" && typeof parsed.title === "string") {
      return { frameId, payload: parsed };
    }
  } catch {
    // Ignore storage read errors; parent postMessage supplies the payload.
  }
  return { frameId, payload: null };
}

export const Route = createFileRoute("/preview-frame")({
  head: () => ({
    meta: [
      { title: "Mobile invitation preview — InvitingYou" },
      { name: "description", content: "Preview your invitation in a phone-sized view." },
      { property: "og:title", content: "Mobile invitation preview — InvitingYou" },
      { property: "og:description", content: "Preview your invitation in a phone-sized view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewFramePage,
});

function PreviewFramePage() {
  const [initial] = useState(readInitialPayload);
  const [payload, setPayload] = useState<PreviewFramePayload | null>(initial.payload);

  useEffect(() => {
    const frameId = new URLSearchParams(window.location.search).get("key") ?? initial.frameId;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as
        | {
            type?: string;
            frameId?: string;
            title?: string;
            content?: unknown;
            cardId?: string;
          }
        | undefined;
      if (!data || data.type !== "invitingyou:preview-update") return;
      if (frameId && data.frameId && data.frameId !== frameId) return;
      setPayload({
        title: typeof data.title === "string" ? data.title : "Invitation",
        content: data.content ?? {},
        cardId: typeof data.cardId === "string" ? data.cardId : undefined,
      });
    };

    window.addEventListener("message", onMessage);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "invitingyou:preview-ready", frameId },
        window.location.origin,
      );
    }

    return () => window.removeEventListener("message", onMessage);
  }, [initial.frameId]);

  if (!payload) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="preview-frame-document">
      <PersonalInvitation
        title={payload.title}
        content={payload.content}
        cardId={payload.cardId}
        showGate={false}
        preview
      />
    </div>
  );
}
