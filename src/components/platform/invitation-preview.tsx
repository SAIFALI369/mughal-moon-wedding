import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

export type PreviewDevice = "phone" | "desktop";

const PHONE_BREAKPOINT = 768;

/** The two viewports a partner can check. Sizes are the frame's own CSS pixels. */
export const previewSizes: Record<PreviewDevice, { width: number; height: number }> = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

function readPhoneScreen(): boolean {
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
    const update = () => setIsPhone(readPhoneScreen());
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
 * The invitation, rendered in its own document at a real device width.
 *
 * Every preview goes through `/preview-frame`, an iframe of exactly 390 × 844 or
 * 1280 × 800 CSS pixels — scaled down to fit on desktop, and left at 1:1 on a
 * phone. That matters twice over: the invitation's media queries, sticky header
 * and fixed backdrop evaluate against a real viewport (an inline render inside a
 * scrolling dialog leaks those fixed layers across the form), and the host sees
 * the true phone layout on a phone instead of a squeezed desktop card.
 */
export function DeviceFrame({
  device,
  title,
  content,
  cardId,
  native = false,
}: {
  device: PreviewDevice;
  title: string;
  content: unknown;
  cardId?: string;
  native?: boolean;
}) {
  const rawId = useId();
  const frameId = `invitingyou-preview-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const [mounted, setMounted] = useState(false);
  const latestPayloadRef = useRef({ title, content, cardId });
  latestPayloadRef.current = { title, content, cardId };

  const size = previewSizes[device];
  // Server render, first client paint and jsdom all use the inline invitation;
  // the real device iframe mounts straight after hydration (no mismatch).
  const useInlineFallback = !mounted || isSimulatedDom();

  useEffect(() => setMounted(true), []);

  if (!useInlineFallback) {
    try {
      window.sessionStorage.setItem(frameId, JSON.stringify({ title, content, cardId }));
    } catch {
      // Large portrait payloads still sync via postMessage below.
    }
  }

  // Fit the fixed-size frame into whatever room the editor gives it.
  useEffect(() => {
    if (native || useInlineFallback) return;
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const width = host.clientWidth || 0;
      const height = host.clientHeight || 0;
      if (!width) {
        setScale(0);
        return;
      }
      // Never upscale past the device's real size; if the host's height follows
      // its content, fall back to the visible viewport as the height budget.
      const heightBudget = height > 0 ? height : Math.max(320, window.innerHeight - 200);
      const next = Math.min(1, width / size.width, heightBudget / size.height);
      const rounded = Math.round(next * 1000) / 1000;
      setScale(rounded > 0.1 ? rounded : 0);
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [native, size.width, size.height, useInlineFallback]);

  useEffect(() => {
    if (useInlineFallback) return;

    const sendPayload = () => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      target.postMessage(
        { type: "invitingyou:preview-update", frameId, ...latestPayloadRef.current },
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
    return () => window.removeEventListener("message", onMessage);
  }, [frameId, useInlineFallback]);

  useEffect(() => {
    if (useInlineFallback) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "invitingyou:preview-update", frameId, title, content, cardId },
      window.location.origin,
    );
  }, [frameId, title, content, cardId, useInlineFallback]);

  useEffect(() => {
    if (useInlineFallback) return;
    return () => {
      try {
        window.sessionStorage.removeItem(frameId);
      } catch {
        // Ignore storage cleanup errors.
      }
    };
  }, [frameId, useInlineFallback]);

  const screen = useInlineFallback ? (
    <div className="device-frame-screen">
      <PersonalInvitation
        title={title}
        content={content}
        showGate={false}
        preview
        cardId={cardId}
      />
    </div>
  ) : (
    <iframe
      ref={iframeRef}
      src={`/preview-frame?key=${encodeURIComponent(frameId)}`}
      title={`${device === "phone" ? "Phone" : "Desktop"} preview of ${title || "invitation"}`}
      className="device-frame-iframe"
      scrolling="yes"
    />
  );

  return (
    <div
      className="device-frame-host"
      data-device={device}
      data-native={native ? "true" : undefined}
    >
      <div
        ref={hostRef}
        className="device-frame-stage"
        data-ready={useInlineFallback || native || scale > 0 ? "true" : "false"}
        style={
          {
            "--frame-width": `${size.width}px`,
            "--frame-height": `${size.height}px`,
            "--frame-scale": native || !scale ? 1 : scale,
            "--frame-readable": scale >= 0.62 ? "true" : "false",
          } as CSSProperties
        }
      >
        <div className="device-frame">
          {device === "phone" && !native && (
            <>
              <span className="device-frame-notch" aria-hidden="true" />
              <span className="device-frame-homebar" aria-hidden="true" />
            </>
          )}
          {screen}
        </div>
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
  // A phone can only usefully show one thing at a time: its own layout, at 1:1.
  const effectiveDevice: PreviewDevice = isPhone ? "phone" : device;

  return (
    <div
      className={`admin-preview-shell ${inline ? "is-inline" : "is-modal"}`}
      data-native={isPhone ? "true" : undefined}
      data-preview-device={effectiveDevice}
    >
      {(!isPhone || header) && (
        <div className="admin-preview-toolbar">
          <div className="admin-preview-title">{header}</div>
          {!isPhone && <PreviewDeviceToggle device={effectiveDevice} onChange={setDevice} />}
        </div>
      )}
      <div
        className={`admin-preview-canvas ${isPhone ? "is-native-phone" : ""}`}
        data-preview-device={effectiveDevice}
        data-native={isPhone ? "true" : undefined}
      >
        <DeviceFrame
          device={effectiveDevice}
          title={title}
          content={content}
          cardId={cardId}
          native={isPhone}
        />
      </div>
    </div>
  );
}
