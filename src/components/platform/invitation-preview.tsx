import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

export type PreviewDevice = "phone" | "desktop";

const PHONE_BREAKPOINT = 768;

function isPhoneScreen(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.innerWidth === "number" && window.innerWidth > 0) {
    return window.innerWidth < PHONE_BREAKPOINT;
  }
  return window.matchMedia?.(`(max-width: ${PHONE_BREAKPOINT - 1}px)`)?.matches ?? false;
}

function isSimulatedDom(): boolean {
  return typeof navigator !== "undefined" && /jsdom|happy-dom/i.test(navigator.userAgent);
}

export function usePhoneScreen(): boolean {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const update = () => setIsPhone(isPhoneScreen());
    update();
    const mql = window.matchMedia?.(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
    mql?.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      mql?.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isPhone;
}

export function PreviewDeviceToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (next: PreviewDevice) => void;
}) {
  return (
    <div className="preview-device-switch" role="group" aria-label="Preview device">
      <button
        type="button"
        aria-pressed={device === "phone"}
        className={device === "phone" ? "is-active" : ""}
        onClick={() => onChange("phone")}
      >
        <Smartphone size={14} aria-hidden="true" />
        <span>Phone</span>
      </button>
      <button
        type="button"
        aria-pressed={device === "desktop"}
        className={device === "desktop" ? "is-active" : ""}
        onClick={() => onChange("desktop")}
      >
        <Monitor size={14} aria-hidden="true" />
        <span>Desktop</span>
      </button>
    </div>
  );
}

/**
 * Renders the invitation inside a real 375px-wide same-origin iframe on desktop so
 * every mobile CSS media query (`sm:`, `md:`, `lg:`, `100vw`, `position: fixed`)
 * evaluates against a true phone viewport without any clipping or cut-out.
 */
export function PhoneViewportFrame({
  title,
  content,
  cardId,
}: {
  title: string;
  content: unknown;
  cardId?: string;
}) {
  const rawId = useId();
  const frameId = `invitingyou-preview-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latestPayloadRef = useRef({ title, content, cardId });
  latestPayloadRef.current = { title, content, cardId };

  const useInlineFallback = typeof window === "undefined" || isSimulatedDom();

  if (!useInlineFallback) {
    try {
      window.sessionStorage.setItem(frameId, JSON.stringify({ title, content, cardId }));
    } catch {
      // Large portrait payloads still sync via structured-clone postMessage below.
    }
  }

  useEffect(() => {
    if (useInlineFallback) return;

    const sendPayload = () => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      target.postMessage(
        {
          type: "invitingyou:preview-update",
          frameId,
          ...latestPayloadRef.current,
        },
        window.location.origin,
      );
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; frameId?: string } | undefined;
      if (
        data?.type === "invitingyou:preview-ready" &&
        (!data.frameId || data.frameId === frameId)
      ) {
        sendPayload();
      }
    };

    window.addEventListener("message", onMessage);
    sendPayload();

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [frameId, useInlineFallback]);

  useEffect(() => {
    if (useInlineFallback) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      {
        type: "invitingyou:preview-update",
        frameId,
        title,
        content,
        cardId,
      },
      window.location.origin,
    );
  }, [frameId, title, content, cardId, useInlineFallback]);

  useEffect(() => {
    if (useInlineFallback) return;
    return () => {
      try {
        window.sessionStorage.removeItem(frameId);
      } catch {
        // Ignore storage cleanup errors
      }
    };
  }, [frameId, useInlineFallback]);

  return (
    <div className="preview-phone-bezel">
      <div className="preview-phone-notch" aria-hidden="true">
        <span />
      </div>
      {useInlineFallback ? (
        <div className="preview-phone-viewport">
          <PersonalInvitation
            title={title}
            content={content}
            showGate={false}
            preview
            cardId={cardId}
          />
        </div>
      ) : (
        <div className="preview-phone-viewport is-iframe">
          <iframe
            ref={iframeRef}
            src={`/preview-frame?key=${encodeURIComponent(frameId)}`}
            title={`Mobile preview of ${title || "invitation"}`}
            className="preview-phone-iframe"
          />
        </div>
      )}
      <div className="preview-phone-homebar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

export function InvitationPreview({
  title,
  content,
  cardId,
  defaultDevice = "phone",
  header,
  inline = false,
}: {
  title: string;
  content: unknown;
  cardId?: string;
  defaultDevice?: PreviewDevice;
  header?: ReactNode;
  inline?: boolean;
}) {
  const isPhone = usePhoneScreen();
  const [device, setDevice] = useState<PreviewDevice>(defaultDevice);
  const effectiveDevice: PreviewDevice = isPhone ? "phone" : device;

  return (
    <div className={`admin-preview-shell ${inline ? "is-inline" : "is-modal"}`}>
      {(!isPhone || header) && (
        <div className="admin-preview-toolbar">
          <div className="admin-preview-title">{header}</div>
          {!isPhone && <PreviewDeviceToggle device={effectiveDevice} onChange={setDevice} />}
        </div>
      )}
      <div
        className={`admin-preview-canvas ${
          isPhone
            ? "is-native-phone"
            : effectiveDevice === "phone"
              ? "is-phone-frame"
              : "is-desktop-frame"
        }`}
        data-preview-device={effectiveDevice}
      >
        {!isPhone && effectiveDevice === "phone" ? (
          <PhoneViewportFrame title={title} content={content} cardId={cardId} />
        ) : (
          <div
            className={isPhone ? "preview-phone-viewport is-native" : "preview-desktop-viewport"}
          >
            <PersonalInvitation
              title={title}
              content={content}
              showGate={false}
              preview
              cardId={cardId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
